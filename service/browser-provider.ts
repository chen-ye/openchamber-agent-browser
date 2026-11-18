import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BROWSER_PROVIDER_ACTION_TIMEOUT_MS,
  BROWSER_PROVIDER_OPEN_TIMEOUT_MS,
  type BrowserCloseData,
  type BrowserConsoleProblem,
  type BrowserOpenData,
  type BrowserProviderContext,
  type BrowserProviderRequest,
  type BrowserProviderResult,
  type BrowserSnapshotData,
  type BrowserTab,
  type BrowserViewportMode,
  type BrowserViewportSummary,
} from "@openchamber/sdk";
import { asString } from "../shared/types.ts";
import {
  discoverDaemonSessions,
  execAgentBrowserCli,
  extractAgentBrowserCliError,
  sendDaemonSocketCommand,
  type DiscoveredDaemonSession,
} from "./daemon-client.ts";

const PRESET_DIMENSIONS: Readonly<
  Record<
    Exclude<BrowserViewportMode, "fill">,
    { width: number; height: number; mobile: boolean }
  >
> = {
  mobile: { width: 390, height: 844, mobile: true },
  tablet: { width: 768, height: 1024, mobile: false },
  desktop: { width: 1280, height: 800, mobile: false },
};

export interface ProviderBridgeHooks {
  readonly dataDir: string;
  readonly isSessionUserControlled: (session: string) => boolean;
  readonly markAgentActive: (session: string) => void;
  readonly getConsoleProblems: (
    session: string,
  ) => readonly BrowserConsoleProblem[];
  readonly onSessionTouched: (
    session: string,
    options?: { readonly follow?: boolean },
  ) => void;
}

interface ScopeMeta {
  viewport: BrowserViewportSummary;
  openedTabs: string[];
  initialized: boolean;
}

export class AgentBrowserOpenChamberProvider {
  private readonly scopes = new Map<string, ScopeMeta>();

  private readonly hooks: ProviderBridgeHooks;

  constructor(hooks: ProviderBridgeHooks) {
    this.hooks = hooks;
  }

