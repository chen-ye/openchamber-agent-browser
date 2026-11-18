import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  BROWSER_PROVIDER_PATH,
  MENTIONS_RESOLVE_PATH,
  MENTIONS_SEARCH_PATH,
  OPENCHAMBER_SERVICE_DATA_DIR,
  SURFACE_AGENT_ACTIVE_HEADER,
  SURFACE_CLIPBOARD_PATH,
  SURFACE_CONTROL_PATH,
  SURFACE_FRAME_MAX_BYTES,
  SURFACE_FRAME_PATH,
  SURFACE_FRAME_SEQ_HEADER,
  SURFACE_FRAME_WAIT_MS,
  SURFACE_HEIGHT_HEADER,
  SURFACE_INPUT_PATH,
  SURFACE_RESIZE_PATH,
  SURFACE_SEQ_HEADER,
  SURFACE_TITLE_HEADER,
  SURFACE_WIDTH_HEADER,
  createServiceHost,
  readBrowserProviderRequest,
  readSurfaceControlNotice,
  readSurfaceInputBatch,
  readSurfaceResizeRequest,
  type MentionsResolveRequest,
  type MentionsSearchRequest,
  type ServiceHost,
} from "@openchamber/sdk";
import type {
  SurfaceInspectMode,
  ViewerScale,
  ViewportPreset,
} from "../shared/types.ts";
import { AgentBrowserOpenChamberProvider } from "./browser-provider.ts";
import { formatPickedElementMarkdown } from "./cdp-bridge.ts";
import { ServiceHttpError, SessionHub } from "./session-hub.ts";

export interface RunningExtensionServer {
  readonly server: http.Server;
  readonly port: number;
  readonly hub: SessionHub;
  readonly close: () => Promise<void>;
}

