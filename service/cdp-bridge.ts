import crypto from "node:crypto";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import type { SurfaceInputEvent } from "@openchamber/sdk";
import {
  asString,
  type PickedElementPayload,
  type ViewerScale,
} from "../shared/types.ts";
import {
  INITIAL_CLICK_TRACKER,
  modifiersBitmask,
  nextClickTracker,
  resolveMouseButton,
  scaleCoordinate,
  virtualKeyCodeForEvent,
  type ClickTrackerState,
} from "./input-translator.ts";

const MAX_CDP_PAYLOAD = 64 * 1024 * 1024;
const COPY_BINDING = "openchamberDevtoolsCopy";

const ALLOWED_DEVTOOLS_DOMAINS = new Set([
  "Accessibility",
  "Animation",
  "Audits",
  "CSS",
  "CacheStorage",
  "Console",
  "DOM",
  "DOMDebugger",
  "DOMSnapshot",
  "DOMStorage",
  "Database",
  "Debugger",
  "Emulation",
  "Fetch",
  "HeapProfiler",
  "IO",
  "IndexedDB",
  "Input",
  "Inspector",
  "LayerTree",
  "Log",
  "Media",
  "Memory",
  "Network",
  "Overlay",
  "Page",
  "Performance",
  "PerformanceTimeline",
  "Preload",
  "Profiler",
  "Runtime",
  "Security",
  "ServiceWorker",
  "Storage",
  "Target",
  "Tracing",
  "WebAudio",
  "WebAuthn",
]);

const BLOCKED_DEVTOOLS_METHODS = new Set([
  "Page.setDownloadBehavior",
  "DOM.setFileInputFiles",
  "Input.dispatchDragEvent",
  "Emulation.setDeviceMetricsOverride",
  "Emulation.clearDeviceMetricsOverride",
  "Browser.close",
  "Browser.crash",
]);

const DEVTOOLS_FRONTEND_SCRIPT = `(() => {
  const boot = () => {
    if (globalThis.__ocAbDevtoolsReady) return;
    globalThis.__ocAbDevtoolsReady = true;
    void Promise.all([import('./ui/legacy/legacy.js'), import('./core/host/host.js')])
      .then(([legacy, hostMod]) => {
        if (legacy?.ContextMenu?.ContextMenu) {
          legacy.ContextMenu.ContextMenu.useSoftMenu = true;
        }
        const inst = hostMod?.InspectorFrontendHost?.InspectorFrontendHostInstance;
        if (inst && typeof inst.copyText === 'function') {
          const orig = inst.copyText.bind(inst);
          inst.copyText = (text) => {
            if (text !== null && text !== undefined && typeof globalThis.${COPY_BINDING} === 'function') {
              globalThis.${COPY_BINDING}(String(text));
            }
            orig(text);
          };
        }
      })
      .catch(() => {});
  };
  if (document.readyState === 'complete') boot();
  else addEventListener('load', boot, { once: true });
})()`;

function rawDataToUtf8(raw: RawData): string {
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  if (Array.isArray(raw)) return Buffer.concat(raw).toString("utf8");
  return Buffer.from(raw).toString("utf8");
}

interface CdpEventPayload {
  readonly method: string;
  readonly params: Record<string, unknown>;
  readonly sessionId?: string;
}