  sessionNameForContext(ctx: BrowserProviderContext): string {
    if (ctx.sessionId) {
      const clean = ctx.sessionId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);
      return clean ? `oc-${clean}` : "default";
    }
    return "default";
  }

  private getScopeMeta(session: string): ScopeMeta {
    let meta = this.scopes.get(session);
    if (!meta) {
      meta = {
        viewport: { mode: "desktop", width: 1280, height: 800 },
        openedTabs: [],
        initialized: false,
      };
      this.scopes.set(session, meta);
    }
    return meta;
  }

  private findDaemon(session: string): DiscoveredDaemonSession | null {
    return (
      discoverDaemonSessions().find((item) => item.session === session) ?? null
    );
  }

  private async ensureDaemon(
    session: string,
    initialUrl = "about:blank",
  ): Promise<DiscoveredDaemonSession> {
    const existing = this.findDaemon(session);
    if (existing) return existing;

    try {
      const cliRes = await execAgentBrowserCli(
        ["--session", session, "open", initialUrl, "--json"],
        {
          timeoutMs: 30000,
        },
      );
      const cliErr = extractAgentBrowserCliError(cliRes);
      if (cliErr) {
        throw new Error(cliErr);
      }
      const launched = this.findDaemon(session);
      if (!launched) {
        throw new Error(
          `Failed to start agent-browser daemon for session "${session}"`,
        );
      }
      const meta = this.getScopeMeta(session);
      meta.initialized = initialUrl !== "about:blank";
      return launched;
    } catch (err) {
      const orphan = this.findDaemon(session);
      if (orphan) {
        await sendDaemonSocketCommand(orphan.sockPath, "close", {}, 1500).catch(
          () => {
            try {
              process.kill(orphan.pid, "SIGTERM");
            } catch {
              // Process already exited.
            }
          },
        );
      } else {
        await execAgentBrowserCli(["--session", session, "close"], {
          timeoutMs: 1500,
        }).catch(() => {});
      }
      throw err;
    }
  }

  private async listTabs(sockPath: string): Promise<BrowserTab[]> {
    const res = await sendDaemonSocketCommand<{
      tabs?: Array<Record<string, unknown>>;
    }>(sockPath, "tab_list");
    if (!res.success || !Array.isArray(res.data?.tabs)) return [];
    return res.data.tabs.map((tab, idx) => ({
      id: asString(tab.tabId, `t${idx + 1}`),
      title: asString(tab.title),
      url: asString(tab.url),
      active: Boolean(tab.active),
    }));
  }

  private async switchIfTabRequested(
    sockPath: string,
    tabId: string | undefined,
  ): Promise<string | null> {
    if (!tabId) return null;
    const tabs = await this.listTabs(sockPath);
    if (tabs.length === 0 || !tabs.some((t) => t.id === tabId)) {
      return `Unknown tabId "${tabId}". Run browser.snapshot to see open tab ids.`;
    }
    const active = tabs.find((t) => t.active);
    if (active?.id !== tabId) {
      const sw = await sendDaemonSocketCommand(sockPath, "tab_switch", {
        tabId,
      });
      if (!sw.success) {
        return sw.error || `Could not switch to tab "${tabId}"`;
      }
    }
    return null;
  }

  private async evalJson<T>(sockPath: string, expression: string): Promise<T> {
    const res = await sendDaemonSocketCommand<{ result?: T }>(
      sockPath,
      "evaluate",
      {
        script: expression,
      },
    );
    if (!res.success) {
      throw new Error(res.error || "Page script evaluation failed");
    }
    return res.data?.result as T;
  }

  async handleRequest(
    req: BrowserProviderRequest,
  ): Promise<BrowserProviderResult> {
    const deadlineMs =
      req.action === "browser.open"
        ? BROWSER_PROVIDER_OPEN_TIMEOUT_MS - 2000
        : BROWSER_PROVIDER_ACTION_TIMEOUT_MS - 2000;

    return Promise.race([
      this.executeAction(req),
      new Promise<BrowserProviderResult>((resolve) => {
        setTimeout(() => {
          resolve({
            ok: false,
            error: `${req.action} exceeded ${Math.round(deadlineMs / 1000)}s deadline; check if the page is stalled.`,
          });
        }, deadlineMs);
      }),
    ]);
  }

  private async executeAction(
    req: BrowserProviderRequest,
  ): Promise<BrowserProviderResult> {
    const session = this.sessionNameForContext(req.context);
    if (this.hooks.isSessionUserControlled(session)) {
      return {
        ok: false,
        error: `The user currently controls the browser surface for session "${session}". Wait for them to hand control back or ask first.`,
      };
    }

    this.hooks.markAgentActive(session);
    const meta = this.getScopeMeta(session);

    try {
      if (req.action === "browser.open") {
        const { url, viewport, tabId } = req.parameters;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          return {
            ok: false,
            error: "URL must start with http:// or https://",
          };
        }
        const existing = this.findDaemon(session);
        let daemon: DiscoveredDaemonSession;
        let resolvedTabId: string | undefined;

        if (!existing) {
          daemon = await this.ensureDaemon(session, url);
          const tabs = await this.listTabs(daemon.sockPath);
          resolvedTabId = tabs.find((t) => t.active)?.id ?? tabs[0]?.id;
          if (resolvedTabId) meta.openedTabs.push(resolvedTabId);
        } else {
          daemon = existing;
          if (tabId) {
            const tabErr = await this.switchIfTabRequested(
              daemon.sockPath,
              tabId,
            );
            if (tabErr) return { ok: false, error: tabErr };
            const nav = await sendDaemonSocketCommand(
              daemon.sockPath,
              "navigate",
              { url },
              35000,
            );
            if (!nav.success)
              return { ok: false, error: nav.error || `Failed to open ${url}` };
            resolvedTabId = tabId;
          } else {
            const currentTabs = await this.listTabs(daemon.sockPath);
            if (
              currentTabs.length === 1 &&
              currentTabs[0]?.url === "about:blank" &&
              !meta.initialized
            ) {
              const nav = await sendDaemonSocketCommand(
                daemon.sockPath,
                "navigate",
                { url },
                35000,
              );
              if (!nav.success)
                return {
                  ok: false,
                  error: nav.error || `Failed to open ${url}`,
                };
              meta.initialized = true;
              resolvedTabId = currentTabs[0].id;
              meta.openedTabs.push(resolvedTabId);
            } else {
              const created = await sendDaemonSocketCommand<{ tabId?: string }>(
                daemon.sockPath,
                "tab_new",
                { url },
                35000,
              );
              if (!created.success) {
                return {
                  ok: false,
                  error: created.error || `Failed to open new tab for ${url}`,
                };
              }
              const updatedTabs = await this.listTabs(daemon.sockPath);
              resolvedTabId =
                created.data?.tabId ??
                updatedTabs.find((t) => t.active)?.id ??
                updatedTabs.at(-1)?.id;
              if (resolvedTabId) meta.openedTabs.push(resolvedTabId);
            }
          }
        }

        if (viewport) {
          await this.applyViewportPreset(daemon.sockPath, meta, viewport);
        }

        const pageInfo = await this.evalJson<{
          url: string;
          title: string;
          readyState: string;
        }>(
          daemon.sockPath,
          `({ url: location.href, title: document.title || '', readyState: document.readyState })`,
        );
        this.hooks.onSessionTouched(session, { follow: true });
        const openData: BrowserOpenData & { session: string } = {
          ...(resolvedTabId ? { tabId: resolvedTabId } : {}),
          session,
          url: pageInfo.url || url,
          title: pageInfo.title || "",
          opened: true,
          settled: pageInfo.readyState === "complete",
          viewport: meta.viewport,
        };
        return {
          ok: true,
          data: openData,
        };
      }

      const daemon = this.findDaemon(session);
      if (!daemon) {
        const activeOthers = discoverDaemonSessions()
          .map((d) => d.session)
          .filter((name) => name !== session);
        const otherHint =
          activeOthers.length > 0
            ? ` Active panel/CLI agent-browser sessions (${activeOthers.join(", ")}) are separate from this chat's openchamber_web scope ("${session}") and can be inspected via agent-browser CLI.`
            : "";
        return {
          ok: false,
          error: `No browser page is open yet for session "${session}". Call browser.open with an http(s) URL first.${otherHint}`,
        };
      }

      if (req.action === "browser.close") {
        const tabs = await this.listTabs(daemon.sockPath);
        const targetTab = req.parameters.tabId ?? meta.openedTabs.at(-1);
        if (!targetTab || !tabs.some((t) => t.id === targetTab)) {
          return { ok: false, error: "No matching agent-opened tab to close." };
        }
        if (tabs.length <= 1) {
          await sendDaemonSocketCommand(daemon.sockPath, "close");
          this.scopes.delete(session);
          this.hooks.onSessionTouched(session);
          const closeData: BrowserCloseData & { session: string } = {
            closed: true,
            tabId: targetTab,
            session,
          };
          return { ok: true, data: closeData };
        }
        const closed = await sendDaemonSocketCommand(
          daemon.sockPath,
          "tab_close",
          { tabId: targetTab },
        );
        if (!closed.success) {
          return {
            ok: false,
            error: closed.error || `Could not close tab "${targetTab}"`,
          };
        }
        meta.openedTabs = meta.openedTabs.filter((id) => id !== targetTab);
        this.hooks.onSessionTouched(session);
        const closeData: BrowserCloseData & { session: string } = {
          closed: true,
          tabId: targetTab,
          session,
        };
        return { ok: true, data: closeData };
      }

      const tabErr = await this.switchIfTabRequested(
        daemon.sockPath,
        req.parameters.tabId,
      );
      if (tabErr) return { ok: false, error: tabErr };

      if (req.action === "browser.resize") {
        await this.applyViewportPreset(
          daemon.sockPath,
          meta,
          req.parameters.viewport,
        );
        this.hooks.onSessionTouched(session);
        return { ok: true, data: { viewport: meta.viewport } };
      }

      if (req.action === "browser.back" || req.action === "browser.forward") {
        const navAction = req.action === "browser.back" ? "back" : "forward";
        const res = await sendDaemonSocketCommand(daemon.sockPath, navAction);
        if (!res.success)
          return { ok: false, error: res.error || `Cannot go ${navAction}` };
        const info = await this.evalJson<{ url: string; title: string }>(
          daemon.sockPath,
          `({ url: location.href, title: document.title || '' })`,
        );
        this.hooks.onSessionTouched(session);
        return { ok: true, data: { url: info.url, title: info.title } };
      }

      if (req.action === "browser.snapshot") {
        const tabs = await this.listTabs(daemon.sockPath);
        const problems = this.hooks.getConsoleProblems(session);
        const snap = await this.evalJson<
          Omit<BrowserSnapshotData, "viewport" | "tabs" | "consoleProblems">
        >(
          daemon.sockPath,
          buildProviderSnapshotScript(req.parameters.selector),
        );
        this.hooks.onSessionTouched(session);
        const snapData: BrowserSnapshotData & { session: string } = {
          ...snap,
          session,
          viewport: meta.viewport,
          ...(problems.length > 0 ? { consoleProblems: [...problems] } : {}),
          ...(tabs.length > 0 ? { tabs } : {}),
        };
        return {
          ok: true,
          data: snapData,
        };
      }

      if (req.action === "browser.click") {
        const { selector, text } = req.parameters;
        const resolved = await this.evalJson<{
          ok: boolean;
          selector?: string;
          label?: string;
          error?: string;
        }>(daemon.sockPath, buildResolveClickTargetScript(selector, text));
        if (!resolved.ok || !resolved.selector) {
          return {
            ok: false,
            error: resolved.error || "No matching clickable element found",
          };
        }
        const clicked = await sendDaemonSocketCommand(
          daemon.sockPath,
          "click",
          { selector: resolved.selector },
        );
        if (!clicked.success) {
          return {
            ok: false,
            error: clicked.error || `Could not click ${resolved.selector}`,
          };
        }
        const urlRes = await sendDaemonSocketCommand<{ url?: string }>(
          daemon.sockPath,
          "url",
        );
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            clicked: resolved.selector,
            label: resolved.label || resolved.selector,
            url: String(urlRes.data?.url ?? ""),
          },
        };
      }

      if (req.action === "browser.type") {
        const { selector, value, submit } = req.parameters;
        const filled = await sendDaemonSocketCommand(daemon.sockPath, "fill", {
          selector,
          value,
        });
        if (!filled.success) {
          return {
            ok: false,
            error: filled.error || `No editable element matches ${selector}`,
          };
        }
        if (submit) {
          await sendDaemonSocketCommand(daemon.sockPath, "press", {
            key: "Enter",
          });
        }
        const urlRes = await sendDaemonSocketCommand<{ url?: string }>(
          daemon.sockPath,
          "url",
        );
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            url: String(urlRes.data?.url ?? ""),
          },
        };
      }

      if (req.action === "browser.select") {
        const { selector } = req.parameters;
        const byLabel =
          "label" in req.parameters ? req.parameters.label : undefined;
        const byValue =
          "value" in req.parameters ? req.parameters.value : undefined;
        const selected = await this.evalJson<{
          ok: boolean;
          label?: string;
          value?: string;
          url?: string;
          error?: string;
        }>(
          daemon.sockPath,
          buildStrictNativeSelectScript(selector, byLabel, byValue),
        );
        if (!selected.ok) {
          return {
            ok: false,
            error: selected.error || `Cannot select option on ${selector}`,
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            label: selected.label ?? "",
            value: selected.value ?? "",
            url: selected.url ?? "",
          },
        };
      }

      if (req.action === "browser.scroll") {
        const { selector, direction } = req.parameters;
        const scrolled = await this.evalJson<{
          ok: boolean;
          scrollY?: number;
          maxScrollY?: number;
          atTop?: boolean;
          atBottom?: boolean;
          scrolledTo?: string;
          error?: string;
        }>(daemon.sockPath, buildScrollScript(selector, direction));
        if (!scrolled.ok) {
          return {
            ok: false,
            error: scrolled.error || "Scroll target not found",
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            scrollY: scrolled.scrollY ?? 0,
            maxScrollY: scrolled.maxScrollY ?? 0,
            atTop: Boolean(scrolled.atTop),
            atBottom: Boolean(scrolled.atBottom),
            ...(scrolled.scrolledTo ? { scrolledTo: scrolled.scrolledTo } : {}),
            ...(direction ? { direction } : {}),
          },
        };
      }

      if (req.action === "browser.inspect") {
        const { selector } = req.parameters;
        const inspected = await this.evalJson<{
          ok: boolean;
          tag?: string;
          label?: string;
          bounds?: { x: number; y: number; width: number; height: number };
          inViewport?: boolean;
          styles?: Record<string, string>;
          error?: string;
        }>(daemon.sockPath, buildInspectScript(selector));
        if (!inspected.ok || !inspected.bounds || !inspected.styles) {
          return {
            ok: false,
            error: inspected.error || `No element matches ${selector}`,
          };
        }
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            selector,
            tag: inspected.tag ?? "div",
            label: inspected.label ?? "",
            bounds: inspected.bounds,
            inViewport: Boolean(inspected.inViewport),
            styles: inspected.styles,
          },
        };
      }

      if (req.action === "browser.capture") {
        const captureDir = path.join(
          this.hooks.dataDir || os.tmpdir(),
          "captures",
        );
        fs.mkdirSync(captureDir, { recursive: true });
        const filePath = path.join(
          captureDir,
          `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
        );
        const shot = await sendDaemonSocketCommand<{ path?: string }>(
          daemon.sockPath,
          "screenshot",
          {
            path: filePath,
            format: "png",
          },
        );
        if (!shot.success) {
          return {
            ok: false,
            error: shot.error || "Failed to capture screenshot",
          };
        }
        const actualPath = shot.data?.path || filePath;
        const bytes = fs.readFileSync(actualPath);
        try {
          fs.unlinkSync(actualPath);
        } catch {
          // Ignore temp cleanup error.
        }
        const info = await this.evalJson<{
          url: string;
          title: string;
          width: number;
          height: number;
        }>(
          daemon.sockPath,
          `({ url: location.href, title: document.title || '', width: window.innerWidth, height: window.innerHeight })`,
        );
        this.hooks.onSessionTouched(session);
        return {
          ok: true,
          data: {
            base64: bytes.toString("base64"),
            mime: "image/png",
            width: info.width || meta.viewport.width || 1280,
            height: info.height || meta.viewport.height || 800,
            url: info.url,
            title: info.title,
            viewport: meta.viewport,
          },
        };
      }

      return { ok: false, error: "Unsupported browser action" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async applyViewportPreset(
    sockPath: string,
    meta: ScopeMeta,
    mode: BrowserViewportMode,
  ): Promise<void> {
    if (mode === "fill") {
      await sendDaemonSocketCommand(sockPath, "viewport", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
      meta.viewport = { mode: "fill", width: null, height: null };
      return;
    }
    const spec = PRESET_DIMENSIONS[mode];
    await sendDaemonSocketCommand(sockPath, "viewport", {
      width: spec.width,
      height: spec.height,
      deviceScaleFactor: 1,
      mobile: spec.mobile,
    });
    meta.viewport = { mode, width: spec.width, height: spec.height };
  }
}

function buildProviderSnapshotScript(scopeSelector?: string): string {
  return `(() => {
    const scopeSel = ${JSON.stringify(scopeSelector ?? null)};
    const root = scopeSel ? document.querySelector(scopeSel) : document.body;
    if (scopeSel && !root) {
      throw new Error('No element matches scope selector ' + scopeSel);
    }
    const targetRoot = root || document.documentElement;
    const cssPath = (node) => {
      if (!(node instanceof Element)) return 'body';
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) return '#' + CSS.escape(node.id);
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 5) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = parent;
      }
      return parts.join(' > ') || 'body';
    };

    const rawText = ((targetRoot instanceof HTMLElement ? targetRoot.innerText : targetRoot.textContent) || '').trim();
    const maxText = 6000;
    const textTruncated = rawText.length > maxText;
    const text = textTruncated ? rawText.slice(0, maxText) : rawText;

    const candidates = Array.from(targetRoot.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'));
    const visible = candidates.filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });

    const maxEls = 120;
    const elementsTruncated = visible.length > maxEls;
    const elements = visible.slice(0, maxEls).map((el) => {
      const tag = el.tagName.toLowerCase();
      const r = el.getBoundingClientRect();
      const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
      const role = el.getAttribute('role') || undefined;
      const type = el.getAttribute('type') || undefined;
      const label = (
        el.getAttribute('aria-label') ||
        (el.labels && el.labels[0] ? el.labels[0].innerText : '') ||
        el.getAttribute('placeholder') ||
        el.getAttribute('title') ||
        (el instanceof HTMLElement ? el.innerText : '') ||
        ''
      ).trim().replace(/\\s+/g, ' ').slice(0, 120);
      const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

      const item = {
        selector: cssPath(el),
        tag,
        bounds: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      };
      if (inViewport) item.inViewport = true;
      if (type) item.type = type;
      if (role) item.role = role;
      if (label) item.label = label;
      else item.missingAccessibleName = true;
      if (disabled) item.disabled = true;

      if (el instanceof HTMLSelectElement) {
        item.multiple = el.multiple;
        const rawOpts = Array.from(el.options);
        let optTrunc = rawOpts.length > 32;
        item.options = rawOpts.slice(0, 32).map((o) => {
          const rawL = o.label || o.text || '';
          const rawV = o.value || '';
          if (rawL.length > 80 || rawV.length > 80) optTrunc = true;
          return {
            label: rawL.slice(0, 80),
            value: rawV.slice(0, 80),
            selected: o.selected,
            disabled: o.disabled,
          };
        });
        if (optTrunc) item.optionsTruncated = true;
      }
      return item;
    });

    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const out = {
      url: location.href,
      title: document.title || '',
      scope: scopeSel || 'document',
      scrollY: Math.round(window.scrollY),
      maxScrollY: Math.round(maxScrollY),
      text,
      elements,
    };
    if (textTruncated) {
      out.textTruncated = true;
      out.textTotalChars = rawText.length;
    }
    if (elementsTruncated) {
      out.elementsTruncated = true;
      out.interactiveElementsOnPage = visible.length;
    }
    return out;
  })()`;
}

function buildResolveClickTargetScript(
  selector?: string,
  text?: string,
): string {
  return `(() => {
    const sel = ${JSON.stringify(selector ?? null)};
    const txt = ${JSON.stringify(text ?? null)};
    const cssPath = (node) => {
      if (node.id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(node.id)) return '#' + CSS.escape(node.id);
      const parts = [];
      let cur = node;
      while (cur && cur.nodeType === 1 && parts.length < 6) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
        const p = cur.parentElement;
        if (p) {
          const sibs = Array.from(p.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = p;
      }
      return parts.join(' > ');
    };
    if (sel) {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: 'No element matches ' + sel };
      const label = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || sel).trim().slice(0, 80);
      return { ok: true, selector: sel, label };
    }
    if (txt) {
      const norm = txt.trim().toLowerCase();
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], [role="link"], input[type="submit"], input[type="button"], summary, label'));
      const found = candidates.find((el) => {
        const t = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || el.getAttribute('value') || '').trim().toLowerCase();
        return t === norm || t.includes(norm);
      });
      if (!found) return { ok: false, error: 'No clickable element matches visible label "' + txt + '"' };
      return { ok: true, selector: cssPath(found), label: txt };
    }
    return { ok: false, error: 'Provide selector or text to click' };
  })()`;
}

function buildStrictNativeSelectScript(
  selector: string,
  label?: string,
  value?: string,
): string {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { ok: false, error: 'No element matches ' + ${JSON.stringify(selector)} };
    if (!(el instanceof HTMLSelectElement)) {
      return { ok: false, error: 'Target is not a native HTML <select> element' };
    }
    if (el.multiple) {
      return { ok: false, error: 'Multiple <select> elements are not supported by browser.select' };
    }
    if (el.disabled) {
      return { ok: false, error: 'Target <select> element is disabled' };
    }
    const wantLabel = ${JSON.stringify(label ?? null)};
    const wantValue = ${JSON.stringify(value ?? null)};
    const opts = Array.from(el.options);
    const matches = opts.filter((o) => wantLabel !== null ? (o.label === wantLabel || o.text === wantLabel) : o.value === wantValue);
    if (matches.length === 0) {
      return { ok: false, error: 'No option matches ' + (wantLabel !== null ? 'label "' + wantLabel + '"' : 'value "' + wantValue + '"') };
    }
    if (matches.length > 1) {
      return { ok: false, error: 'Ambiguous option match on ' + ${JSON.stringify(selector)} };
    }
    const chosen = matches[0];
    if (chosen.disabled) {
      return { ok: false, error: 'Matching <option> is disabled' };
    }
    el.value = chosen.value;
    chosen.selected = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, label: chosen.label || chosen.text, value: chosen.value, url: location.href };
  })()`;
}

