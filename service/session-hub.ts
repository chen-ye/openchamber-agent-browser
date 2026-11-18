import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket, type RawData } from "ws";
import type {
  BrowserConsoleProblem,
  GuestStatusRow,
  GuestStatusView,
  MentionsItem,
  ServiceHost,
  SurfaceController,
  SurfaceInputEvent,
} from "@openchamber/sdk";
import {
  asString,
  nextAvailableSessionName,
  normalizeNavigationUrl,
  sanitizeSessionName,
  type ActivityEventItem,
  type ActivitySummary,
  type AgentBrowserSessionSummary,
  type ConsoleEventItem,
  type CookieSummary,
  type DockStateSnapshot,
  type NetworkRequestDetail,
  type NetworkRequestItem,
  type ObservatorySnapshot,
  type PickedElementPayload,
  type SessionTabItem,
  type StorageSnapshot,
  type SurfaceInspectMode,
  type ViewerScale,
  type ViewportPreset,
} from "../shared/types.ts";
import {
  CdpClient,
  CLEAR_PICK_OVERLAY_SCRIPT,
  DevToolsSurfaceController,
  applyBaseSelectCompatibility,
  applyScreenScale,
  buildCapturePickedElementScript,
  buildHoverPickScript,
  findActivePageTarget,
} from "./cdp-bridge.ts";
import {
  checkDashboardServer,
  discoverDaemonSessions,
  ensureDashboardRunning,
  execAgentBrowserCli,
  extractAgentBrowserCliError,
  sendDaemonSocketCommand,
  type DiscoveredDaemonSession,
} from "./daemon-client.ts";
import {
  INITIAL_CLICK_TRACKER,
  scaleCoordinate,
  translateSurfaceEventsToWsMessages,
  type ClickTrackerState,
} from "./input-translator.ts";
import {
  REDACTED,
  formatPreviewJson,
  isSensitiveKey,
  redactBodyText,
  redactHeaders,
  redactText,
  redactUnknown,
  redactUrl,
} from "./redact.ts";

const MAX_ACTIVITY_EVENTS = 250;
const MAX_CONSOLE_EVENTS = 250;
const MAX_LATENCY_POINTS = 40;
const AGENT_ACTIVE_WINDOW_MS = 4000;

interface LiveFrame {
  readonly seq: number;
  readonly upstreamSeq: number;
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
  readonly title: string;
}

interface FrameWaiter {
  readonly afterSeq: number;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly resolve: (frame: LiveFrame | null) => void;
}

interface SessionStreamRecord {
  daemon: DiscoveredDaemonSession;
  lastTargetId: string | null;
  ws: WebSocket | null;
  connecting: boolean;
  connected: boolean;
  screencasting: boolean;
  recording: boolean;
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  tabs: SessionTabItem[];
  activity: ActivityEventItem[];
  consoleEvents: ConsoleEventItem[];
  latenciesMs: number[];
  latestUpstreamFrame: {
    seq: number;
    bytes: Buffer;
    width: number;
    height: number;
  } | null;
  ackedUpstreamSeq: number;
  agentActiveUntil: number;
  clickTracker: ClickTrackerState;
}

const VIEWPORT_PRESET_SIZES: Readonly<
  Record<
    Exclude<ViewportPreset, "fit" | "custom">,
    { width: number; height: number; mobile: boolean }
  >
> = {
  mobile: { width: 390, height: 844, mobile: true },
  tablet: { width: 768, height: 1024, mobile: false },
  desktop: { width: 1280, height: 800, mobile: false },
};

export class ServiceHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ServiceHttpError";
    this.status = status;
  }
}

export class SessionHub {
  private readonly records = new Map<string, SessionStreamRecord>();
  private readonly devtools = new DevToolsSurfaceController();
  private activeSession: string | null = null;
  private sessionPinned = false;
  private mode: SurfaceInspectMode = "viewport";
  private viewportPreset: ViewportPreset = "fit";
  private customViewport = { width: 1280, height: 800 };
  private panelFitSize = { width: 1280, height: 800 };
  private viewerScale: ViewerScale = 1;
  private colorScheme: "dark" | "light" = "dark";
  private selectCompatibility = false;
  private harRecording = false;
  private lastHarPath: string | null = null;
  private dashboardPort = 4848;
  private dashboardRunning = false;
  private controller: SurfaceController = "none";
  private controllingViewer: string | null = null;

  private surfaceSeq = 0;
  private viewGeneration = 1;
  private firstSeqOfCurrentView = 1;
  private currentSurfaceFrame: LiveFrame | null = null;
  private readonly frameWaiters = new Set<FrameWaiter>();
  private lastViewerPollAt = 0;

  private eventSeq = 1;
  private pickRefsCache: Record<string, { role?: string; name?: string }> = {};
  private lastPickHoverAt = 0;
  private hoverInFlight = false;

  private readonly statusCloseMap = new Map<string, string>();
  private readonly pendingSessions = new Set<string>();
  private readonly seedInFlight = new Set<string>();
  private lastInstructionsText = "";
  private emitStateTimer: ReturnType<typeof setTimeout> | null = null;
  private emitStatePriority = false;
  private emitWindowStart = 0;
  private emitCountInWindow = 0;
  private discoveryTimer: ReturnType<typeof setInterval> | null = null;

  private readonly serviceHost: ServiceHost | null;
  private readonly dataDir: string;

  constructor(options: {
    readonly serviceHost: ServiceHost | null;
    readonly dataDir: string;
  }) {
    this.serviceHost = options.serviceHost;
    this.dataDir = options.dataDir;
  }

  start(): void {
    void this.refreshSessions();
    this.discoveryTimer = setInterval(() => {
      void this.refreshSessions();
    }, 2000);
    this.discoveryTimer.unref?.();
  }

  async dispose(): Promise<void> {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    if (this.emitStateTimer) {
      clearTimeout(this.emitStateTimer);
      this.emitStateTimer = null;
    }
    for (const waiter of this.frameWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.frameWaiters.clear();
    await this.devtools.close();
    for (const [, rec] of this.records) {
      rec.ws?.terminate();
      rec.ws = null;
    }
    this.records.clear();
  }

  isSessionUserControlled(session: string): boolean {
    return this.controller === "user" && this.activeSession === session;
  }

  markAgentActive(session: string): void {
    const rec = this.records.get(session);
    if (rec) {
      rec.agentActiveUntil = Date.now() + AGENT_ACTIVE_WINDOW_MS;
    }
  }

  isActiveSurfaceAgentDriving(): boolean {
    if (!this.activeSession) return false;
    const rec = this.records.get(this.activeSession);
    return Boolean(rec && rec.agentActiveUntil > Date.now());
  }

  getConsoleProblems(session: string): readonly BrowserConsoleProblem[] {
    const rec = this.records.get(session);
    if (!rec) return [];
    return rec.consoleEvents
      .filter(
        (e) =>
          e.level === "warn" || e.level === "error" || e.kind === "page_error",
      )
      .slice(-50)
      .map((e) => ({
        level: e.level === "warn" ? "warning" : "error",
        message: e.text,
        source: e.kind === "page_error" ? "exception" : "console",
      }));
  }

  private bumpViewFence(): void {
    this.viewGeneration += 1;
    this.firstSeqOfCurrentView = this.surfaceSeq + 1;
    this.currentSurfaceFrame = null;
  }

  checkFrameFence(frameSeqHeader: string | undefined): boolean {
    if (!frameSeqHeader) return true;
    const seq = Number(frameSeqHeader);
    if (!Number.isFinite(seq) || seq <= 0) return true;
    return seq >= this.firstSeqOfCurrentView;
  }

  private publishSurfaceFrame(
    bytes: Buffer,
    width: number,
    height: number,
    title: string,
    upstreamSeq = 0,
  ): void {
    this.surfaceSeq += 1;
    const frame: LiveFrame = {
      seq: this.surfaceSeq,
      upstreamSeq,
      bytes,
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      title: title
        .replace(/[^\x20-\x7E]/g, " ")
        .trim()
        .slice(0, 200),
    };
    this.currentSurfaceFrame = frame;
    const matched: FrameWaiter[] = [];
    for (const waiter of this.frameWaiters) {
      if (frame.seq > waiter.afterSeq) {
        matched.push(waiter);
      }
    }
    for (const waiter of matched) {
      this.frameWaiters.delete(waiter);
      clearTimeout(waiter.timer);
      waiter.resolve(frame);
    }
  }

  private ackUpstreamIfViewerActive(
    rec: SessionStreamRecord,
    seq: number,
  ): void {
    if (
      this.mode !== "devtools" &&
      this.activeSession === rec.daemon.session &&
      Date.now() - this.lastViewerPollAt < 30000 &&
      rec.ws?.readyState === WebSocket.OPEN &&
      seq > rec.ackedUpstreamSeq
    ) {
      rec.ackedUpstreamSeq = seq;
      rec.ws.send(JSON.stringify({ type: "ack", seq }));
    }
  }

  async waitForSurfaceFrame(
    afterSeq: number,
    waitMs: number,
  ): Promise<LiveFrame | null> {
    const wasColdViewer = Date.now() - this.lastViewerPollAt >= 30000;
    this.lastViewerPollAt = Date.now();

    if (this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        this.ensureSessionWebSocket(rec);
        if (wasColdViewer && rec.latestUpstreamFrame) {
          this.ackUpstreamIfViewerActive(rec, rec.latestUpstreamFrame.seq);
        }
        if (
          this.mode !== "devtools" &&
          (!this.currentSurfaceFrame ||
            this.currentSurfaceFrame.seq < this.firstSeqOfCurrentView)
        ) {
          if (rec.latestUpstreamFrame) {
            this.publishSurfaceFrame(
              rec.latestUpstreamFrame.bytes,
              rec.latestUpstreamFrame.width,
              rec.latestUpstreamFrame.height,
              rec.title || rec.url || rec.daemon.session,
              rec.latestUpstreamFrame.seq,
            );
          } else {
            void this.seedInitialScreenshot(rec);
          }
        }
      }
    }

    if (this.currentSurfaceFrame && this.currentSurfaceFrame.seq > afterSeq) {
      if (this.activeSession) {
        const rec = this.records.get(this.activeSession);
        if (rec && this.currentSurfaceFrame.upstreamSeq > 0) {
          this.ackUpstreamIfViewerActive(
            rec,
            this.currentSurfaceFrame.upstreamSeq,
          );
        }
      }
      return this.currentSurfaceFrame;
    }

    const boundedWait = Math.max(50, Math.min(25000, waitMs));
    return new Promise((resolve) => {
      const waiter: FrameWaiter = {
        afterSeq,
        resolve,
        timer: setTimeout(() => {
          this.frameWaiters.delete(waiter);
          resolve(null);
        }, boundedWait),
      };
      this.frameWaiters.add(waiter);
    });
  }