export class CdpClient {
  private readonly ws: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly listeners = new Set<(event: CdpEventPayload) => void>();
  private closed = false;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (raw, isBinary) => {
      if (isBinary) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawDataToUtf8(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (typeof msg.id === "number") {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error && typeof msg.error === "object") {
          const errObj = msg.error as { message?: string };
          entry.reject(new Error(errObj.message || "CDP command error"));
        } else {
          entry.resolve(
            (msg.result as Record<string, unknown> | undefined) ?? {},
          );
        }
        return;
      }
      if (typeof msg.method === "string") {
        const event: CdpEventPayload = {
          method: msg.method,
          params: (msg.params as Record<string, unknown> | undefined) ?? {},
          ...(typeof msg.sessionId === "string"
            ? { sessionId: msg.sessionId }
            : {}),
        };
        for (const listener of this.listeners) {
          listener(event);
        }
      }
    });

    const onClose = () => {
      this.closed = true;
      for (const [, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("CDP WebSocket closed"));
      }
      this.pending.clear();
    };
    ws.on("close", onClose);
    ws.on("error", onClose);
  }

  static connect(wsUrl: string, timeoutMs = 6000): Promise<CdpClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, {
        maxPayload: MAX_CDP_PAYLOAD,
        perMessageDeflate: false,
      });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error(`CDP connect timed out (${wsUrl})`));
      }, timeoutMs);
      ws.once("open", () => {
        clearTimeout(timer);
        resolve(new CdpClient(ws));
      });
      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  get isOpen(): boolean {
    return !this.closed && this.ws.readyState === WebSocket.OPEN;
  }

  onEvent(listener: (event: CdpEventPayload) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
    timeoutMs = 10000,
  ): Promise<Record<string, unknown>> {
    if (!this.isOpen) {
      return Promise.reject(
        new Error(`CDP connection closed while calling ${method}`),
      );
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const payload = JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      });
      this.ws.send(payload);
    });
  }

  close(): void {
    this.closed = true;
    try {
      this.ws.close();
    } catch {
      this.ws.terminate();
    }
  }
}

export interface TargetSummary {
  readonly targetId: string;
  readonly type: string;
  readonly title: string;
  readonly url: string;
  readonly browserContextId?: string;
}

export async function findActivePageTarget(
  cdp: CdpClient,
  preferredUrl?: string,
): Promise<TargetSummary | null> {
  const res = await cdp.send("Target.getTargets");
  const rawList = Array.isArray(res.targetInfos) ? res.targetInfos : [];
  const pages: TargetSummary[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const info = item as Record<string, unknown>;
    const type = asString(info.type);
    const url = asString(info.url);
    if (type !== "page" && type !== "webview") continue;
    if (
      url.startsWith("devtools://") ||
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://")
    ) {
      continue;
    }
    pages.push({
      targetId: asString(info.targetId),
      type,
      title: asString(info.title),
      url,
      ...(typeof info.browserContextId === "string"
        ? { browserContextId: info.browserContextId }
        : {}),
    });
  }
  if (pages.length === 0) return null;
  if (preferredUrl) {
    const exact = pages.find((p) => p.url === preferredUrl);
    if (exact) return exact;
  }
  return pages[0] ?? null;
}

export async function applyScreenScale(
  cdp: CdpClient,
  targetSessionId: string,
  scale: ViewerScale,
): Promise<void> {
  try {
    const infoRes = await cdp.send(
      "Emulation.getScreenInfos",
      {},
      targetSessionId,
      3000,
    );
    const infos = Array.isArray(infoRes.screenInfos) ? infoRes.screenInfos : [];
    const primary = infos[0] as Record<string, unknown> | undefined;
    if (primary && typeof primary.id === "string") {
      await cdp.send(
        "Emulation.updateScreen",
        {
          id: primary.id,
          devicePixelRatio: scale,
        },
        targetSessionId,
        3000,
      );
    }
  } catch {
    // Older Chromium builds without Emulation.updateScreen keep 1x screen DPR cleanly.
  }
}

export async function applyBaseSelectCompatibility(
  cdp: CdpClient,
  targetSessionId: string,
  enabled: boolean,
): Promise<void> {
  const script = `(() => {
    const id = '__oc_ab_base_select_style__';
    const existing = document.getElementById(id);
    if (!${enabled ? "true" : "false"}) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = 'select:not([multiple]) { appearance: base-select !important; }';
    (document.head || document.documentElement).appendChild(style);
  })()`;
  await cdp
    .send("Runtime.evaluate", { expression: script }, targetSessionId, 4000)
    .catch(() => {});
}

