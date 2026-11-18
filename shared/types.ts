export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value === null || value === undefined) return fallback;
  return JSON.stringify(value);
}

export type SurfaceInspectMode = "viewport" | "devtools" | "pick";

export type ViewportPreset = "fit" | "mobile" | "tablet" | "desktop" | "custom";

export type ViewerScale = 1 | 2 | 3;

export interface SessionTabItem {
  readonly tabId: string;
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly active: boolean;
}

export interface ActivitySummary {
  readonly action: string;
  readonly status: "running" | "ok" | "error";
  readonly durationMs: number | null;
  readonly selectorOrTarget: string | null;
  readonly timestamp: number;
}

export interface AgentBrowserSessionSummary {
  readonly session: string;
  readonly port: number;
  readonly pid: number;
  readonly engine: string;
  readonly provider: string | null;
  readonly connected: boolean;
  readonly screencasting: boolean;
  readonly recording: boolean;
  readonly url: string;
  readonly title: string;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tabs: readonly SessionTabItem[];
  readonly activeTabId: string | null;
  readonly commandCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly lastCommand: ActivitySummary | null;
  readonly canInspectDevTools: boolean;
}

export interface ActivityEventItem {
  readonly seq: number;
  readonly id: string;
  readonly session: string;
  readonly action: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly status: "running" | "ok" | "error";
  readonly durationMs: number | null;
  readonly dataPreview: string | null;
  readonly startedAt: number;
  readonly finishedAt: number | null;
}

export interface ConsoleEventItem {
  readonly seq: number;
  readonly session: string;
  readonly kind: "console" | "page_error";
  readonly level: "log" | "info" | "warn" | "error" | "debug";
  readonly text: string;
  readonly argsPreview: readonly string[];
  readonly line: number | null;
  readonly column: number | null;
  readonly timestamp: number;
}

export interface NetworkRequestItem {
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly status: number | null;
  readonly resourceType: string;
  readonly mimeType: string | null;
  readonly timestamp: number | null;
}

export interface NetworkRequestDetail extends NetworkRequestItem {
  readonly headers: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly postData: string | null;
  readonly responseBody: string | null;
}

export interface CookieSummary {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly httpOnly: boolean;
  readonly secure: boolean;
  readonly sameSite: string | null;
}

export interface StorageSnapshot {
  readonly session: string;
  readonly cookies: readonly CookieSummary[];
  readonly localStorage: Readonly<Record<string, string>>;
  readonly sessionStorage: Readonly<Record<string, string>>;
}

export interface ElementBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PickedElementPayload {
  readonly session: string;
  readonly url: string;
  readonly title: string;
  readonly ref: string | null;
  readonly selector: string;
  readonly tag: string;
  readonly role: string | null;
  readonly accessibleName: string | null;
  readonly textSnippet: string;
  readonly bounds: ElementBounds;
  readonly styles: Readonly<Record<string, string>>;
}

export interface DockStateSnapshot {
  readonly sessions: readonly AgentBrowserSessionSummary[];
  readonly activeSession: string | null;
  readonly sessionPinned: boolean;
  readonly mode: SurfaceInspectMode;
  readonly viewportPreset: ViewportPreset;
  readonly customViewport: { readonly width: number; readonly height: number };
  readonly viewerScale: ViewerScale;
  readonly selectCompatibility: boolean;
  readonly harRecording: boolean;
  readonly lastHarPath: string | null;
  readonly dashboardUrl: string;
  readonly dashboardRunning: boolean;
  readonly controller: "none" | "agent" | "user";
  readonly viewGeneration: number;
  readonly recentActivity: readonly ActivityEventItem[];
  readonly recentConsole: readonly ConsoleEventItem[];
}

export interface ObservatorySnapshot {
  readonly state: DockStateSnapshot;
  readonly activity: readonly ActivityEventItem[];
  readonly consoleEvents: readonly ConsoleEventItem[];
}

export type ServicePushEvent =
  | { readonly topic: "state"; readonly data: DockStateSnapshot }
  | { readonly topic: "activity"; readonly data: ActivityEventItem }
  | { readonly topic: "console"; readonly data: ConsoleEventItem }
  | { readonly topic: "element-picked"; readonly data: PickedElementPayload };

export function sanitizeSessionName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return cleaned || `session-${Date.now().toString(36)}`;
}

export function nextAvailableSessionName(existing: Iterable<string>): string {
  const used = new Set(existing);
  if (!used.has("default")) return "default";
  let idx = 2;
  while (used.has(`session-${idx}`)) {
    idx += 1;
  }
  return `session-${idx}`;
}

export function normalizeNavigationUrl(
  raw?: string,
  emptyFallback?: string,
): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    if (emptyFallback !== undefined) return emptyFallback;
    throw new Error("Enter a URL to navigate");
  }
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    throw new Error("Unsupported URL scheme");
  }
  if (/^about:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  const hostPart = trimmed.split(/[/?#]/, 1)[0] ?? "";
  const isLocalHost =
    /^(?:localhost|(?:[a-zA-Z0-9-]+\.)*localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(
      hostPart,
    );
  return `${isLocalHost ? "http" : "https"}://${trimmed}`;
}