function buildScrollScript(selector?: string, direction?: string): string {
  return `(() => {
    const sel = ${JSON.stringify(selector ?? null)};
    const dir = ${JSON.stringify(direction ?? null)};
    let scrolledTo;
    if (sel) {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, error: 'No element matches ' + sel };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      scrolledTo = sel;
    } else if (dir === 'top') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (dir === 'bottom') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    } else if (dir === 'up') {
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: 'instant' });
    } else {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: 'instant' });
    }
    const maxScrollY = Math.max(0, Math.round(document.documentElement.scrollHeight - window.innerHeight));
    const scrollY = Math.round(window.scrollY);
    return {
      ok: true,
      scrollY,
      maxScrollY,
      atTop: scrollY <= 1,
      atBottom: scrollY >= maxScrollY - 1,
      ...(scrolledTo ? { scrolledTo } : {}),
    };
  })()`;
}

function buildInspectScript(selector: string): string {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { ok: false, error: 'No element matches ' + ${JSON.stringify(selector)} };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const props = [
      'display', 'position', 'width', 'height', 'padding', 'margin',
      'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'textAlign', 'border', 'borderRadius', 'boxShadow',
      'opacity', 'visibility', 'overflow', 'zIndex', 'flexDirection',
      'justifyContent', 'alignItems', 'gap', 'gridTemplateColumns'
    ];
    const styles = {};
    for (const p of props) {
      styles[p] = String(cs[p] ?? '');
    }
    const label = ((el instanceof HTMLElement ? el.innerText : '') || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 120);
    const inViewport = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    return {
      ok: true,
      tag: el.tagName.toLowerCase(),
      label,
      bounds: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      inViewport,
      styles,
    };
  })()`;
}