function filterDevToolsCommand(rawText: string): {
  readonly allow: boolean;
  readonly rewritten?: string;
  readonly syntheticErrorResponse?: string;
} {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { allow: false };
  }
  const id = typeof parsed.id === "number" ? parsed.id : null;
  const method = typeof parsed.method === "string" ? parsed.method : "";
  if (!method || id === null) return { allow: false };

  if (method === "Browser.getVersion") {
    return { allow: true, rewritten: rawText };
  }
  const domain = method.split(".")[0] ?? "";
  if (
    !ALLOWED_DEVTOOLS_DOMAINS.has(domain) ||
    BLOCKED_DEVTOOLS_METHODS.has(method)
  ) {
    return {
      allow: false,
      syntheticErrorResponse: JSON.stringify({
        id,
        error: {
          code: -32601,
          message: `Method ${method} blocked by OpenChamber DevTools policy`,
        },
      }),
    };
  }
  if (method === "Page.navigate") {
    const params = (parsed.params as Record<string, unknown> | undefined) ?? {};
    const url = asString(params.url);
    if (
      url !== "about:blank" &&
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {
      return {
        allow: false,
        syntheticErrorResponse: JSON.stringify({
          id,
          error: {
            code: -32602,
            message: "Only http(s) and about:blank navigations are permitted",
          },
        }),
      };
    }
  }
  return { allow: true, rewritten: rawText };
}

export interface DevToolsFrameUpdate {
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
  readonly title: string;
}

export class DevToolsSurfaceController {
  private cdp: CdpClient | null = null;
  private relayServer: WebSocketServer | null = null;
  private activeLink: { close: () => void } | null = null;
  private browserContextId: string | null = null;
  private frontendTargetId: string | null = null;
  private frontendSessionId: string | null = null;
  private token = "";
  private cssWidth = 1280;
  private cssHeight = 800;
  private scale: ViewerScale = 1;
  private lastFrameWidth = 1280;
  private lastFrameHeight = 800;
  private clickTracker: ClickTrackerState = INITIAL_CLICK_TRACKER;
  private lastCopiedText = "";
  private unsubEvents: (() => void) | null = null;

  get isOpen(): boolean {
    return Boolean(this.cdp?.isOpen && this.frontendSessionId);
  }

  get clipboardText(): string {
    return this.lastCopiedText;
  }