function readRequestBody(
  req: http.IncomingMessage,
  maxBytes = 1_000_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Request body exceeded maximum allowed bytes"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown,
): void {
  const text = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

export async function startExtensionServer(options: {
  readonly port: number;
  readonly token: string;
  readonly dataDir?: string;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<RunningExtensionServer> {
  const env = options.env ?? process.env;
  const dataDir =
    options.dataDir ||
    env[OPENCHAMBER_SERVICE_DATA_DIR] ||
    path.join(os.homedir(), ".local", "share", "openchamber-agent-browser");

  let serviceHost: ServiceHost | null = null;
  if (env.OPENCHAMBER_HOST_CALLBACK_URL && env.OPENCHAMBER_SERVICE_TOKEN) {
    try {
      serviceHost = createServiceHost({ env });
    } catch {
      serviceHost = null;
    }
  }

  const hub = new SessionHub({ serviceHost, dataDir });
  hub.start();

  const provider = new AgentBrowserOpenChamberProvider({
    dataDir,
    isSessionUserControlled: (session) => hub.isSessionUserControlled(session),
    markAgentActive: (session) => hub.markAgentActive(session),
    getConsoleProblems: (session) => hub.getConsoleProblems(session),
    onSessionTouched: (session, opts) => {
      void hub.refreshSessions({
        preferredSession: session,
        followPreferred: Boolean(opts?.follow),
      });
    },
  });

  const server = http.createServer((req, res) => {
    void (async () => {
      if (req.headers.authorization !== `Bearer ${options.token}`) {
        res.writeHead(401).end();
        return;
      }

      const parsedUrl = new URL(req.url ?? "/", "http://127.0.0.1");
      const pathname = parsedUrl.pathname;
      const method = req.method ?? "GET";

      if (method === "GET" && pathname === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (pathname === "/status") {
        if (method === "GET") {
          const view = await hub.buildWorkStatusView();
          sendJson(res, 200, view);
          return;
        }
        if (method === "POST") {
          const raw = await readRequestBody(req);
          const evt = JSON.parse(raw || "{}") as { id?: string };
          if (evt.id) {
            await hub.handleStatusAction(evt.id);
          }
          sendJson(res, 200, { ok: true });
          return;
        }
      }

      if (method === "GET" && pathname === SURFACE_FRAME_PATH) {
        const after = Math.max(
          0,
          Number(parsedUrl.searchParams.get("after") ?? "0") || 0,
        );
        const wait = Math.min(
          SURFACE_FRAME_WAIT_MS,
          Math.max(
            0,
            Number(parsedUrl.searchParams.get("wait") ?? "5000") || 5000,
          ),
        );
        const frame = await hub.waitForSurfaceFrame(after, wait);
        if (!frame || frame.bytes.length > SURFACE_FRAME_MAX_BYTES) {
          res.writeHead(204).end();
          return;
        }
        const headers: Record<string, string | number> = {
          "Content-Type": "image/jpeg",
          "Content-Length": frame.bytes.length,
          [SURFACE_SEQ_HEADER]: String(frame.seq),
          [SURFACE_WIDTH_HEADER]: String(frame.width),
          [SURFACE_HEIGHT_HEADER]: String(frame.height),
        };
        if (frame.title) {
          headers[SURFACE_TITLE_HEADER] = frame.title;
        }
        if (hub.isActiveSurfaceAgentDriving()) {
          headers[SURFACE_AGENT_ACTIVE_HEADER] = "1";
        }
        res.writeHead(200, headers);
        res.end(frame.bytes);
        return;
      }

      if (method === "POST" && pathname === SURFACE_INPUT_PATH) {
        const frameSeqHeader = req.headers[SURFACE_FRAME_SEQ_HEADER];
        if (
          !hub.checkFrameFence(
            typeof frameSeqHeader === "string" ? frameSeqHeader : undefined,
          )
        ) {
          res.writeHead(409).end();
          return;
        }
        const raw = await readRequestBody(req);
        const batch = readSurfaceInputBatch(raw);
        if (!batch) {
          res.writeHead(400).end();
          return;
        }
        await hub.handleSurfaceInput(batch.events);
        res.writeHead(204).end();
        return;
      }

      if (method === "POST" && pathname === SURFACE_CONTROL_PATH) {
        const raw = await readRequestBody(req);
        const notice = readSurfaceControlNotice(raw);
        if (!notice) {
          res.writeHead(400).end();
          return;
        }
        hub.setControlState(notice.controller, notice.viewer);
        res.writeHead(204).end();
        return;
      }

      if (method === "POST" && pathname === SURFACE_RESIZE_PATH) {
        const raw = await readRequestBody(req);
        const resize = readSurfaceResizeRequest(raw);
        if (!resize) {
          res.writeHead(400).end();
          return;
        }
        const settled = await hub.resizeSurface(resize.width, resize.height);
        sendJson(res, 200, settled);
        return;
      }

      if (method === "GET" && pathname === SURFACE_CLIPBOARD_PATH) {
        const text = await hub.readClipboard();
        sendJson(res, 200, { text });
        return;
      }

      if (method === "POST" && pathname === BROWSER_PROVIDER_PATH) {
        const raw = await readRequestBody(req);
        const parsed = readBrowserProviderRequest(raw);
        if (!parsed) {
          res.writeHead(400).end();
          return;
        }
        const answer = await provider.handleRequest(parsed);
        sendJson(res, 200, answer);
        return;
      }

      if (method === "POST" && pathname === MENTIONS_SEARCH_PATH) {
        const raw = await readRequestBody(req);
        const parsed = JSON.parse(
          raw || "{}",
        ) as Partial<MentionsSearchRequest>;
        const items = hub.searchMentions(parsed.query ?? "");
        sendJson(res, 200, { items });
        return;
      }

      if (method === "POST" && pathname === MENTIONS_RESOLVE_PATH) {
        const raw = await readRequestBody(req);
        const parsed = JSON.parse(
          raw || "{}",
        ) as Partial<MentionsResolveRequest>;
        if (!parsed.id) {
          sendJson(res, 400, { message: "Missing mention id" });
          return;
        }
        const text = await hub.resolveMention(parsed.id);
        sendJson(res, 200, { text });
        return;
      }

      if (method === "GET" && pathname === "/api/state") {
        await hub.refreshSessions();
        sendJson(res, 200, hub.getDockState());
        return;
      }

      if (method === "GET" && pathname === "/api/observatory") {
        await hub.refreshSessions();
        const sessionParam = parsedUrl.searchParams.get("session");
        sendJson(res, 200, hub.getObservatorySnapshot(sessionParam));
        return;
      }

      if (method === "POST" && pathname === "/api/session/select") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          session?: string;
        };
        if (!body.session) {
          sendJson(res, 400, { message: "Missing session name" });
          return;
        }
        sendJson(res, 200, await hub.selectSession(body.session));
        return;
      }

      if (method === "POST" && pathname === "/api/session/pin") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          pinned?: boolean;
        };
        sendJson(res, 200, hub.setSessionPinned(Boolean(body.pinned)));
        return;
      }

      if (method === "POST" && pathname === "/api/session/create") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          session?: string;
          url?: string;
          allowExisting?: boolean;
        };
        sendJson(
          res,
          200,
          await hub.createSession(
            body.session || "default",
            body.url === undefined ? "https://example.com" : body.url,
            { allowExisting: Boolean(body.allowExisting) },
          ),
        );
        return;
      }

      if (method === "POST" && pathname === "/api/session/close") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          session?: string;
        };
        if (!body.session) {
          sendJson(res, 400, { message: "Missing session name" });
          return;
        }
        sendJson(res, 200, await hub.closeSession(body.session));
        return;
      }

      if (method === "POST" && pathname === "/api/nav") {
        const frameSeqHeader = req.headers[SURFACE_FRAME_SEQ_HEADER];
        if (
          !hub.checkFrameFence(
            typeof frameSeqHeader === "string" ? frameSeqHeader : undefined,
          )
        ) {
          sendJson(res, 409, {
            message: "View changed before command ran; retry.",
          });
          return;
        }
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          op?:
            | "navigate"
            | "back"
            | "forward"
            | "reload"
            | "tab_new"
            | "tab_switch"
            | "tab_close";
          url?: string;
          tabId?: string;
        };
        if (!body.op) {
          sendJson(res, 400, { message: "Missing navigation op" });
          return;
        }
        sendJson(
          res,
          200,
          await hub.performNavigation(body.op, {
            url: body.url,
            tabId: body.tabId,
          }),
        );
        return;
      }

      if (method === "POST" && pathname === "/api/mode") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          mode?: SurfaceInspectMode;
          colorScheme?: "dark" | "light";
        };
        if (!body.mode) {
          sendJson(res, 400, { message: "Missing mode" });
          return;
        }
        sendJson(
          res,
          200,
          await hub.setInspectMode(body.mode, body.colorScheme),
        );
        return;
      }

      if (method === "POST" && pathname === "/api/viewport") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          preset?: ViewportPreset;
          width?: number;
          height?: number;
          viewerScale?: ViewerScale;
          colorScheme?: "dark" | "light";
          selectCompatibility?: boolean;
        };
        sendJson(res, 200, await hub.updateViewportSettings(body));
        return;
      }

      if (method === "POST" && pathname === "/api/type") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          backspaces?: number;
          text?: string;
          enter?: boolean;
        };
        await hub.sendSoftKeyboardDiff({
          backspaces: Number(body.backspaces) || 0,
          text: String(body.text ?? ""),
          enter: Boolean(body.enter),
        });
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && pathname === "/api/dashboard/start") {
        sendJson(res, 200, await hub.startStandaloneDashboard());
        return;
      }

      if (method === "POST" && pathname === "/api/eval") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          session?: string | null;
          expression?: string;
        };
        if (!body.expression) {
          sendJson(res, 400, {
            ok: false,
            output: "Enter a JavaScript expression",
          });
          return;
        }
        sendJson(
          res,
          200,
          await hub.evaluateRepl(body.session ?? null, body.expression),
        );
        return;
      }

      if (method === "GET" && pathname === "/api/network") {
        const session = parsedUrl.searchParams.get("session");
        const typeFilter = parsedUrl.searchParams.get("type") || undefined;
        const clear = parsedUrl.searchParams.get("clear") === "1";
        const requests = await hub.listNetworkRequests(session, {
          typeFilter,
          clear,
        });
        sendJson(res, 200, { requests });
        return;
      }

      if (method === "GET" && pathname === "/api/network/detail") {
        const session = parsedUrl.searchParams.get("session");
        const requestId = parsedUrl.searchParams.get("requestId") ?? "";
        const detail = await hub.getNetworkRequestDetail(session, requestId);
        sendJson(res, detail ? 200 : 404, { detail });
        return;
      }

      if (method === "POST" && pathname === "/api/har/toggle") {
        const body = JSON.parse((await readRequestBody(req)) || "{}") as {
          session?: string | null;
        };
        sendJson(res, 200, await hub.toggleHarRecording(body.session ?? null));
        return;
      }

      if (method === "GET" && pathname === "/api/storage") {
        const session = parsedUrl.searchParams.get("session");
        const storage = await hub.getStorageSnapshot(session);
        sendJson(res, 200, { storage });
        return;
      }

      if (method === "POST" && pathname === "/api/format-picked") {
        const raw = await readRequestBody(req);
        const picked = JSON.parse(raw);
        sendJson(res, 200, { markdown: formatPickedElementMarkdown(picked) });
        return;
      }

      sendJson(res, 404, { message: `Unknown route ${method} ${pathname}` });
    })().catch((err) => {
      if (!res.headersSent) {
        const status = err instanceof ServiceHttpError ? err.status : 500;
        sendJson(res, status, {
          message: err instanceof Error ? err.message : String(err),
        });
      } else {
        res.end();
      }
    });
  });

  const boundPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr ? addr.port : options.port);
    });
  });

  return {
    server,
    port: boundPort,
    hub,
    close: async () => {
      await hub.dispose();
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