  private async seedInitialScreenshot(rec: SessionStreamRecord): Promise<void> {
    if (this.seedInFlight.has(rec.daemon.session)) return;
    this.seedInFlight.add(rec.daemon.session);
    try {
      const dir = path.join(this.dataDir || os.tmpdir(), "seed");
      fs.mkdirSync(dir, { recursive: true });
      const tmpFile = path.join(
        dir,
        `seed-${rec.daemon.session}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
      );
      const shot = await sendDaemonSocketCommand<{ path?: string }>(
        rec.daemon.sockPath,
        "screenshot",
        { path: tmpFile, format: "jpeg", quality: 80 },
        5000,
      );
      if (!shot.success) return;
      const actual = shot.data?.path || tmpFile;
      const bytes = fs.readFileSync(actual);
      try {
        fs.unlinkSync(actual);
      } catch {
        // Ignore cleanup failure.
      }
      if (
        this.activeSession === rec.daemon.session &&
        this.mode !== "devtools"
      ) {
        rec.latestUpstreamFrame = {
          seq: rec.latestUpstreamFrame?.seq ?? 1,
          bytes,
          width: rec.viewportWidth * this.viewerScale,
          height: rec.viewportHeight * this.viewerScale,
        };
        this.publishSurfaceFrame(
          bytes,
          rec.viewportWidth * this.viewerScale,
          rec.viewportHeight * this.viewerScale,
          rec.title || rec.url || rec.daemon.session,
          rec.latestUpstreamFrame.seq,
        );
      }
    } catch {
      // Daemon may still be launching Chrome.
    } finally {
      this.seedInFlight.delete(rec.daemon.session);
    }
  }

  async refreshSessions(
    options: {
      readonly skipAutoSelect?: boolean;
      readonly skipDashboardCheck?: boolean;
      readonly preferredSession?: string;
      readonly followPreferred?: boolean;
    } = {},
  ): Promise<void> {
    const readTargetId = (daemon: DiscoveredDaemonSession): string | null => {
      try {
        const raw = fs.readFileSync(
          path.join(daemon.socketDir, `${daemon.session}.target`),
          "utf8",
        );
        const parsed = JSON.parse(raw) as { targetId?: unknown };
        return typeof parsed.targetId === "string" && parsed.targetId
          ? parsed.targetId
          : null;
      } catch {
        return null;
      }
    };

    const discovered = discoverDaemonSessions();
    const seen = new Set<string>();
    let changed = false;

    for (const daemon of discovered) {
      seen.add(daemon.session);
      const targetId = readTargetId(daemon);
      const existing = this.records.get(daemon.session);
      if (!existing) {
        const rec: SessionStreamRecord = {
          daemon,
          lastTargetId: targetId,
          ws: null,
          connecting: false,
          connected: true,
          screencasting: false,
          recording: false,
          url: "",
          title: "",
          viewportWidth: 1280,
          viewportHeight: 800,
          tabs: [],
          activity: [],
          consoleEvents: [],
          latenciesMs: [],
          latestUpstreamFrame: null,
          ackedUpstreamSeq: 0,
          agentActiveUntil: 0,
          clickTracker: INITIAL_CLICK_TRACKER,
        };
        this.records.set(daemon.session, rec);
        this.ensureSessionWebSocket(rec);
        if (!options.skipAutoSelect) {
          void this.hydrateSessionMetadata(rec);
        }
        changed = true;
      } else if (
        existing.daemon.streamPort !== daemon.streamPort ||
        existing.daemon.pid !== daemon.pid
      ) {
        existing.ws?.terminate();
        existing.ws = null;
        existing.daemon = daemon;
        existing.lastTargetId = targetId;
        this.ensureSessionWebSocket(existing);
        if (!options.skipAutoSelect) {
          void this.hydrateSessionMetadata(existing);
        }
        changed = true;
      } else {
        if (targetId && targetId !== existing.lastTargetId) {
          existing.lastTargetId = targetId;
          if (!options.skipAutoSelect) {
            void this.hydrateSessionMetadata(existing);
          }
        }
        if (!existing.ws && !existing.connecting) {
          this.ensureSessionWebSocket(existing);
        }
      }
    }

    for (const [name, rec] of this.records) {
      if (!seen.has(name)) {
        rec.ws?.terminate();
        this.records.delete(name);
        changed = true;
      }
    }

    if (this.activeSession && !this.records.has(this.activeSession)) {
      if (this.mode === "devtools") {
        await this.devtools.close();
      }
      this.mode = "viewport";
      this.sessionPinned = false;
      const preferred =
        options.preferredSession && this.records.has(options.preferredSession)
          ? options.preferredSession
          : null;
      this.activeSession = preferred ?? discovered[0]?.session ?? null;
      this.bumpViewFence();
      changed = true;
    } else if (
      !options.skipAutoSelect &&
      !this.activeSession &&
      discovered.length > 0
    ) {
      const preferred =
        options.preferredSession && this.records.has(options.preferredSession)
          ? options.preferredSession
          : null;
      this.activeSession = preferred ?? discovered[0]?.session ?? null;
      this.bumpViewFence();
      if (this.activeSession) {
        const autoRec = this.records.get(this.activeSession);
        if (autoRec && !autoRec.latestUpstreamFrame) {
          void this.seedInitialScreenshot(autoRec);
        }
      }
      changed = true;
    } else if (
      !options.skipAutoSelect &&
      options.followPreferred &&
      options.preferredSession &&
      this.records.has(options.preferredSession) &&
      this.activeSession !== options.preferredSession &&
      this.controller !== "user" &&
      !this.sessionPinned
    ) {
      await this.activateSession(options.preferredSession);
    }

    if (!options.skipDashboardCheck) {
      const dash = await checkDashboardServer(process.env, this.dashboardPort);
      if (dash.running !== this.dashboardRunning) {
        this.dashboardRunning = dash.running;
        changed = true;
      }
    }

    if (changed) {
      this.scheduleStateEmit(true);
      void this.syncInstructions();
    }
  }

  private async hydrateSessionMetadata(
    rec: SessionStreamRecord,
  ): Promise<void> {
    try {
      const [tabsRes, urlRes, titleRes] = await Promise.allSettled([
        fetch(`http://127.0.0.1:${rec.daemon.streamPort}/api/tabs`, {
          signal: AbortSignal.timeout(1500),
        }),
        sendDaemonSocketCommand<{ url?: string }>(
          rec.daemon.sockPath,
          "url",
          {},
          2000,
        ),
        sendDaemonSocketCommand<{ title?: string }>(
          rec.daemon.sockPath,
          "title",
          {},
          2000,
        ),
      ]);
      let updated = false;
      if (tabsRes.status === "fulfilled" && tabsRes.value.ok) {
        const rawTabs = (await tabsRes.value.json()) as Array<
          Record<string, unknown>
        >;
        if (Array.isArray(rawTabs)) {
          rec.tabs = rawTabs.map((t, idx) => ({
            tabId: asString(t.tabId, `t${idx + 1}`),
            title: asString(t.title),
            url: redactUrl(asString(t.url)),
            type: asString(t.type, "page"),
            active: Boolean(t.active),
          }));
          const active = rec.tabs.find((t) => t.active);
          if (active) {
            rec.url = active.url;
            rec.title = active.title;
          }
          updated = true;
        }
      }
      if (
        urlRes.status === "fulfilled" &&
        urlRes.value.success &&
        typeof urlRes.value.data?.url === "string"
      ) {
        rec.url = redactUrl(urlRes.value.data.url);
        updated = true;
      }
      if (
        titleRes.status === "fulfilled" &&
        titleRes.value.success &&
        typeof titleRes.value.data?.title === "string"
      ) {
        rec.title = titleRes.value.data.title;
        updated = true;
      }
      if (updated) {
        this.scheduleStateEmit();
        void this.syncInstructions();
      }
    } catch {
      // Metadata hydration is opportunistic.
    }
  }

  private ensureSessionWebSocket(rec: SessionStreamRecord): void {
    if (rec.ws || rec.connecting) return;
    rec.connecting = true;
    const wsUrl = `ws://127.0.0.1:${rec.daemon.streamPort}/?pacing=ack&maxFps=24`;
    const ws = new WebSocket(wsUrl, {
      maxPayload: 32 * 1024 * 1024,
      perMessageDeflate: false,
    });

    ws.once("open", () => {
      rec.connecting = false;
      rec.ws = ws;
      rec.ackedUpstreamSeq = 0;
    });

    ws.on("message", (data: RawData, isBinary: boolean) => {
      if (isBinary) return;
      const utf8 = Buffer.isBuffer(data)
        ? data.toString("utf8")
        : Array.isArray(data)
          ? Buffer.concat(data).toString("utf8")
          : Buffer.from(data).toString("utf8");
      this.handleStreamWsMessage(rec, utf8);
    });

    const cleanup = () => {
      rec.connecting = false;
      if (rec.ws === ws) {
        rec.ws = null;
      }
    };
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  }

  private handleStreamWsMessage(rec: SessionStreamRecord, raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = asString(msg.type);

    if (type === "frame") {
      const b64 = typeof msg.data === "string" ? msg.data : "";
      const seq = Number(msg.seq) || 1;
      if (!b64) return;
      const meta = (msg.metadata as Record<string, unknown> | undefined) ?? {};
      const w = Number(meta.deviceWidth) || rec.viewportWidth || 1280;
      const h = Number(meta.deviceHeight) || rec.viewportHeight || 800;
      const bytes = Buffer.from(b64, "base64");
      rec.latestUpstreamFrame = {
        seq,
        bytes,
        width: w * this.viewerScale,
        height: h * this.viewerScale,
      };
      if (
        this.activeSession === rec.daemon.session &&
        this.mode !== "devtools"
      ) {
        this.publishSurfaceFrame(
          bytes,
          w * this.viewerScale,
          h * this.viewerScale,
          rec.title || rec.url || rec.daemon.session,
          seq,
        );
        this.ackUpstreamIfViewerActive(rec, seq);
      }
      return;
    }

    if (type === "status") {
      rec.connected = Boolean(msg.connected);
      rec.screencasting = Boolean(msg.screencasting);
      rec.recording = Boolean(msg.recording);
      if (typeof msg.viewportWidth === "number" && msg.viewportWidth > 0) {
        rec.viewportWidth = msg.viewportWidth;
      }
      if (typeof msg.viewportHeight === "number" && msg.viewportHeight > 0) {
        rec.viewportHeight = msg.viewportHeight;
      }
      this.scheduleStateEmit();
      return;
    }

    if (type === "url") {
      const nextUrl = redactUrl(asString(msg.url));
      if (nextUrl && nextUrl !== rec.url) {
        rec.url = nextUrl;
        this.scheduleStateEmit();
        void this.syncInstructions();
      }
      return;
    }

    if (type === "tabs" && Array.isArray(msg.tabs)) {
      const prevActive = rec.tabs.find((t) => t.active)?.tabId ?? null;
      const prevUrl = rec.url;
      rec.tabs = (msg.tabs as Array<Record<string, unknown>>).map((t, idx) => ({
        tabId: asString(t.tabId, `t${idx + 1}`),
        title: asString(t.title),
        url: redactUrl(asString(t.url)),
        type: asString(t.type, "page"),
        active: Boolean(t.active),
      }));
      const active = rec.tabs.find((t) => t.active);
      if (active) {
        rec.url = active.url;
        rec.title = active.title;
        if (
          this.activeSession === rec.daemon.session &&
          prevActive &&
          prevActive !== active.tabId
        ) {
          this.bumpViewFence();
        }
      }
      this.scheduleStateEmit();
      if (rec.url !== prevUrl || prevActive !== active?.tabId) {
        void this.syncInstructions();
      }
      return;
    }

    if (type === "command") {
      const id = asString(msg.id, `cmd-${this.eventSeq}`);
      const action = asString(msg.action, "command");
      const rawParams =
        (msg.params as Record<string, unknown> | undefined) ?? {};
      const safeParams =
        (redactUnknown(rawParams) as Record<string, unknown>) ?? {};
      const item: ActivityEventItem = {
        seq: this.eventSeq++,
        id,
        session: rec.daemon.session,
        action,
        params: safeParams,
        status: "running",
        durationMs: null,
        dataPreview: null,
        startedAt: Number(msg.timestamp) || Date.now(),
        finishedAt: null,
      };
      rec.agentActiveUntil = Date.now() + AGENT_ACTIVE_WINDOW_MS;
      rec.activity = [...rec.activity.slice(-(MAX_ACTIVITY_EVENTS - 1)), item];
      this.emitPush("activity", item);
      this.scheduleStateEmit();
      return;
    }

    if (type === "result") {
      const id = asString(msg.id);
      const action = asString(msg.action, "command");
      // agent-browser <=0.43.0 checks resp["status"] == "success" instead of resp["success"] == true
      // when broadcasting WS results, sending success: false with non-null data on succeeded commands
      // and data: null when error_response() ran.
      const hasError =
        msg.error !== undefined && msg.error !== null && msg.error !== "";
      const success = hasError
        ? false
        : msg.success === true
          ? true
          : msg.data !== null && msg.data !== undefined;
      const durationMs =
        typeof msg.duration_ms === "number"
          ? Math.round(msg.duration_ms)
          : null;
      const finishedAt = Number(msg.timestamp) || Date.now();
      const preview = formatPreviewJson(hasError ? msg.error : msg.data, 900);

      if (durationMs !== null && durationMs >= 0) {
        rec.latenciesMs = [
          ...rec.latenciesMs.slice(-(MAX_LATENCY_POINTS - 1)),
          durationMs,
        ];
      }

      const existingIdx = rec.activity.findLastIndex((a) => a.id === id);
      let updatedItem: ActivityEventItem;
      if (existingIdx >= 0) {
        const prev = rec.activity[existingIdx]!;
        updatedItem = {
          ...prev,
          status: success ? "ok" : "error",
          durationMs,
          dataPreview: preview,
          finishedAt,
        };
        rec.activity = rec.activity.map((entry, idx) =>
          idx === existingIdx ? updatedItem : entry,
        );
      } else {
        updatedItem = {
          seq: this.eventSeq++,
          id: id || `res-${this.eventSeq}`,
          session: rec.daemon.session,
          action,
          params: {},
          status: success ? "ok" : "error",
          durationMs,
          dataPreview: preview,
          startedAt: finishedAt - (durationMs ?? 0),
          finishedAt,
        };
        rec.activity = [
          ...rec.activity.slice(-(MAX_ACTIVITY_EVENTS - 1)),
          updatedItem,
        ];
      }
      this.emitPush("activity", updatedItem);
      this.scheduleStateEmit();
      return;
    }

    if (type === "console" || type === "page_error") {
      const rawLevel = asString(
        msg.level,
        type === "page_error" ? "error" : "log",
      ).toLowerCase();
      const level: ConsoleEventItem["level"] =
        rawLevel === "warn" || rawLevel === "warning"
          ? "warn"
          : rawLevel === "error"
            ? "error"
            : rawLevel === "info"
              ? "info"
              : rawLevel === "debug"
                ? "debug"
                : "log";
      const argsRaw = Array.isArray(msg.args) ? msg.args : [];
      const argsPreview = argsRaw
        .slice(0, 8)
        .map((arg) => formatPreviewJson(arg, 300) ?? "")
        .filter(Boolean);

      const entry: ConsoleEventItem = {
        seq: this.eventSeq++,
        session: rec.daemon.session,
        kind: type === "page_error" ? "page_error" : "console",
        level,
        text: redactText(asString(msg.text), 1500),
        argsPreview,
        line: typeof msg.line === "number" ? msg.line : null,
        column: typeof msg.column === "number" ? msg.column : null,
        timestamp: Number(msg.timestamp) || Date.now(),
      };
      rec.consoleEvents = [
        ...rec.consoleEvents.slice(-(MAX_CONSOLE_EVENTS - 1)),
        entry,
      ];
      this.emitPush("console", entry);
      this.scheduleStateEmit();
    }
  }

  private emitPush(topic: string, data: unknown, priority = false): void {
    if (!this.serviceHost) return;
    if (!priority) {
      const now = Date.now();
      if (now - this.emitWindowStart >= 1000) {
        this.emitWindowStart = now;
        this.emitCountInWindow = 0;
      }
      if (this.emitCountInWindow >= 16) return;
      this.emitCountInWindow += 1;
    }
    void this.serviceHost.emit(topic, data as never).catch(() => {});
  }

  scheduleStateEmit(priority = false): void {
    if (priority) {
      this.emitStatePriority = true;
    }
    if (this.emitStateTimer) return;
    this.emitStateTimer = setTimeout(() => {
      const highPriority = this.emitStatePriority;
      this.emitStateTimer = null;
      this.emitStatePriority = false;
      this.emitPush("state", this.getDockState(), highPriority);
    }, 80);
    this.emitStateTimer.unref?.();
  }

  private async syncInstructions(): Promise<void> {
    if (!this.serviceHost) return;
    const summaries = this.buildSessionSummaries();
    const sessionList = summaries
      .slice(0, 5)
      .map(
        (s) =>
          `${s.session} (${s.url || "about:blank"}${s.errorCount > 0 ? `, ${s.errorCount} console errors` : ""})`,
      )
      .join("; ");
    const nextText =
      summaries.length === 0
        ? ""
        : [
            `Active agent-browser sessions: ${sessionList}.`,
            `Two browser surfaces: openchamber_web uses OpenChamber's configured Browser Provider (either "builtin" in-app tab, or agent-browser session oc-<sessionId[:16]> returned in data.session); manual/panel sessions (e.g. "default", "session-2") are separate and cannot be driven by openchamber_web.`,
            `Safe read-only CLI inspection (avoids proxy/proxy-bypass Chrome relaunches caused by OpenChamber stripping NO_PROXY/HTTP_PROXY from service env): run \`env -u NO_PROXY -u no_proxy -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy -u ALL_PROXY -u all_proxy agent-browser --session <name> <network requests --filter <pat> --json | network request <id> --json | cookies get --json | storage local --json | get url>\` (CLI returns unredacted headers/tokens; Observatory UI and @Browser mentions redact secrets).`,
            `Note: shell-only AGENT_BROWSER_* launch overrides outside ~/.agent-browser/config.json can also relaunch an extension-started daemon's Chrome to about:blank.`,
          ]
            .join(" ")
            .slice(0, 2000);

    if (nextText === this.lastInstructionsText) return;
    this.lastInstructionsText = nextText;
    await this.serviceHost.setInstructions(null, nextText).catch(() => {});
  }

  private buildSessionSummaries(): AgentBrowserSessionSummary[] {
    return [...this.records.values()].map((rec) => {
      const activeTab = rec.tabs.find((t) => t.active) ?? rec.tabs[0] ?? null;
      const lastAct = rec.activity.at(-1) ?? null;
      const selectorOrTarget = lastAct
        ? asString(
            lastAct.params.selector ?? lastAct.params.url ?? lastAct.params.key,
          ) || null
        : null;
      const lastCommand: ActivitySummary | null = lastAct
        ? {
            action: lastAct.action,
            status: lastAct.status,
            durationMs: lastAct.durationMs,
            selectorOrTarget,
            timestamp: lastAct.finishedAt ?? lastAct.startedAt,
          }
        : null;
      const errorCount = rec.consoleEvents.filter(
        (c) => c.level === "error" || c.kind === "page_error",
      ).length;
      const warningCount = rec.consoleEvents.filter(
        (c) => c.level === "warn",
      ).length;

      return {
        session: rec.daemon.session,
        port: rec.daemon.streamPort,
        pid: rec.daemon.pid,
        engine: rec.daemon.engine,
        provider: rec.daemon.provider,
        connected: rec.connected,
        screencasting: rec.screencasting,
        recording: rec.recording,
        url: rec.url || activeTab?.url || "",
        title: rec.title || activeTab?.title || "",
        viewportWidth: rec.viewportWidth,
        viewportHeight: rec.viewportHeight,
        tabs: rec.tabs,
        activeTabId: activeTab?.tabId ?? null,
        commandCount: rec.activity.length,
        errorCount,
        warningCount,
        lastCommand,
        canInspectDevTools:
          rec.daemon.engine === "chrome" && rec.daemon.provider === null,
      };
    });
  }

  getDockState(): DockStateSnapshot {
    const sessions = this.buildSessionSummaries();
    const activeRec = this.activeSession
      ? (this.records.get(this.activeSession) ?? null)
      : null;
    return {
      sessions,
      activeSession: this.activeSession,
      sessionPinned: this.sessionPinned,
      mode: this.mode,
      viewportPreset: this.viewportPreset,
      customViewport: this.customViewport,
      viewerScale: this.viewerScale,
      selectCompatibility: this.selectCompatibility,
      harRecording: this.harRecording,
      lastHarPath: this.lastHarPath,
      dashboardUrl: `http://localhost:${this.dashboardPort}`,
      dashboardRunning: this.dashboardRunning,
      controller: this.controller,
      viewGeneration: this.viewGeneration,
      recentActivity: activeRec ? activeRec.activity.slice(-40) : [],
      recentConsole: activeRec ? activeRec.consoleEvents.slice(-40) : [],
    };
  }

  getObservatorySnapshot(sessionOverride?: string | null): ObservatorySnapshot {
    const state = this.getDockState();
    const targetName = sessionOverride ?? this.activeSession;
    const rec = targetName ? (this.records.get(targetName) ?? null) : null;
    return {
      state,
      activity: rec ? rec.activity : [],
      consoleEvents: rec ? rec.consoleEvents : [],
    };
  }

  setControlState(controller: SurfaceController, viewer?: string): void {
    this.controller = controller;
    this.controllingViewer = controller === "user" ? (viewer ?? null) : null;
    this.scheduleStateEmit();
  }

  async resizeSurface(
    width: number,
    height: number,
  ): Promise<{ width: number; height: number }> {
    const cssW = Math.max(
      320,
      Math.min(3840, Math.round(width / this.viewerScale)),
    );
    const cssH = Math.max(
      240,
      Math.min(2400, Math.round(height / this.viewerScale)),
    );
    this.panelFitSize = { width: cssW, height: cssH };

    if (this.mode === "devtools" && this.devtools.isOpen) {
      await this.devtools.resize(cssW, cssH, this.viewerScale);
      return {
        width: cssW * this.viewerScale,
        height: cssH * this.viewerScale,
      };
    }

    if (this.viewportPreset === "fit" && this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        await sendDaemonSocketCommand(
          rec.daemon.sockPath,
          "viewport",
          { width: cssW, height: cssH, deviceScaleFactor: 1, mobile: false },
          4000,
        ).catch(() => {});
        rec.viewportWidth = cssW;
        rec.viewportHeight = cssH;
      }
    }
    return { width: cssW * this.viewerScale, height: cssH * this.viewerScale };
  }

  async readClipboard(): Promise<string> {
    if (this.mode === "devtools" && this.devtools.isOpen) {
      return this.devtools.clipboardText;
    }
    if (!this.activeSession) return "";
    const rec = this.records.get(this.activeSession);
    if (!rec) return "";
    try {
      const res = await sendDaemonSocketCommand<{ text?: string }>(
        rec.daemon.sockPath,
        "clipboard",
        { operation: "read" },
        3000,
      );
      if (res.success && typeof res.data?.text === "string") {
        return res.data.text.slice(0, 32000);
      }
      const selRes = await sendDaemonSocketCommand<{ result?: string }>(
        rec.daemon.sockPath,
        "evaluate",
        { script: 'String(window.getSelection?.() || "")' },
        2000,
      );
      return String(selRes.data?.result ?? "").slice(0, 32000);
    } catch {
      return "";
    }
  }

  async handleSurfaceInput(
    events: readonly SurfaceInputEvent[],
  ): Promise<void> {
    if (this.mode === "devtools" && this.devtools.isOpen) {
      await this.devtools.dispatchSurfaceInput(events);
      return;
    }

    if (!this.activeSession) return;
    const rec = this.records.get(this.activeSession);
    if (!rec) return;

    if (this.mode === "pick") {
      await this.handlePickModeInput(rec, events);
      return;
    }

    this.ensureSessionWebSocket(rec);
    if (rec.ws?.readyState !== WebSocket.OPEN) return;

    const frameW =
      this.currentSurfaceFrame?.width || rec.viewportWidth * this.viewerScale;
    const frameH =
      this.currentSurfaceFrame?.height || rec.viewportHeight * this.viewerScale;

    const { messages, tracker } = translateSurfaceEventsToWsMessages(
      events,
      {
        frameWidth: frameW,
        frameHeight: frameH,
        viewportWidth: rec.viewportWidth,
        viewportHeight: rec.viewportHeight,
      },
      rec.clickTracker,
    );
    rec.clickTracker = tracker;

    for (const message of messages) {
      rec.ws.send(JSON.stringify(message));
    }
  }

  private async handlePickModeInput(
    rec: SessionStreamRecord,
    events: readonly SurfaceInputEvent[],
  ): Promise<void> {
    const frameW =
      this.currentSurfaceFrame?.width || rec.viewportWidth * this.viewerScale;
    const frameH =
      this.currentSurfaceFrame?.height || rec.viewportHeight * this.viewerScale;

    for (const event of events) {
      if (
        event.type === "key" &&
        event.action === "down" &&
        event.key === "Escape"
      ) {
        await this.setInspectMode("viewport");
        return;
      }

      if (event.type === "pointer") {
        const cssX = scaleCoordinate(event.x, frameW, rec.viewportWidth);
        const cssY = scaleCoordinate(event.y, frameH, rec.viewportHeight);

        if (event.action === "down" && event.button === 0) {
          const pickedRes = await sendDaemonSocketCommand<{
            result?: PickedElementPayload | null;
          }>(
            rec.daemon.sockPath,
            "evaluate",
            {
              script: buildCapturePickedElementScript(
                cssX,
                cssY,
                rec.daemon.session,
                this.pickRefsCache,
              ),
            },
            5000,
          ).catch(() => null);

          this.mode = "viewport";
          this.scheduleStateEmit();

          const picked = pickedRes?.data?.result ?? null;
          if (picked) {
            this.emitPush("element-picked", picked, true);
          }
          return;
        }

        if (
          event.action === "move" &&
          !this.hoverInFlight &&
          Date.now() - this.lastPickHoverAt >= 55
        ) {
          this.lastPickHoverAt = Date.now();
          this.hoverInFlight = true;
          void sendDaemonSocketCommand(
            rec.daemon.sockPath,
            "evaluate",
            { script: buildHoverPickScript(cssX, cssY, this.pickRefsCache) },
            1500,
          )
            .catch(() => {})
            .finally(() => {
              this.hoverInFlight = false;
            });
        }
      }
    }
  }

  private async activateSession(
    session: string,
    options: { readonly forceRefreshView?: boolean } = {},
  ): Promise<void> {
    if (!this.records.has(session)) {
      throw new Error(`Session "${session}" is not running`);
    }
    const switching = this.activeSession !== session;
    if (switching || options.forceRefreshView) {
      if (this.mode === "devtools") {
        await this.devtools.close();
      } else if (this.mode === "pick" && this.activeSession) {
        const oldRec = this.records.get(this.activeSession);
        if (oldRec) {
          await sendDaemonSocketCommand(
            oldRec.daemon.sockPath,
            "evaluate",
            { script: CLEAR_PICK_OVERLAY_SCRIPT },
            1500,
          ).catch(() => {});
        }
      }
      this.mode = "viewport";
      this.activeSession = session;
      this.bumpViewFence();
      const rec = this.records.get(session)!;
      if (rec.latestUpstreamFrame) {
        this.publishSurfaceFrame(
          rec.latestUpstreamFrame.bytes,
          rec.latestUpstreamFrame.width,
          rec.latestUpstreamFrame.height,
          rec.title || rec.url || session,
          rec.latestUpstreamFrame.seq,
        );
      } else {
        void this.seedInitialScreenshot(rec);
      }
      this.scheduleStateEmit(true);
    }
  }

  async selectSession(session: string): Promise<DockStateSnapshot> {
    await this.refreshSessions();
    if (this.activeSession !== session) {
      this.sessionPinned = false;
    }
    await this.activateSession(session);
    return this.getDockState();
  }

  setSessionPinned(pinned: boolean): DockStateSnapshot {
    this.sessionPinned = pinned && Boolean(this.activeSession);
    this.scheduleStateEmit(true);
    return this.getDockState();
  }

  private normalizeUrlOrThrow(raw?: string, emptyFallback?: string): string {
    try {
      return normalizeNavigationUrl(raw, emptyFallback);
    } catch (err) {
      throw new ServiceHttpError(
        400,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async cleanupOrphanDaemon(session: string): Promise<void> {
    const killPid = (pid: number) => {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        return;
      }
      const killTimer = setTimeout(() => {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // Process already exited.
        }
      }, 400);
      killTimer.unref?.();
    };

    const orphan = discoverDaemonSessions().find((d) => d.session === session);
    if (orphan) {
      await sendDaemonSocketCommand(orphan.sockPath, "close", {}, 1500).catch(
        () => {
          killPid(orphan.pid);
        },
      );
    } else {
      await execAgentBrowserCli(["--session", session, "close"], {
        timeoutMs: 1500,
      }).catch(() => {});
      const lingering = discoverDaemonSessions().find(
        (d) => d.session === session,
      );
      if (lingering) {
        killPid(lingering.pid);
      }
    }
    await this.refreshSessions({ skipDashboardCheck: true }).catch(() => {});
  }

  async createSession(
    name: string,
    url = "https://example.com",
    options: {
      readonly allowExisting?: boolean;
      readonly skipInitialRefresh?: boolean;
    } = {},
  ): Promise<DockStateSnapshot> {
    const clean = sanitizeSessionName(name);
    const targetUrl = this.normalizeUrlOrThrow(url, "about:blank");

    if (!options.skipInitialRefresh) {
      await this.refreshSessions({ skipDashboardCheck: true });
    }
    const existedBefore = this.records.has(clean);
    const isPending = this.pendingSessions.has(clean);
    if ((existedBefore || isPending) && !options.allowExisting) {
      throw new ServiceHttpError(
        409,
        `Session "${clean}" already exists — select it from the session menu or choose a new name.`,
      );
    }

    this.pendingSessions.add(clean);
    try {
      const cliRes = await execAgentBrowserCli(
        ["--session", clean, "open", targetUrl, "--json"],
        { timeoutMs: 12000 },
      );
      const cliErr = extractAgentBrowserCliError(cliRes);
      if (cliErr) {
        throw new Error(cliErr);
      }
      await this.refreshSessions({
        skipAutoSelect: true,
        skipDashboardCheck: true,
      });
      const rec = this.records.get(clean);
      if (!rec) {
        throw new Error(
          `Agent-browser daemon for session "${clean}" did not start.`,
        );
      }
      await this.activateSession(clean, { forceRefreshView: true });
      await this.hydrateSessionMetadata(rec);
      this.scheduleStateEmit(true);
      return this.getDockState();
    } catch (err) {
      if (!existedBefore) {
        await this.cleanupOrphanDaemon(clean);
      }
      throw err;
    } finally {
      this.pendingSessions.delete(clean);
    }
  }

  async closeSession(session: string): Promise<DockStateSnapshot> {
    const rec = this.records.get(session);
    if (rec) {
      if (this.activeSession === session && this.mode === "devtools") {
        await this.devtools.close();
        this.mode = "viewport";
      }
      await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "close",
        {},
        5000,
      ).catch(async () => {
        await execAgentBrowserCli(["--session", session, "close"], {
          timeoutMs: 5000,
        }).catch(() => {});
      });
    }
    await this.refreshSessions();
    return this.getDockState();
  }

  async setInspectMode(
    nextMode: SurfaceInspectMode,
    colorScheme?: "dark" | "light",
  ): Promise<DockStateSnapshot> {
    if (colorScheme) {
      this.colorScheme = colorScheme;
    }
    if (!this.activeSession) {
      throw new Error("Start or select an agent-browser session first");
    }
    const rec = this.records.get(this.activeSession);
    if (!rec) {
      throw new Error(`Session "${this.activeSession}" is unavailable`);
    }

    if (this.mode === nextMode) {
      return this.getDockState();
    }

    if (this.mode === "devtools") {
      await this.devtools.close();
    }
    if (this.mode === "pick") {
      await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "evaluate",
        { script: CLEAR_PICK_OVERLAY_SCRIPT },
        1500,
      ).catch(() => {});
    }

    if (nextMode === "devtools") {
      if (rec.daemon.engine !== "chrome" || rec.daemon.provider !== null) {
        throw new Error(
          "Bundled Chrome DevTools is available only on local Chrome sessions",
        );
      }
      const cdpRes = await sendDaemonSocketCommand<{ cdpUrl?: string }>(
        rec.daemon.sockPath,
        "cdp_url",
        {},
        4000,
      );
      const browserWsUrl = cdpRes.data?.cdpUrl;
      if (!cdpRes.success || !browserWsUrl) {
        throw new Error(
          cdpRes.error || "Could not obtain Chrome CDP WebSocket URL",
        );
      }
      this.mode = "devtools";
      this.bumpViewFence();
      await this.devtools.open({
        browserWsUrl,
        preferredPageUrl: rec.url,
        width: this.panelFitSize.width,
        height: this.panelFitSize.height,
        scale: this.viewerScale,
        colorScheme: this.colorScheme,
        onFrame: (frame) => {
          if (this.mode === "devtools") {
            this.publishSurfaceFrame(
              frame.bytes,
              frame.width,
              frame.height,
              frame.title,
              0,
            );
          }
        },
        onClosed: () => {
          if (this.mode === "devtools") {
            this.mode = "viewport";
            this.bumpViewFence();
            this.scheduleStateEmit();
          }
        },
      });
      this.scheduleStateEmit();
      return this.getDockState();
    }

    if (nextMode === "pick") {
      this.pickRefsCache = {};
      const snapRes = await sendDaemonSocketCommand<{
        refs?: Record<string, { role?: string; name?: string }>;
      }>(
        rec.daemon.sockPath,
        "snapshot",
        { interactive: true, compact: true },
        6000,
      ).catch(() => null);
      if (snapRes?.success && snapRes.data?.refs) {
        this.pickRefsCache = snapRes.data.refs;
      }
      this.mode = "pick";
      this.scheduleStateEmit();
      return this.getDockState();
    }

    this.mode = "viewport";
    this.bumpViewFence();
    if (rec.latestUpstreamFrame) {
      this.publishSurfaceFrame(
        rec.latestUpstreamFrame.bytes,
        rec.latestUpstreamFrame.width,
        rec.latestUpstreamFrame.height,
        rec.title || rec.url || rec.daemon.session,
        rec.latestUpstreamFrame.seq,
      );
    } else {
      void this.seedInitialScreenshot(rec);
    }
    this.scheduleStateEmit();
    return this.getDockState();
  }

  async performNavigation(
    op:
      | "navigate"
      | "back"
      | "forward"
      | "reload"
      | "tab_new"
      | "tab_switch"
      | "tab_close",
    payload: { readonly url?: string; readonly tabId?: string },
  ): Promise<DockStateSnapshot> {
    if (!this.activeSession) {
      if (op === "navigate" && payload.url) {
        const targetUrl = this.normalizeUrlOrThrow(payload.url);
        await this.refreshSessions({ skipDashboardCheck: true });
        if (!this.activeSession) {
          return this.createSession("default", targetUrl, {
            allowExisting: true,
            skipInitialRefresh: true,
          });
        }
      } else {
        throw new Error("No active agent-browser session");
      }
    }
    const rec = this.records.get(this.activeSession!);
    if (!rec) throw new Error(`Session "${this.activeSession}" is not running`);

    if (op === "navigate") {
      const url = this.normalizeUrlOrThrow(payload.url);
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "navigate",
        { url },
        14000,
      );
      if (!res.success)
        throw new Error(res.error || `Navigation to ${url} failed`);
    } else if (op === "tab_new") {
      const tabUrl = payload.url?.trim()
        ? this.normalizeUrlOrThrow(payload.url)
        : undefined;
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "tab_new",
        tabUrl ? { url: tabUrl } : {},
        14000,
      );
      if (!res.success) throw new Error(res.error || "Could not open new tab");
      this.bumpViewFence();
    } else if (op === "tab_switch") {
      if (!payload.tabId) throw new Error("Missing tabId");
      if (this.mode === "devtools") {
        await this.devtools.close();
        this.mode = "viewport";
      }
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "tab_switch",
        { tabId: payload.tabId },
        8000,
      );
      if (!res.success)
        throw new Error(res.error || `Could not switch to ${payload.tabId}`);
      this.bumpViewFence();
    } else if (op === "tab_close") {
      if (!payload.tabId) throw new Error("Missing tabId");
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "tab_close",
        { tabId: payload.tabId },
        8000,
      );
      if (!res.success)
        throw new Error(res.error || `Could not close ${payload.tabId}`);
      this.bumpViewFence();
    } else {
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        op,
        {},
        15000,
      );
      if (!res.success) throw new Error(res.error || `${op} failed`);
    }

    await this.hydrateSessionMetadata(rec);
    return this.getDockState();
  }

  async updateViewportSettings(input: {
    readonly preset?: ViewportPreset;
    readonly width?: number;
    readonly height?: number;
    readonly viewerScale?: ViewerScale;
    readonly colorScheme?: "dark" | "light";
    readonly selectCompatibility?: boolean;
  }): Promise<DockStateSnapshot> {
    if (input.colorScheme) {
      this.colorScheme = input.colorScheme;
    }
    if (
      input.viewerScale === 1 ||
      input.viewerScale === 2 ||
      input.viewerScale === 3
    ) {
      this.viewerScale = input.viewerScale;
    }
    if (input.preset) {
      this.viewportPreset = input.preset;
    }
    if (typeof input.width === "number" && typeof input.height === "number") {
      this.customViewport = {
        width: Math.max(240, Math.min(3840, Math.round(input.width))),
        height: Math.max(240, Math.min(2400, Math.round(input.height))),
      };
    }
    if (typeof input.selectCompatibility === "boolean") {
      this.selectCompatibility = input.selectCompatibility;
    }

    if (this.activeSession) {
      const rec = this.records.get(this.activeSession);
      if (rec) {
        const dims =
          this.viewportPreset === "fit"
            ? { ...this.panelFitSize, mobile: false }
            : this.viewportPreset === "custom"
              ? { ...this.customViewport, mobile: false }
              : VIEWPORT_PRESET_SIZES[this.viewportPreset];

        await sendDaemonSocketCommand(
          rec.daemon.sockPath,
          "viewport",
          {
            width: dims.width,
            height: dims.height,
            deviceScaleFactor: this.viewerScale,
            mobile: dims.mobile,
          },
          6000,
        ).catch(() => {});
        rec.viewportWidth = dims.width;
        rec.viewportHeight = dims.height;

        if (rec.daemon.engine === "chrome" && rec.daemon.provider === null) {
          const cdpRes = await sendDaemonSocketCommand<{ cdpUrl?: string }>(
            rec.daemon.sockPath,
            "cdp_url",
            {},
            3000,
          ).catch(() => null);
          if (cdpRes?.success && cdpRes.data?.cdpUrl) {
            try {
              const cdp = await CdpClient.connect(cdpRes.data.cdpUrl, 3000);
              const target = await findActivePageTarget(cdp, rec.url);
              if (target) {
                const att = await cdp.send(
                  "Target.attachToTarget",
                  { targetId: target.targetId, flatten: true },
                  undefined,
                  3000,
                );
                const sid = asString(att.sessionId);
                if (sid) {
                  await applyScreenScale(cdp, sid, this.viewerScale);
                  if (typeof input.selectCompatibility === "boolean") {
                    await applyBaseSelectCompatibility(
                      cdp,
                      sid,
                      this.selectCompatibility,
                    );
                  }
                  await cdp
                    .send(
                      "Target.detachFromTarget",
                      { sessionId: sid },
                      undefined,
                      2000,
                    )
                    .catch(() => {});
                }
              }
              cdp.close();
            } catch {
              // Keep daemon viewport settings if raw CDP screen scale fails.
            }
          }
        }
      }
    }

    this.scheduleStateEmit();
    return this.getDockState();
  }

  async sendSoftKeyboardDiff(input: {
    readonly backspaces: number;
    readonly text: string;
    readonly enter: boolean;
  }): Promise<void> {
    if (!this.activeSession) return;
    const rec = this.records.get(this.activeSession);
    if (!rec) return;
    const events: SurfaceInputEvent[] = [];
    for (let i = 0; i < Math.min(64, Math.max(0, input.backspaces)); i += 1) {
      events.push({
        type: "key",
        action: "down",
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      });
      events.push({
        type: "key",
        action: "up",
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      });
    }
    if (input.text) {
      events.push({ type: "text", text: input.text });
    }
    if (input.enter) {
      events.push({
        type: "key",
        action: "down",
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      });
      events.push({
        type: "key",
        action: "up",
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      });
    }
    await this.handleSurfaceInput(events);
  }

  async evaluateRepl(
    session: string | null,
    expression: string,
  ): Promise<{ readonly ok: boolean; readonly output: string }> {
    const targetName = session ?? this.activeSession;
    if (!targetName) return { ok: false, output: "No active session selected" };
    const rec = this.records.get(targetName);
    if (!rec)
      return { ok: false, output: `Session "${targetName}" is not running` };

    try {
      const res = await sendDaemonSocketCommand<{ result?: unknown }>(
        rec.daemon.sockPath,
        "evaluate",
        { script: expression },
        6000,
      );
      if (!res.success) {
        return {
          ok: false,
          output: redactText(res.error || "Evaluation failed", 4000),
        };
      }
      const formatted =
        formatPreviewJson(res.data?.result, 4000) ??
        asString(res.data?.result, "undefined");
      return { ok: true, output: formatted };
    } catch (err) {
      return {
        ok: false,
        output: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async listNetworkRequests(
    session: string | null,
    options: { readonly typeFilter?: string; readonly clear?: boolean } = {},
  ): Promise<readonly NetworkRequestItem[]> {
    const targetName = session ?? this.activeSession;
    if (!targetName) return [];
    const rec = this.records.get(targetName);
    if (!rec) return [];

    if (options.clear) {
      await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "requests",
        { clear: true },
        4000,
      ).catch(() => {});
      return [];
    }

    const res = await sendDaemonSocketCommand<{
      requests?: Array<Record<string, unknown>>;
    }>(
      rec.daemon.sockPath,
      "requests",
      options.typeFilter ? { type: options.typeFilter } : {},
      6000,
    ).catch(() => null);

    if (!res?.success || !Array.isArray(res.data?.requests)) return [];
    return res.data.requests.slice(-200).map((item, idx) => ({
      requestId: asString(item.requestId ?? item.request_id, `req-${idx}`),
      method: asString(item.method, "GET"),
      url: redactUrl(asString(item.url)),
      status: typeof item.status === "number" ? item.status : null,
      resourceType: asString(item.resourceType ?? item.resource_type, "other"),
      mimeType:
        typeof item.mimeType === "string"
          ? item.mimeType
          : typeof item.mime_type === "string"
            ? item.mime_type
            : null,
      timestamp: typeof item.timestamp === "number" ? item.timestamp : null,
    }));
  }

  async getNetworkRequestDetail(
    session: string | null,
    requestId: string,
  ): Promise<NetworkRequestDetail | null> {
    const targetName = session ?? this.activeSession;
    if (!targetName || !requestId) return null;
    const rec = this.records.get(targetName);
    if (!rec) return null;

    const res = await sendDaemonSocketCommand<Record<string, unknown>>(
      rec.daemon.sockPath,
      "request_detail",
      { requestId },
      8000,
    ).catch(() => null);
    if (!res?.success || !res.data) return null;
    const d = res.data;
    const mimeType =
      typeof d.mimeType === "string"
        ? d.mimeType
        : typeof d.mime_type === "string"
          ? d.mime_type
          : null;
    return {
      requestId: asString(d.requestId ?? d.request_id, requestId),
      method: asString(d.method, "GET"),
      url: redactUrl(asString(d.url)),
      status: typeof d.status === "number" ? d.status : null,
      resourceType: asString(d.resourceType ?? d.resource_type, "other"),
      mimeType,
      timestamp: typeof d.timestamp === "number" ? d.timestamp : null,
      headers: redactHeaders(
        (d.headers as Record<string, unknown> | undefined) ?? {},
      ),
      responseHeaders: redactHeaders(
        ((d.responseHeaders ?? d.response_headers) as
          Record<string, unknown> | undefined) ?? {},
      ),
      postData: redactBodyText(
        typeof d.postData === "string"
          ? d.postData
          : typeof d.post_data === "string"
            ? d.post_data
            : null,
        null,
        6000,
      ),
      responseBody: redactBodyText(
        typeof d.responseBody === "string" ? d.responseBody : null,
        mimeType,
        8000,
      ),
    };
  }

  async toggleHarRecording(session: string | null): Promise<DockStateSnapshot> {
    const targetName = session ?? this.activeSession;
    if (!targetName) throw new Error("No active session");
    const rec = this.records.get(targetName);
    if (!rec) throw new Error(`Session "${targetName}" is not running`);

    if (!this.harRecording) {
      const harDir = path.join(this.dataDir || os.tmpdir(), "har");
      fs.mkdirSync(harDir, { recursive: true });
      const targetPath = path.join(harDir, `${targetName}-${Date.now()}.har`);
      const res = await sendDaemonSocketCommand(
        rec.daemon.sockPath,
        "har_start",
        { path: targetPath },
        6000,
      );
      if (!res.success)
        throw new Error(res.error || "Could not start HAR capture");
      this.harRecording = true;
      this.lastHarPath = targetPath;
    } else {
      const res = await sendDaemonSocketCommand<{ path?: string }>(
        rec.daemon.sockPath,
        "har_stop",
        {},
        8000,
      );
      this.harRecording = false;
      if (res.success && typeof res.data?.path === "string") {
        this.lastHarPath = res.data.path;
      }
    }
    this.scheduleStateEmit();
    return this.getDockState();
  }

  async getStorageSnapshot(
    session: string | null,
  ): Promise<StorageSnapshot | null> {
    const targetName = session ?? this.activeSession;
    if (!targetName) return null;
    const rec = this.records.get(targetName);
    if (!rec) return null;

    const [cookiesRes, localRes, sessionRes] = await Promise.allSettled([
      sendDaemonSocketCommand<{ cookies?: Array<Record<string, unknown>> }>(
        rec.daemon.sockPath,
        "cookies_get",
        {},
        5000,
      ),
      sendDaemonSocketCommand<{
        entries?: Record<string, unknown>;
        data?: Record<string, unknown>;
      }>(rec.daemon.sockPath, "storage_get", { type: "local" }, 5000),
      sendDaemonSocketCommand<{
        entries?: Record<string, unknown>;
        data?: Record<string, unknown>;
      }>(rec.daemon.sockPath, "storage_get", { type: "session" }, 5000),
    ]);

    const rawCookies =
      cookiesRes.status === "fulfilled" &&
      cookiesRes.value.success &&
      Array.isArray(cookiesRes.value.data?.cookies)
        ? cookiesRes.value.data.cookies
        : [];
    const cookies: CookieSummary[] = rawCookies.slice(0, 100).map((c) => {
      const name = asString(c.name);
      const httpOnly = Boolean(c.httpOnly ?? c.http_only);
      const rawVal = asString(c.value);
      return {
        name,
        value:
          isSensitiveKey(name) || httpOnly ? REDACTED : redactText(rawVal, 180),
        domain: asString(c.domain),
        path: asString(c.path, "/"),
        httpOnly,
        secure: Boolean(c.secure),
        sameSite: c.sameSite ? asString(c.sameSite) : null,
      };
    });

    const normalizeStorage = (
      settled: PromiseSettledResult<{
        readonly success: boolean;
        readonly data?: {
          entries?: Record<string, unknown>;
          data?: Record<string, unknown>;
        };
      }>,
    ): Record<string, string> => {
      if (settled.status !== "fulfilled" || !settled.value.success) return {};
      const entries = (settled.value.data?.entries ??
        settled.value.data?.data ??
        {}) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(entries)
          .slice(0, 100)
          .map(([k, v]) => [
            k,
            isSensitiveKey(k) ? REDACTED : redactText(asString(v), 300),
          ]),
      );
    };

    return {
      session: targetName,
      cookies,
      localStorage: normalizeStorage(localRes),
      sessionStorage: normalizeStorage(sessionRes),
    };
  }

  async startStandaloneDashboard(): Promise<{
    readonly running: boolean;
    readonly url: string;
    readonly error?: string;
  }> {
    const result = await ensureDashboardRunning(this.dashboardPort);
    this.dashboardRunning = result.running;
    this.scheduleStateEmit();
    return {
      running: result.running,
      url: result.url,
      ...(result.error ? { error: result.error } : {}),
    };
  }

  async buildWorkStatusView(): Promise<GuestStatusView> {
    await this.refreshSessions();
    const summaries = this.buildSessionSummaries();
    const dashboardUrl = `http://localhost:${this.dashboardPort}`;
    const clampLabel = (text: string, maxLen: number): string =>
      text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;

    const controls = [
      { kind: "button" as const, id: "new-session", label: "New" },
      ...(!this.dashboardRunning
        ? [
            {
              kind: "button" as const,
              id: "start-dashboard",
              label: `:${this.dashboardPort}`,
            },
          ]
        : []),
    ];

    const dashboardRow: GuestStatusRow | null = this.dashboardRunning
      ? {
          kind: "line",
          id: "dashboard",
          label: "Dashboard",
          dot: "info",
          content: {
            kind: "chips",
            chips: [
              {
                id: "open-dash",
                label: `:${this.dashboardPort}`,
                tone: "info",
                url: dashboardUrl,
              },
            ],
          },
          value: "listening",
          valueTone: "muted",
        }
      : null;

    if (summaries.length === 0) {
      return {
        rows: [
          {
            kind: "note",
            id: "empty",
            text: "No active agent-browser sessions. Run agent-browser open <url> or click New.",
            tone: "muted",
          },
          ...(dashboardRow ? [dashboardRow] : []),
        ],
        controls,
      };
    }

    const toKebabId = (prefix: string, raw: string, idx: number): string => {
      const slug = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 22);
      const body = slug ? `${prefix}-${slug}-${idx}` : `${prefix}-${idx}`;
      return body.slice(0, 40).replace(/-+$/g, "");
    };

    this.statusCloseMap.clear();
    const rows: GuestStatusRow[] = [];
    const maxRowsBeforeFooter = 16 - (dashboardRow ? 1 : 0);
    const includeAllSparklines = summaries.length <= 4;

    for (const [idx, s] of summaries.entries()) {
      const rec = this.records.get(s.session);
      const showSparkline =
        Boolean(rec && rec.latenciesMs.length >= 2) &&
        (includeAllSparklines || s.session === this.activeSession);
      const sessionRowCount = showSparkline ? 3 : 2;
      const remainingAfterThis = summaries.length - idx - 1;
      const reserveOverflowRow = remainingAfterThis > 0 ? 1 : 0;

      if (
        rows.length + sessionRowCount + reserveOverflowRow >
        maxRowsBeforeFooter
      ) {
        const hiddenCount = summaries.length - idx;
        if (rows.length < maxRowsBeforeFooter) {
          rows.push({
            kind: "note",
            id: "more-sessions",
            text: `+${hiddenCount} more active session${hiddenCount === 1 ? "" : "s"} in the Agent Browser panel.`,
            tone: "muted",
          });
        }
        break;
      }

      const pageLabel = (() => {
        if (!s.url) return "about:blank";
        try {
          const u = new URL(s.url);
          const hostAndPath =
            u.host && u.pathname && u.pathname !== "/"
              ? `${u.host}${u.pathname}`
              : u.host || u.pathname || s.url;
          return clampLabel(hostAndPath, 60);
        } catch {
          return clampLabel(s.url, 60);
        }
      })();

      const tabCount = s.tabs.length || 1;
      const cmdValue = s.lastCommand
        ? `${clampLabel(s.lastCommand.action, 10)}${s.lastCommand.durationMs !== null ? ` ${s.lastCommand.durationMs}ms` : ""}`
        : `${tabCount} tab${tabCount === 1 ? "" : "s"}`;

      const closeId = toKebabId("close", s.session, idx);
      this.statusCloseMap.set(closeId, s.session);

      const problemParts: string[] = [];
      if (s.errorCount > 0) problemParts.push(`${s.errorCount} errors`);
      if (s.warningCount > 0) problemParts.push(`${s.warningCount} warnings`);
      const sessionTooltip = clampLabel(
        `${s.session} (${s.engine}, ${tabCount} tab${tabCount === 1 ? "" : "s"}${problemParts.length > 0 ? `, ${problemParts.join(", ")}` : ""})`,
        195,
      );

      // Omit row.content on session and page rows so row.label gets flex-1 min-w-0 truncate
      // inside OpenChamber's 300px Work Status card (276px inner row width, h-7 fixed height).
      rows.push({
        kind: "line",
        id: toKebabId("sess", s.session, idx),
        label: clampLabel(s.session, 60),
        dot:
          s.errorCount > 0
            ? "error"
            : s.warningCount > 0
              ? "warning"
              : s.connected
                ? "success"
                : "muted",
        ...(s.errorCount > 0
          ? {
              badge: {
                label: `${s.errorCount}\u00A0err`,
                tone: "error" as const,
              },
            }
          : s.warningCount > 0
            ? {
                badge: {
                  label: `${s.warningCount}\u00A0warn`,
                  tone: "warning" as const,
                },
              }
            : tabCount > 1
              ? {
                  value: `${tabCount} tabs`,
                  valueTone: "muted" as const,
                }
              : {}),
        tooltip: sessionTooltip,
        actions: [
          {
            kind: "button",
            id: closeId,
            label: "Close",
            variant: "outline",
            confirm: "Close?",
          },
        ],
      });

      rows.push({
        kind: "line",
        id: toKebabId("page", s.session, idx),
        label: pageLabel,
        icon: "global",
        value: clampLabel(cmdValue, 24),
        valueTone: s.lastCommand?.status === "error" ? "error" : "muted",
        tooltip: clampLabel(
          `${s.title ? `${s.title} — ` : ""}${s.url || "about:blank"}${s.lastCommand ? ` · last: ${s.lastCommand.action}` : ""}`,
          195,
        ),
      });

      if (showSparkline && rec) {
        const avg = Math.round(
          rec.latenciesMs.reduce((a, b) => a + b, 0) / rec.latenciesMs.length,
        );
        rows.push({
          kind: "line",
          id: toKebabId("lat", s.session, idx),
          label: "Latency",
          icon: "pulse",
          content: {
            kind: "chart",
            values: rec.latenciesMs,
            unit: "count",
            tone: "accent",
          },
          value: `${avg}ms avg`,
          valueTone: "muted",
          tooltip: clampLabel(
            `${s.session}: ${avg}ms avg across ${rec.latenciesMs.length} commands`,
            195,
          ),
        });
      }
    }

    if (dashboardRow) {
      rows.push(dashboardRow);
    }

    return {
      rows: rows.slice(0, 16),
      controls,
    };
  }

  async handleStatusAction(id: string): Promise<void> {
    if (id === "new-session") {
      await this.refreshSessions({ skipDashboardCheck: true });
      const nextIdx = nextAvailableSessionName([
        ...this.records.keys(),
        ...this.pendingSessions,
      ]);
      await this.createSession(nextIdx, "https://example.com", {
        skipInitialRefresh: true,
      });
      return;
    }
    if (id === "start-dashboard") {
      await this.startStandaloneDashboard();
      return;
    }
    const mappedTarget = this.statusCloseMap.get(id);
    if (mappedTarget) {
      await this.closeSession(mappedTarget);
      return;
    }
    if (id.startsWith("close:")) {
      const target = id.slice("close:".length);
      if (target) {
        await this.closeSession(target);
      }
    }
  }

  searchMentions(query: string): MentionsItem[] {
    const q = query.trim().toLowerCase();
    const summaries = this.buildSessionSummaries();
    const items: MentionsItem[] = [];

    for (const s of summaries) {
      const candidates: MentionsItem[] = [
        {
          id: `${s.session}:snapshot`,
          title: `Browser (${s.session}): Interactive @eN Snapshot`,
          subtitle: `${s.title || s.url || "about:blank"}`.slice(0, 118),
        },
        {
          id: `${s.session}:errors`,
          title: `Browser (${s.session}): Console & Page Errors (${s.errorCount + s.warningCount})`,
          subtitle:
            `Attach recent console warnings, errors, and exceptions`.slice(
              0,
              118,
            ),
        },
        {
          id: `${s.session}:activity`,
          title: `Browser (${s.session}): Command Activity (${s.commandCount})`,
          subtitle:
            `Attach chronological agent-browser commands, durations, and failures`.slice(
              0,
              118,
            ),
        },
        {
          id: `${s.session}:network`,
          title: `Browser (${s.session}): Network Requests`,
          subtitle:
            `Attach recent HTTP/XHR/fetch requests and failed responses`.slice(
              0,
              118,
            ),
        },
      ];
      for (const c of candidates) {
        if (
          !q ||
          c.title.toLowerCase().includes(q) ||
          (c.subtitle?.toLowerCase().includes(q) ?? false) ||
          c.id.toLowerCase().includes(q)
        ) {
          items.push({
            id: c.id.slice(0, 256),
            title: c.title.slice(0, 120),
            ...(c.subtitle ? { subtitle: c.subtitle.slice(0, 120) } : {}),
          });
        }
        if (items.length >= 20) return items;
      }
    }
    return items;
  }

  async resolveMention(id: string): Promise<string> {
    const sep = id.lastIndexOf(":");
    if (sep <= 0) {
      throw new Error(`Invalid browser mention id "${id}"`);
    }
    const session = id.slice(0, sep);
    const kind = id.slice(sep + 1);
    const rec = this.records.get(session);
    if (!rec) {
      throw new Error(
        `agent-browser session "${session}" is no longer running`,
      );
    }

    if (kind === "errors") {
      const rows = rec.consoleEvents.slice(-50);
      if (rows.length === 0) {
        return `### agent-browser Console (${session} — ${rec.url || "about:blank"})\nNo console messages or page errors recorded.`;
      }
      const lines = rows.map(
        (e) =>
          `- **[${e.kind === "page_error" ? "EXCEPTION" : e.level.toUpperCase()}]** ${e.text}${
            e.line !== null ? ` _(line ${e.line})_` : ""
          }`,
      );
      return `### agent-browser Console (${session} — ${rec.url || "about:blank"})\n${lines.join("\n")}`.slice(
        0,
        15500,
      );
    }

    if (kind === "activity") {
      const rows = rec.activity.slice(-50);
      if (rows.length === 0) {
        return `### agent-browser Activity (${session} — ${rec.url || "about:blank"})\nNo commands recorded yet.`;
      }
      const lines = rows.map(
        (a) =>
          `- \`${a.action}\` ${JSON.stringify(a.params)} → **${a.status.toUpperCase()}**${
            a.durationMs !== null ? ` (${a.durationMs}ms)` : ""
          }${a.dataPreview ? ` — \`${a.dataPreview.slice(0, 160)}\`` : ""}`,
      );
      return `### agent-browser Activity (${session} — ${rec.url || "about:blank"})\n${lines.join("\n")}`.slice(
        0,
        15500,
      );
    }

    if (kind === "network") {
      const reqs = await this.listNetworkRequests(session);
      if (reqs.length === 0) {
        return `### agent-browser Network (${session} — ${rec.url || "about:blank"})\nNo network requests captured yet (tracking is now enabled for subsequent navigations).`;
      }
      const lines = reqs
        .slice(-60)
        .map(
          (r) =>
            `- \`${r.method}\` \`${r.status ?? "pending"}\` [${r.resourceType}] ${r.url}`,
        );
      return `### agent-browser Network (${session} — ${rec.url || "about:blank"})\n${lines.join("\n")}`.slice(
        0,
        15500,
      );
    }

    if (kind === "snapshot") {
      const snap = await sendDaemonSocketCommand<{ snapshot?: unknown }>(
        rec.daemon.sockPath,
        "snapshot",
        { interactive: true, compact: true },
        8000,
      );
      if (!snap.success) {
        throw new Error(snap.error || "Could not capture snapshot");
      }
      const rawTree =
        typeof snap.data?.snapshot === "string"
          ? snap.data.snapshot
          : JSON.stringify(snap.data?.snapshot ?? {}, null, 2);
      return `### agent-browser Snapshot (${session} — ${rec.url || "about:blank"})\n\`\`\`text\n${redactText(rawTree, 14500)}\n\`\`\``.slice(
        0,
        15500,
      );
    }

    throw new Error(`Unknown browser mention kind "${kind}"`);
  }
}