  async open(options: {
    readonly browserWsUrl: string;
    readonly preferredPageUrl?: string;
    readonly width: number;
    readonly height: number;
    readonly scale: ViewerScale;
    readonly colorScheme: "dark" | "light";
    readonly onFrame: (frame: DevToolsFrameUpdate) => void;
    readonly onCopy?: (text: string) => void;
    readonly onClosed?: () => void;
  }): Promise<void> {
    await this.close();

    const cdp = await CdpClient.connect(options.browserWsUrl);
    this.cdp = cdp;
    this.cssWidth = Math.max(
      480,
      Math.min(3840, Math.round(options.width || 1280)),
    );
    this.cssHeight = Math.max(
      360,
      Math.min(2400, Math.round(options.height || 800)),
    );
    this.scale = options.scale;
    this.token = crypto.randomBytes(32).toString("hex");

    const target = await findActivePageTarget(cdp, options.preferredPageUrl);
    if (!target) {
      cdp.close();
      this.cdp = null;
      throw new Error(
        "No inspectable page target found in this Chrome session",
      );
    }

    const pageWsUrl = (() => {
      const parsed = new URL(options.browserWsUrl);
      parsed.pathname = `/devtools/page/${encodeURIComponent(target.targetId)}`;
      return parsed.href;
    })();

    const relayPort = await new Promise<number>((resolve, reject) => {
      const wss = new WebSocketServer({
        host: "127.0.0.1",
        port: 0,
        maxPayload: MAX_CDP_PAYLOAD,
        perMessageDeflate: false,
        verifyClient: ({
          origin,
          req,
        }: {
          origin: string;
          req: { url?: string };
        }) =>
          origin === "devtools://devtools" &&
          req.url === `/devtools/${this.token}`,
      });
      wss.on("connection", (client) => {
        this.activeLink?.close();
        const upstream = new WebSocket(pageWsUrl, {
          maxPayload: MAX_CDP_PAYLOAD,
          perMessageDeflate: false,
        });
        const queue: string[] = [];
        const link = {
          close: () => {
            client.terminate();
            upstream.terminate();
          },
        };
        this.activeLink = link;

        client.on("message", (data, isBinary) => {
          if (isBinary) {
            link.close();
            return;
          }
          const check = filterDevToolsCommand(rawDataToUtf8(data));
          if (check.allow && check.rewritten) {
            if (upstream.readyState === WebSocket.OPEN) {
              upstream.send(check.rewritten);
            } else if (
              upstream.readyState === WebSocket.CONNECTING &&
              queue.length < 512
            ) {
              queue.push(check.rewritten);
            } else {
              link.close();
            }
          } else if (
            check.syntheticErrorResponse &&
            client.readyState === WebSocket.OPEN
          ) {
            client.send(check.syntheticErrorResponse);
          } else {
            link.close();
          }
        });

        upstream.on("open", () => {
          for (const item of queue.splice(0)) {
            upstream.send(item);
          }
        });
        upstream.on("message", (data, isBinary) => {
          if (!isBinary && client.readyState === WebSocket.OPEN) {
            client.send(rawDataToUtf8(data));
          }
        });
        client.on("close", () => link.close());
        client.on("error", () => link.close());
        upstream.on("close", () => link.close());
        upstream.on("error", () => link.close());
      });
      wss.once("error", reject);
      wss.once("listening", () => {
        this.relayServer = wss;
        const addr = wss.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });

    const ctxRes = await cdp.send("Target.createBrowserContext", {
      proxyBypassList: `<-loopback>;127.0.0.1:${relayPort}`,
    });
    const browserContextId = asString(ctxRes.browserContextId);
    if (!browserContextId) {
      await this.close();
      throw new Error("Failed to create isolated DevTools browser context");
    }
    this.browserContextId = browserContextId;

    const targetRes = await cdp.send("Target.createTarget", {
      url: `devtools://devtools/bundled/inspector.html?ws=127.0.0.1:${relayPort}/devtools/${this.token}`,
      browserContextId,
      newWindow: true,
      background: true,
    });
    const frontendTargetId = asString(targetRes.targetId);
    if (!frontendTargetId) {
      await this.close();
      throw new Error("Failed to launch bundled Chrome DevTools target");
    }
    this.frontendTargetId = frontendTargetId;

    const attachRes = await cdp.send("Target.attachToTarget", {
      targetId: frontendTargetId,
      flatten: true,
    });
    const sessionId = asString(attachRes.sessionId);
    this.frontendSessionId = sessionId;

    this.unsubEvents = cdp.onEvent((ev) => {
      if (
        ev.method === "Target.targetDestroyed" &&
        ev.params.targetId === this.frontendTargetId
      ) {
        void this.close();
        options.onClosed?.();
        return;
      }
      if (ev.sessionId !== this.frontendSessionId) return;

      if (
        ev.method === "Runtime.bindingCalled" &&
        ev.params.name === COPY_BINDING
      ) {
        const copied = asString(ev.params.payload);
        this.lastCopiedText = copied;
        options.onCopy?.(copied);
        return;
      }

      if (ev.method === "Page.screencastFrame") {
        const sessionSeq = ev.params.sessionId;
        if (typeof sessionSeq === "number" && this.frontendSessionId) {
          void cdp
            .send(
              "Page.screencastFrameAck",
              { sessionId: sessionSeq },
              this.frontendSessionId,
            )
            .catch(() => {});
        }
        const b64 = typeof ev.params.data === "string" ? ev.params.data : "";
        if (!b64) return;
        const meta =
          (ev.params.metadata as Record<string, unknown> | undefined) ?? {};
        const bytes = Buffer.from(b64, "base64");
        const metaW = Number(meta.deviceWidth) || this.cssWidth;
        const metaH = Number(meta.deviceHeight) || this.cssHeight;
        const pixelW = Math.round(metaW * this.scale);
        const pixelH = Math.round(metaH * this.scale);
        this.lastFrameWidth = pixelW;
        this.lastFrameHeight = pixelH;
        options.onFrame({
          bytes,
          width: pixelW,
          height: pixelH,
          title: `DevTools — ${target.title || target.url}`,
        });
      }
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Runtime.addBinding", { name: COPY_BINDING }, sessionId);
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: DEVTOOLS_FRONTEND_SCRIPT },
      sessionId,
    );
    await cdp
      .send(
        "Runtime.evaluate",
        { expression: DEVTOOLS_FRONTEND_SCRIPT },
        sessionId,
      )
      .catch(() => {});
    await applyScreenScale(cdp, sessionId, this.scale);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: this.cssWidth,
        height: this.cssHeight,
        deviceScaleFactor: this.scale,
        mobile: false,
      },
      sessionId,
    );
    await cdp
      .send(
        "Emulation.setEmulatedMedia",
        {
          features: [
            { name: "prefers-color-scheme", value: options.colorScheme },
          ],
        },
        sessionId,
      )
      .catch(() => {});
    await cdp.send(
      "Page.startScreencast",
      {
        format: "jpeg",
        quality: 90,
        maxWidth: this.cssWidth * this.scale,
        maxHeight: this.cssHeight * this.scale,
        everyNthFrame: 1,
      },
      sessionId,
    );
  }

  async resize(
    width: number,
    height: number,
    scale: ViewerScale,
  ): Promise<void> {
    if (!this.cdp?.isOpen || !this.frontendSessionId) return;
    this.cssWidth = Math.max(480, Math.min(3840, Math.round(width)));
    this.cssHeight = Math.max(360, Math.min(2400, Math.round(height)));
    this.scale = scale;
    await applyScreenScale(this.cdp, this.frontendSessionId, scale);
    await this.cdp
      .send(
        "Emulation.setDeviceMetricsOverride",
        {
          width: this.cssWidth,
          height: this.cssHeight,
          deviceScaleFactor: scale,
          mobile: false,
        },
        this.frontendSessionId,
      )
      .catch(() => {});
    await this.cdp
      .send("Page.stopScreencast", {}, this.frontendSessionId)
      .catch(() => {});
    await this.cdp
      .send(
        "Page.startScreencast",
        {
          format: "jpeg",
          quality: 90,
          maxWidth: this.cssWidth * scale,
          maxHeight: this.cssHeight * scale,
          everyNthFrame: 1,
        },
        this.frontendSessionId,
      )
      .catch(() => {});
  }

  async dispatchSurfaceInput(
    events: readonly SurfaceInputEvent[],
  ): Promise<void> {
    if (!this.cdp?.isOpen || !this.frontendSessionId) return;
    const sessionId = this.frontendSessionId;
    const now = Date.now();

    for (const event of events) {
      if (event.type === "pointer") {
        const x = scaleCoordinate(event.x, this.lastFrameWidth, this.cssWidth);
        const y = scaleCoordinate(
          event.y,
          this.lastFrameHeight,
          this.cssHeight,
        );
        const button = resolveMouseButton(event);
        const modifiers = modifiersBitmask(event.modifiers);

        if (event.action === "down") {
          this.clickTracker = nextClickTracker(
            this.clickTracker,
            x,
            y,
            event.button,
            now,
          );
          await this.cdp
            .send(
              "Input.dispatchMouseEvent",
              {
                type: "mousePressed",
                x,
                y,
                button,
                buttons: event.buttons,
                clickCount: this.clickTracker.count,
                modifiers,
              },
              sessionId,
            )
            .catch(() => {});
        } else if (event.action === "up") {
          await this.cdp
            .send(
              "Input.dispatchMouseEvent",
              {
                type: "mouseReleased",
                x,
                y,
                button,
                buttons: event.buttons,
                clickCount: Math.max(1, this.clickTracker.count),
                modifiers,
              },
              sessionId,
            )
            .catch(() => {});
        } else {
          await this.cdp
            .send(
              "Input.dispatchMouseEvent",
              {
                type: "mouseMoved",
                x,
                y,
                button,
                buttons: event.buttons,
                modifiers,
              },
              sessionId,
            )
            .catch(() => {});
        }
        continue;
      }

      if (event.type === "wheel") {
        const x = scaleCoordinate(event.x, this.lastFrameWidth, this.cssWidth);
        const y = scaleCoordinate(
          event.y,
          this.lastFrameHeight,
          this.cssHeight,
        );
        await this.cdp
          .send(
            "Input.dispatchMouseEvent",
            {
              type: "mouseWheel",
              x,
              y,
              deltaX: event.deltaX,
              deltaY: event.deltaY,
              modifiers: modifiersBitmask(event.modifiers),
            },
            sessionId,
          )
          .catch(() => {});
        continue;
      }

      if (event.type === "key") {
        const vk = virtualKeyCodeForEvent(event);
        const isPrintable =
          event.action === "down" &&
          event.key.length === 1 &&
          !event.modifiers.ctrl &&
          !event.modifiers.meta &&
          !event.modifiers.alt;
        await this.cdp
          .send(
            "Input.dispatchKeyEvent",
            {
              type: event.action === "down" ? "keyDown" : "keyUp",
              key: event.key,
              code: event.code,
              ...(isPrintable
                ? { text: event.key, unmodifiedText: event.key }
                : {}),
              ...(vk !== undefined
                ? { windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
                : {}),
              modifiers: modifiersBitmask(event.modifiers),
            },
            sessionId,
          )
          .catch(() => {});
        continue;
      }

      if (event.type === "text" && event.text) {
        await this.cdp
          .send("Input.insertText", { text: event.text }, sessionId)
          .catch(() => {});
      }
    }
  }

  async close(): Promise<void> {
    this.unsubEvents?.();
    this.unsubEvents = null;
    this.activeLink?.close();
    this.activeLink = null;

    if (this.relayServer) {
      const server = this.relayServer;
      this.relayServer = null;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    const cdp = this.cdp;
    this.cdp = null;
    const frontendTargetId = this.frontendTargetId;
    const browserContextId = this.browserContextId;
    this.frontendTargetId = null;
    this.frontendSessionId = null;
    this.browserContextId = null;

    if (cdp?.isOpen) {
      if (frontendTargetId) {
        await cdp
          .send(
            "Target.closeTarget",
            { targetId: frontendTargetId },
            undefined,
            2000,
          )
          .catch(() => {});
      }
      if (browserContextId) {
        await cdp
          .send(
            "Target.disposeBrowserContext",
            { browserContextId },
            undefined,
            2000,
          )
          .catch(() => {});
      }
    }
    cdp?.close();
  }
}

export function buildHoverPickScript(
  cssX: number,
  cssY: number,
  refsMap: Readonly<
    Record<string, { readonly role?: string; readonly name?: string }>
  >,
): string {
  return `(() => {
    const x = ${Number.isFinite(cssX) ? cssX : 0};
    const y = ${Number.isFinite(cssY) ? cssY : 0};
    const refs = ${JSON.stringify(refsMap)};
    const hostId = '__oc_ab_pick_overlay__';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div id="box" style="position:fixed;border:2px solid #3b82f6;background:rgba(59,130,246,0.12);border-radius:4px;box-sizing:border-box;display:none;"></div><div id="tag" style="position:fixed;background:#0f172a;color:#f8fafc;font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 7px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.35);white-space:nowrap;display:none;"></div>';
      document.documentElement.appendChild(host);
    }
    host.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    host.style.display = 'block';
    const shadow = host.shadowRoot;
    if (!el || !shadow) return false;
    const rect = el.getBoundingClientRect();
    const box = shadow.getElementById('box');
    const badge = shadow.getElementById('tag');
    if (!box || !badge) return false;
    box.style.display = 'block';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = Math.max(2, rect.width) + 'px';
    box.style.height = Math.max(2, rect.height) + 'px';

    const tagName = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || (tagName === 'button' ? 'button' : tagName === 'a' ? 'link' : tagName === 'input' ? 'textbox' : '');
    const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 48);
    let matchedRef = '';
    for (const [refKey, meta] of Object.entries(refs)) {
      const mName = (meta?.name || '').trim();
      const mRole = (meta?.role || '').trim();
      if (mName && label && mName === label && (!mRole || !role || mRole === role)) {
        matchedRef = '@' + refKey;
        break;
      }
    }
    const prefix = matchedRef ? matchedRef + ' · ' : '';
    badge.style.display = 'block';
    badge.textContent = prefix + '<' + tagName + '>' + (label ? ' "' + label.slice(0, 28) + '"' : '') + ' · ' + Math.round(rect.width) + '×' + Math.round(rect.height);
    badge.style.left = Math.max(4, Math.min(window.innerWidth - 220, rect.left)) + 'px';
    badge.style.top = (rect.top > 28 ? rect.top - 26 : rect.bottom + 6) + 'px';
    return true;
  })()`;
}

export const CLEAR_PICK_OVERLAY_SCRIPT = `(() => {
  document.getElementById('__oc_ab_pick_overlay__')?.remove();
  return true;
})()`;

export function buildCapturePickedElementScript(
  cssX: number,
  cssY: number,
  sessionName: string,
  refsMap: Readonly<
    Record<string, { readonly role?: string; readonly name?: string }>
  >,
): string {
  return `(() => {
    const overlay = document.getElementById('__oc_ab_pick_overlay__');
    if (overlay) overlay.remove();
    const x = ${Number.isFinite(cssX) ? cssX : 0};
    const y = ${Number.isFinite(cssY) ? cssY : 0};
    const refs = ${JSON.stringify(refsMap)};
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    const cssPath = (node) => {
      if (!(node instanceof Element)) return 'body';
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) {
        return '#' + CSS.escape(node.id);
      }
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 5) {
        let part = cur.tagName.toLowerCase();
        const testId = cur.getAttribute('data-testid');
        if (testId) {
          parts.unshift(part + '[data-testid="' + CSS.escape(testId) + '"]');
          break;
        }
        if (cur.id) {
          parts.unshift('#' + CSS.escape(cur.id));
          break;
        }
        const parent = cur.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (siblings.length > 1) {
            part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
          }
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ') || 'body';
    };

    const tag = el.tagName.toLowerCase();
    const implicitRole =
      tag === 'button' ? 'button'
      : tag === 'a' && el.hasAttribute('href') ? 'link'
      : tag === 'input' ? (el.getAttribute('type') === 'checkbox' ? 'checkbox' : 'textbox')
      : tag === 'select' ? 'combobox'
      : tag === 'textarea' ? 'textbox'
      : null;
    const role = el.getAttribute('role') || implicitRole;
    const accessibleName = (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.getAttribute('placeholder') ||
      el.getAttribute('alt') ||
      (el instanceof HTMLElement ? el.innerText : '') ||
      ''
    ).trim().replace(/\\s+/g, ' ').slice(0, 120) || null;

    let matchedRef = null;
    for (const [refKey, meta] of Object.entries(refs)) {
      const mName = (meta?.name || '').trim().replace(/\\s+/g, ' ');
      const mRole = (meta?.role || '').trim();
      if (mName && accessibleName && (mName === accessibleName || accessibleName.startsWith(mName))) {
        if (!mRole || !role || mRole === role) {
          matchedRef = '@' + refKey;
          break;
        }
      }
    }

    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const styleKeys = [
      'display', 'position', 'width', 'height', 'padding', 'margin',
      'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'border', 'borderRadius', 'opacity', 'zIndex', 'overflow'
    ];
    const styles = {};
    for (const k of styleKeys) {
      const val = cs[k];
      if (val) styles[k] = String(val);
    }

    return {
      session: ${JSON.stringify(sessionName)},
      url: location.href,
      title: document.title || location.href,
      ref: matchedRef,
      selector: cssPath(el),
      tag,
      role,
      accessibleName,
      textSnippet: ((el instanceof HTMLElement ? el.innerText : el.textContent) || '').trim().replace(/\\s+/g, ' ').slice(0, 200),
      bounds: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles,
    };
  })()`;
}

export function formatPickedElementMarkdown(
  picked: PickedElementPayload,
): string {
  const heading = picked.ref
    ? `### Picked Element \`${picked.ref}\` (\`<${picked.tag}>\` in session \`${picked.session}\`)`
    : `### Picked Element \`<${picked.tag}>\` (session \`${picked.session}\`)`;
  const stylePairs = Object.entries(picked.styles)
    .slice(0, 10)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  const lines = [
    heading,
    `- **Page**: ${picked.title} (${picked.url})`,
    ...(picked.ref
      ? [
          `- **agent-browser ref**: \`${picked.ref}\` (e.g. \`agent-browser --session ${picked.session} click ${picked.ref}\`)`,
        ]
      : []),
    `- **CSS Selector**: \`${picked.selector}\``,
    ...(picked.role ? [`- **ARIA Role**: \`${picked.role}\``] : []),
    ...(picked.accessibleName
      ? [`- **Accessible Name**: ${JSON.stringify(picked.accessibleName)}`]
      : []),
    `- **Bounds**: \`${picked.bounds.width}×${picked.bounds.height}\` at \`(${picked.bounds.x}, ${picked.bounds.y})\``,
    ...(picked.textSnippet
      ? [`- **Text**: ${JSON.stringify(picked.textSnippet)}`]
      : []),
    ...(stylePairs ? [`- **Computed Styles**: \`${stylePairs}\``] : []),
  ];
  return lines.join("\n");
}
