import { connectHost } from "@openchamber/sdk";
import { applyHostReady, GUEST_UI_LOOK_CSS } from "@openchamber/sdk/ui";
import {
  asString,
  nextAvailableSessionName,
  type ActivityEventItem,
  type AgentBrowserSessionSummary,
  type ConsoleEventItem,
  type DockStateSnapshot,
  type PickedElementPayload,
  type SurfaceInspectMode,
  type ViewerScale,
  type ViewportPreset,
} from "../shared/types.ts";

const DOCK_STYLES = `
${GUEST_UI_LOOK_CSS}
:root {
  --target-size: 24px;
}
@media (pointer: coarse) {
  :root {
    --target-size: 44px;
  }
}
*, *::before, *::after {
  box-sizing: border-box;
}
[hidden] {
  display: none !important;
}
body {
  margin: 0;
  padding: 0;
  background: var(--oc-bg, transparent);
  color: var(--oc-fg, inherit);
  font-family: var(--oc-font, system-ui, sans-serif);
  line-height: 1.4;
  overflow-wrap: anywhere;
}
#root {
  container: dock / inline-size;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: var(--oc-bg, transparent);
}
:where(button, select, input) {
  font: inherit;
  color: inherit;
  min-block-size: var(--target-size);
  min-inline-size: var(--target-size);
}
.ab-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.ab-select {
  appearance: none;
  color-scheme: inherit;
  padding: 0.15rem 1.45rem 0.15rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background-color: var(--oc-elevated, rgba(128, 128, 128, 0.08));
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12' fill='none' stroke='%2394a3b8' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.45rem center;
  font-size: 0.78rem;
  font-weight: 500;
  max-inline-size: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.ab-select option {
  background-color: var(--oc-elevated, #171b26);
  color: var(--oc-fg, #e2e8f0);
}
.ab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  padding: 0.15rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.08));
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease;
}
.ab-btn:hover:not(:disabled) {
  background: var(--oc-hover, rgba(128, 128, 128, 0.16));
}
.ab-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ab-btn[aria-pressed="true"],
.ab-btn[data-tone="active"] {
  background: color-mix(in srgb, var(--oc-primary, #3b82f6) 18%, transparent);
  border-color: color-mix(in srgb, var(--oc-primary, #3b82f6) 55%, transparent);
  color: var(--oc-primary-text, inherit);
}
.ab-btn[data-tone="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 15%, transparent);
  border-color: color-mix(in srgb, var(--oc-error, #ef4444) 45%, transparent);
  color: var(--oc-error-text, inherit);
}
.ab-icon-btn {
  padding-inline: 0.4rem;
}
.ab-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 8rem;
  min-inline-size: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.ab-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.12rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--oc-muted, inherit);
  font-size: 0.75rem;
  max-inline-size: 10rem;
  cursor: pointer;
  white-space: nowrap;
}
.ab-tab:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.12));
  color: var(--oc-fg, inherit);
}
.ab-tab[data-active="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.18));
  border-color: var(--oc-border, rgba(128, 128, 128, 0.28));
  color: var(--oc-fg, inherit);
  font-weight: 500;
}
.ab-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  max-inline-size: 7.5rem;
}
.ab-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 18px;
  min-block-size: 18px;
  padding: 0 0.15rem;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--oc-muted, inherit);
  cursor: pointer;
  font-size: 0.72rem;
}
.ab-tab-close:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.22));
  color: var(--oc-fg, inherit);
}
.ab-omnibox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 12rem;
  min-inline-size: 0;
  overflow: hidden;
  padding: 0.1rem 0.3rem 0.1rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.26));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.06));
}
.ab-omnibox:focus-within {
  border-color: var(--oc-primary, #3b82f6);
}
.ab-url-input {
  flex: 1 1 0%;
  inline-size: 0;
  min-inline-size: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  text-overflow: ellipsis;
}
.ab-pill {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-inline-size: auto;
  gap: 0.2rem;
  padding: 0.08rem 0.38rem;
  border-radius: 999px;
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: transparent;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  white-space: nowrap;
}
.ab-pill[aria-expanded="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.2));
}
.ab-pill[data-tone="error"] {
  color: var(--oc-error-text, #ef4444);
  border-color: color-mix(in srgb, var(--oc-error, #ef4444) 45%, transparent);
}
.ab-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  background: color-mix(in srgb, var(--oc-info, #3b82f6) 14%, transparent);
  color: var(--oc-info-text, inherit);
  font-size: 0.75rem;
}
.ab-new-bar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.3rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.07));
}
.ab-inline-input {
  padding: 0.15rem 0.45rem;
  border-radius: calc(var(--oc-radius, 8px) - 3px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.26));
  background: var(--oc-bg, transparent);
  font-size: 0.76rem;
  min-inline-size: 7rem;
}
.ab-drawer {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-block-size: 9.25rem;
  overflow-y: auto;
  padding: 0.3rem 0.35rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
.ab-log-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.18rem 0.3rem;
  border-radius: 4px;
  font-size: 0.74rem;
  min-inline-size: 0;
}
.ab-log-row:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.12));
}
.ab-log-badge {
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.68rem;
  padding: 0.04rem 0.3rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--oc-fg, currentColor) 10%, transparent);
  flex: 0 0 auto;
}
.ab-log-badge[data-status="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 18%, transparent);
  color: var(--oc-error-text, #ef4444);
}
.ab-log-badge[data-status="ok"] {
  background: color-mix(in srgb, var(--oc-success, #22c55e) 16%, transparent);
  color: var(--oc-success-text, #22c55e);
}
.ab-log-main {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--oc-mono, ui-monospace, monospace);
}
.ab-soft-kb {
  display: none;
}
@media (pointer: coarse) {
  .ab-soft-kb {
    display: inline-flex;
  }
}
.ab-hidden-kb {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  inline-size: 1px;
  block-size: 1px;
  inset-block-start: 0;
  inset-inline-start: 0;
}
@container dock (inline-size < 34rem) {
  .ab-btn-text-optional {
    display: none;
  }
  .ab-select {
    max-inline-size: 8.5rem;
  }
}
@container dock (inline-size < 30rem) {
  .ab-omnibox {
    flex: 1 1 100%;
    order: -1;
  }
  .ab-drawer {
    max-block-size: 8rem;
  }
}
`;

function formatPickedMarkdownClient(picked: PickedElementPayload): string {
  const heading = picked.ref
    ? `### Picked Element \`${picked.ref}\` (\`<${picked.tag}>\` in \`${picked.session}\`)`
    : `### Picked Element \`<${picked.tag}>\` (in \`${picked.session}\`)`;
  const styleSummary = Object.entries(picked.styles)
    .slice(0, 8)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  return [
    heading,
    `- **Page**: ${picked.title} (${picked.url})`,
    ...(picked.ref ? [`- **agent-browser ref**: \`${picked.ref}\``] : []),
    `- **Selector**: \`${picked.selector}\``,
    ...(picked.role ? [`- **Role**: \`${picked.role}\``] : []),
    ...(picked.accessibleName
      ? [`- **Accessible Name**: ${JSON.stringify(picked.accessibleName)}`]
      : []),
    `- **Bounds**: \`${picked.bounds.width}×${picked.bounds.height}\` at \`(${picked.bounds.x}, ${picked.bounds.y})\``,
    ...(picked.textSnippet
      ? [`- **Text**: ${JSON.stringify(picked.textSnippet)}`]
      : []),
    ...(styleSummary ? [`- **Styles**: \`${styleSummary}\``] : []),
  ].join("\n");
}

const host = connectHost();
const root = document.querySelector<HTMLElement>("#root")!;

const styleEl = document.createElement("style");
styleEl.textContent = DOCK_STYLES;
document.head.appendChild(styleEl);

let state: DockStateSnapshot = {
  sessions: [],
  activeSession: null,
  sessionPinned: false,
  mode: "viewport",
  viewportPreset: "fit",
  customViewport: { width: 1280, height: 800 },
  viewerScale: 1,
  selectCompatibility: false,
  harRecording: false,
  lastHarPath: null,
  dashboardUrl: "http://localhost:4848",
  dashboardRunning: false,
  controller: "none",
  viewGeneration: 1,
  recentActivity: [],
  recentConsole: [],
};

let themeMode: "dark" | "light" = "dark";
let drawerTab: "none" | "activity" | "console" = "none";
let showNewSessionForm = false;
let creatingSession = false;
let navigating = false;
let pendingNavUrl: string | null = null;
let urlEditing = false;
let lastSentScale = 0;
let lastReportedHeight = 0;
let mounted = false;

async function callApi<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await host.serviceRequest({
    method,
    path,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = res.body
    ? (JSON.parse(res.body) as T & { message?: string })
    : ({} as T & { message?: string });
  if (res.status >= 400) {
    throw new Error(parsed.message || `Request ${path} failed (${res.status})`);
  }
  return parsed;
}

function getActiveSummary(): AgentBrowserSessionSummary | null {
  if (!state.activeSession) return state.sessions[0] ?? null;
  return (
    state.sessions.find((s) => s.session === state.activeSession) ??
    state.sessions[0] ??
    null
  );
}

function detectViewerScale(): ViewerScale {
  const raw = Math.round(window.devicePixelRatio || 1);
  if (raw >= 3) return 3;
  if (raw === 2) return 2;
  return 1;
}

async function syncViewerScaleAndTheme(): Promise<void> {
  const scale = detectViewerScale();
  if (scale === lastSentScale) return;
  lastSentScale = scale;
  try {
    state = await callApi<DockStateSnapshot>("POST", "/api/viewport", {
      viewerScale: scale,
      colorScheme: themeMode,
    });
    render();
  } catch {
    // Service may still be starting.
  }
}

let sessionSelectEl!: HTMLSelectElement;
let pinSessionBtn!: HTMLButtonElement;
let copySessionBtn!: HTMLButtonElement;
let tabsContainer!: HTMLDivElement;
let newSessionBtn!: HTMLButtonElement;
let dashBtn!: HTMLButtonElement;
let newBarEl!: HTMLDivElement;
let newNameInput!: HTMLInputElement;
let newUrlInput!: HTMLInputElement;
let launchSubmit!: HTMLButtonElement;
let cancelNewBtn!: HTMLButtonElement;

let backBtn!: HTMLButtonElement;
let fwdBtn!: HTMLButtonElement;
let reloadBtn!: HTMLButtonElement;
let urlForm!: HTMLDivElement;
let urlInput!: HTMLInputElement;
let activityPill!: HTMLButtonElement;
let errorsPill!: HTMLButtonElement;
let pickBtn!: HTMLButtonElement;
let devtoolsBtn!: HTMLButtonElement;
let presetSelect!: HTMLSelectElement;
let selectCompatBtn!: HTMLButtonElement;
let softKbBtn!: HTMLButtonElement;
let hiddenKbInput!: HTMLTextAreaElement;

let hintBarEl!: HTMLDivElement;
let drawerEl!: HTMLDivElement;

function buildDomOnce(): void {
  const row1 = document.createElement("div");
  row1.className = "ab-row";

  sessionSelectEl = document.createElement("select");
  sessionSelectEl.className = "ab-select";
  sessionSelectEl.setAttribute("aria-label", "Active agent-browser session");
  sessionSelectEl.addEventListener("change", () => {
    const chosen = sessionSelectEl.value;
    if (!chosen) return;
    void callApi<DockStateSnapshot>("POST", "/api/session/select", {
      session: chosen,
    })
      .then((next) => {
        state = next;
        render();
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  pinSessionBtn = document.createElement("button");
  pinSessionBtn.type = "button";
  pinSessionBtn.className = "ab-btn ab-icon-btn";
  pinSessionBtn.setAttribute(
    "aria-label",
    "Pin current session (disable auto-follow on browser.open)",
  );
  pinSessionBtn.title = "Pin session so browser.open does not switch away";
  pinSessionBtn.innerHTML = '<span aria-hidden="true">📌</span>';
  pinSessionBtn.addEventListener("click", () => {
    void callApi<DockStateSnapshot>("POST", "/api/session/pin", {
      pinned: !state.sessionPinned,
    })
      .then((next) => {
        state = next;
        render();
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  copySessionBtn = document.createElement("button");
  copySessionBtn.type = "button";
  copySessionBtn.className = "ab-btn";
  copySessionBtn.setAttribute(
    "aria-label",
    "Copy agent-browser --session flag",
  );
  copySessionBtn.textContent = "CLI";
  copySessionBtn.addEventListener("click", () => {
    const active = getActiveSummary();
    if (!active) return;
    const cmd = `agent-browser --session ${active.session}`;
    void host
      .writeClipboard(cmd)
      .then(() =>
        host.toast({
          kind: "success",
          message: `Copied: ${cmd}`,
        }),
      )
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  newSessionBtn = document.createElement("button");
  newSessionBtn.type = "button";
  newSessionBtn.className = "ab-btn";
  newSessionBtn.setAttribute("aria-label", "Start new browser session");
  newSessionBtn.innerHTML =
    '<span aria-hidden="true">⊞</span><span class="ab-btn-text-optional">Session</span>';
  newSessionBtn.addEventListener("click", () => {
    if (creatingSession) return;
    showNewSessionForm = !showNewSessionForm;
    if (showNewSessionForm) {
      newNameInput.value = nextAvailableSessionName(
        state.sessions.map((s) => s.session),
      );
      if (!newUrlInput.value.trim()) {
        newUrlInput.value = "https://example.com";
      }
    }
    render();
    if (showNewSessionForm) {
      newUrlInput.focus();
      newUrlInput.select();
    }
  });

  tabsContainer = document.createElement("div");
  tabsContainer.className = "ab-tabs";
  tabsContainer.setAttribute("role", "tablist");
  tabsContainer.setAttribute("aria-label", "Browser tabs");

  dashBtn = document.createElement("button");
  dashBtn.type = "button";
  dashBtn.className = "ab-btn";
  dashBtn.setAttribute(
    "aria-label",
    "Open full agent-browser dashboard on port 4848",
  );
  dashBtn.addEventListener("click", () => {
    void callApi<{ running: boolean; url: string; error?: string }>(
      "POST",
      "/api/dashboard/start",
      {},
    )
      .then(async (res) => {
        if (!res.running) {
          await host.toast({
            kind: "error",
            message: res.error || "Could not start :4848 dashboard",
          });
          return;
        }
        await host.openUrl(res.url);
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  row1.append(
    sessionSelectEl,
    pinSessionBtn,
    copySessionBtn,
    newSessionBtn,
    tabsContainer,
    dashBtn,
  );

  newBarEl = document.createElement("div");
  newBarEl.className = "ab-new-bar";
  newBarEl.hidden = true;
  newNameInput = document.createElement("input");
  newNameInput.className = "ab-inline-input";
  newNameInput.placeholder = "Session (e.g. default)";
  newNameInput.value = "default";
  newNameInput.setAttribute("aria-label", "New session name");

  newUrlInput = document.createElement("input");
  newUrlInput.className = "ab-inline-input";
  newUrlInput.style.flex = "1 1 10rem";
  newUrlInput.placeholder = "https://example.com";
  newUrlInput.value = "https://example.com";
  newUrlInput.setAttribute("aria-label", "Initial URL");

  launchSubmit = document.createElement("button");
  launchSubmit.type = "button";
  launchSubmit.className = "ab-btn";
  launchSubmit.dataset.tone = "active";
  launchSubmit.textContent = "Launch";

  cancelNewBtn = document.createElement("button");
  cancelNewBtn.type = "button";
  cancelNewBtn.className = "ab-btn";
  cancelNewBtn.textContent = "Cancel";
  cancelNewBtn.addEventListener("click", () => {
    if (creatingSession) return;
    showNewSessionForm = false;
    render();
  });

  const submitNewSession = (): void => {
    if (creatingSession) return;
    const session =
      newNameInput.value.trim() ||
      nextAvailableSessionName(state.sessions.map((s) => s.session));
    const url = newUrlInput.value.trim() || "https://example.com";
    creatingSession = true;
    render();
    void callApi<DockStateSnapshot>("POST", "/api/session/create", {
      session,
      url,
    })
      .then((next) => {
        state = next;
        showNewSessionForm = false;
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        creatingSession = false;
        render();
      });
  };

  launchSubmit.addEventListener("click", submitNewSession);
  for (const inputEl of [newNameInput, newUrlInput]) {
    inputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.isComposing) {
        ev.preventDefault();
        submitNewSession();
      } else if (ev.key === "Escape" && !creatingSession) {
        ev.preventDefault();
        showNewSessionForm = false;
        render();
      }
    });
  }

  newBarEl.append(newNameInput, newUrlInput, launchSubmit, cancelNewBtn);

  const row2 = document.createElement("div");
  row2.className = "ab-row";

  backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "ab-btn ab-icon-btn";
  backBtn.setAttribute("aria-label", "Back");
  backBtn.innerHTML = '<span aria-hidden="true">←</span>';
  backBtn.addEventListener("click", () => void runNav("back"));

  fwdBtn = document.createElement("button");
  fwdBtn.type = "button";
  fwdBtn.className = "ab-btn ab-icon-btn";
  fwdBtn.setAttribute("aria-label", "Forward");
  fwdBtn.innerHTML = '<span aria-hidden="true">→</span>';
  fwdBtn.addEventListener("click", () => void runNav("forward"));

  reloadBtn = document.createElement("button");
  reloadBtn.type = "button";
  reloadBtn.className = "ab-btn ab-icon-btn";
  reloadBtn.setAttribute("aria-label", "Reload page");
  reloadBtn.innerHTML = '<span aria-hidden="true">↻</span>';
  reloadBtn.addEventListener("click", () => void runNav("reload"));

  urlForm = document.createElement("div");
  urlForm.className = "ab-omnibox";
  urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "ab-url-input";
  urlInput.placeholder = "Enter URL to open in agent-browser…";
  urlInput.setAttribute("aria-label", "Page URL");
  urlInput.addEventListener("focus", () => {
    urlEditing = true;
    urlInput.select();
  });
  urlInput.addEventListener("blur", () => {
    urlEditing = false;
    render();
  });
  urlInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.isComposing) {
      ev.preventDefault();
      const targetUrl = urlInput.value.trim();
      if (!targetUrl) return;
      urlEditing = false;
      urlInput.blur();
      void runNav("navigate", { url: targetUrl });
    } else if (ev.key === "Escape") {
      urlEditing = false;
      urlInput.blur();
    }
  });

  activityPill = document.createElement("button");
  activityPill.type = "button";
  activityPill.className = "ab-pill";
  activityPill.setAttribute("aria-label", "Toggle live command activity feed");
  activityPill.addEventListener("click", () => {
    drawerTab = drawerTab === "activity" ? "none" : "activity";
    render();
  });

  errorsPill = document.createElement("button");
  errorsPill.type = "button";
  errorsPill.className = "ab-pill";
  errorsPill.setAttribute(
    "aria-label",
    "Toggle console and page errors drawer",
  );
  errorsPill.addEventListener("click", () => {
    drawerTab = drawerTab === "console" ? "none" : "console";
    render();
  });

  urlForm.append(urlInput, activityPill, errorsPill);

  pickBtn = document.createElement("button");
  pickBtn.type = "button";
  pickBtn.className = "ab-btn";
  pickBtn.setAttribute(
    "aria-label",
    "Pick element on page and attach @eN ref to chat",
  );
  pickBtn.innerHTML =
    '<span aria-hidden="true">🎯</span><span class="ab-btn-text-optional">Pick @ref</span>';
  pickBtn.addEventListener("click", () => {
    const nextMode: SurfaceInspectMode =
      state.mode === "pick" ? "viewport" : "pick";
    void switchMode(nextMode);
  });

  devtoolsBtn = document.createElement("button");
  devtoolsBtn.type = "button";
  devtoolsBtn.className = "ab-btn";
  devtoolsBtn.setAttribute("aria-label", "Toggle Chrome DevTools inspector");
  devtoolsBtn.innerHTML =
    '<span aria-hidden="true">&lt;/&gt;</span><span class="ab-btn-text-optional">DevTools</span>';
  devtoolsBtn.addEventListener("click", () => {
    const nextMode: SurfaceInspectMode =
      state.mode === "devtools" ? "viewport" : "devtools";
    void switchMode(nextMode);
  });

  presetSelect = document.createElement("select");
  presetSelect.className = "ab-select";
  presetSelect.setAttribute("aria-label", "Viewport size preset");
  for (const [val, label] of [
    ["fit", "Fit panel"],
    ["mobile", "Mobile 390×844"],
    ["tablet", "Tablet 768×1024"],
    ["desktop", "Desktop 1280×800"],
  ] as const) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    presetSelect.appendChild(opt);
  }
  presetSelect.addEventListener("change", () => {
    const preset = presetSelect.value as ViewportPreset;
    void callApi<DockStateSnapshot>("POST", "/api/viewport", {
      preset,
      viewerScale: detectViewerScale(),
      colorScheme: themeMode,
    })
      .then((next) => {
        state = next;
        render();
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  selectCompatBtn = document.createElement("button");
  selectCompatBtn.type = "button";
  selectCompatBtn.className = "ab-btn";
  selectCompatBtn.title = "Render native <select> popups in-page (base-select)";
  selectCompatBtn.setAttribute(
    "aria-label",
    "Toggle in-page native select rendering",
  );
  selectCompatBtn.innerHTML =
    '<span aria-hidden="true">▤</span><span class="ab-btn-text-optional">Selects</span>';
  selectCompatBtn.addEventListener("click", () => {
    void callApi<DockStateSnapshot>("POST", "/api/viewport", {
      selectCompatibility: !state.selectCompatibility,
    })
      .then((next) => {
        state = next;
        render();
      })
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  softKbBtn = document.createElement("button");
  softKbBtn.type = "button";
  softKbBtn.className = "ab-btn ab-icon-btn ab-soft-kb";
  softKbBtn.setAttribute("aria-label", "Open touch keyboard");
  softKbBtn.innerHTML = '<span aria-hidden="true">⌨</span>';

  hiddenKbInput = document.createElement("textarea");
  hiddenKbInput.className = "ab-hidden-kb";
  hiddenKbInput.setAttribute("aria-hidden", "true");
  hiddenKbInput.tabIndex = -1;
  let lastKbValue = "";
  softKbBtn.addEventListener("click", () => {
    lastKbValue = "";
    hiddenKbInput.value = "";
    hiddenKbInput.focus();
  });
  hiddenKbInput.addEventListener("input", () => {
    const nextVal = hiddenKbInput.value;
    if (nextVal.endsWith("\n")) {
      const clean = nextVal.slice(0, -1);
      const common = commonPrefixLen(lastKbValue, clean);
      const backspaces = lastKbValue.length - common;
      const added = clean.slice(common);
      lastKbValue = "";
      hiddenKbInput.value = "";
      void callApi("POST", "/api/type", {
        backspaces,
        text: added,
        enter: true,
      });
      return;
    }
    const common = commonPrefixLen(lastKbValue, nextVal);
    const backspaces = lastKbValue.length - common;
    const added = nextVal.slice(common);
    lastKbValue = nextVal;
    void callApi("POST", "/api/type", {
      backspaces,
      text: added,
      enter: false,
    });
  });

  row2.append(
    backBtn,
    fwdBtn,
    reloadBtn,
    urlForm,
    pickBtn,
    devtoolsBtn,
    presetSelect,
    selectCompatBtn,
    softKbBtn,
    hiddenKbInput,
  );

  hintBarEl = document.createElement("div");
  hintBarEl.className = "ab-hint";
  hintBarEl.hidden = true;

  drawerEl = document.createElement("div");
  drawerEl.className = "ab-drawer";
  drawerEl.hidden = true;

  root.append(row1, newBarEl, row2, hintBarEl, drawerEl);

  const ro = new ResizeObserver(() => {
    const measured = Math.max(
      48,
      Math.min(420, Math.ceil(root.getBoundingClientRect().height)),
    );
    if (Math.abs(measured - lastReportedHeight) >= 2) {
      lastReportedHeight = measured;
      void host.setHeight(measured).catch(() => {});
    }
  });
  ro.observe(root);
}

function commonPrefixLen(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

async function runNav(
  op:
    | "navigate"
    | "back"
    | "forward"
    | "reload"
    | "tab_new"
    | "tab_switch"
    | "tab_close",
  extra: { url?: string; tabId?: string } = {},
): Promise<void> {
  const attemptedUrl = op === "navigate" ? extra.url : undefined;
  let failed = false;
  if (attemptedUrl) {
    pendingNavUrl = attemptedUrl;
    navigating = true;
    render();
  }
  try {
    state = await callApi<DockStateSnapshot>("POST", "/api/nav", {
      op,
      ...extra,
    });
  } catch (err) {
    failed = true;
    await host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    navigating = false;
    pendingNavUrl = null;
    render();
    if (failed && attemptedUrl) {
      urlInput.value = attemptedUrl;
    }
  }
}

async function switchMode(nextMode: SurfaceInspectMode): Promise<void> {
  try {
    state = await callApi<DockStateSnapshot>("POST", "/api/mode", {
      mode: nextMode,
      colorScheme: themeMode,
    });
    render();
  } catch (err) {
    await host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function attachActivityRow(item: ActivityEventItem): void {
  const text = [
    `### agent-browser Command (\`${item.session}\`)`,
    `- **Action**: \`${item.action}\``,
    `- **Params**: \`${JSON.stringify(item.params)}\``,
    `- **Status**: **${item.status.toUpperCase()}**${item.durationMs !== null ? ` (${item.durationMs}ms)` : ""}`,
    ...(item.dataPreview ? [`- **Result**: \`${item.dataPreview}\``] : []),
  ].join("\n");
  const active = getActiveSummary();
  void host
    .attach({
      providerId: "agent-browser",
      id: `act-${item.id}`,
      title: `${item.action} (${item.status})`,
      url: active?.url || "http://localhost:4848",
      text,
    })
    .then(() =>
      host.toast({
        kind: "success",
        message: `Attached ${item.action} to composer`,
      }),
    )
    .catch((err: unknown) => {
      void host.toast({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
}

function attachConsoleRow(item: ConsoleEventItem): void {
  const active = getActiveSummary();
  const text = [
    `### Browser ${item.kind === "page_error" ? "Uncaught Exception" : `Console ${item.level.toUpperCase()}`} (\`${item.session}\`)`,
    `- **Page**: ${active?.url || "about:blank"}`,
    ...(item.line !== null
      ? [
          `- **Line**: ${item.line}${item.column !== null ? `:${item.column}` : ""}`,
        ]
      : []),
    "```text",
    item.text,
    ...(item.argsPreview.length > 0 ? [item.argsPreview.join(" ")] : []),
    "```",
  ].join("\n");
  void host
    .attach({
      providerId: "agent-browser",
      id: `con-${item.seq}`,
      title: `[${item.level.toUpperCase()}] ${item.text.slice(0, 48)}`,
      url: active?.url || "http://localhost:4848",
      text,
    })
    .then(() =>
      host.toast({
        kind: "success",
        message: "Attached console event to composer",
      }),
    )
    .catch((err: unknown) => {
      void host.toast({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
}

function render(): void {
  if (!mounted) return;
  const active = getActiveSummary();

  sessionSelectEl.innerHTML = "";
  if (state.sessions.length === 0) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "No session";
    sessionSelectEl.appendChild(emptyOpt);
    sessionSelectEl.disabled = true;
    sessionSelectEl.title = "No active agent-browser session";
  } else {
    sessionSelectEl.disabled = false;
    for (const s of state.sessions) {
      const opt = document.createElement("option");
      opt.value = s.session;
      const originLabel = s.session.startsWith("oc-") ? "chat" : "panel";
      opt.textContent = `${s.session} · ${originLabel} (${s.engine})`;
      opt.selected = s.session === active?.session;
      sessionSelectEl.appendChild(opt);
    }
    sessionSelectEl.title = active
      ? `${active.session} (${active.session.startsWith("oc-") ? "openchamber_web chat session" : "panel/CLI session"})`
      : "Active agent-browser session";
  }

  pinSessionBtn.disabled = !active;
  pinSessionBtn.setAttribute(
    "aria-pressed",
    state.sessionPinned ? "true" : "false",
  );
  pinSessionBtn.title = state.sessionPinned
    ? "Pinned: browser.open will not switch away from this session"
    : "Pin current session (prevent auto-follow on browser.open)";

  copySessionBtn.disabled = !active;
  copySessionBtn.title = active
    ? `Copy: agent-browser --session ${active.session}`
    : "No active session to copy";

  newSessionBtn.disabled = creatingSession;
  newBarEl.hidden = !showNewSessionForm;
  newNameInput.disabled = creatingSession;
  newUrlInput.disabled = creatingSession;
  launchSubmit.disabled = creatingSession;
  launchSubmit.textContent = creatingSession ? "Launching…" : "Launch";
  cancelNewBtn.disabled = creatingSession;

  tabsContainer.innerHTML = "";
  if (active) {
    const tabs =
      active.tabs.length > 0
        ? active.tabs
        : [
            {
              tabId: "t1",
              title: active.title || "Tab 1",
              url: active.url,
              type: "page",
              active: true,
            },
          ];
    for (const tab of tabs) {
      const tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.className = "ab-tab";
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("aria-selected", tab.active ? "true" : "false");
      tabBtn.dataset.active = tab.active ? "true" : "false";
      tabBtn.title = `${tab.title || tab.url || tab.tabId}`;
      tabBtn.addEventListener("click", () => {
        if (!tab.active) {
          void runNav("tab_switch", { tabId: tab.tabId });
        }
      });

      const labelSpan = document.createElement("span");
      labelSpan.className = "ab-tab-label";
      labelSpan.textContent = tab.title || tab.url || tab.tabId;
      tabBtn.appendChild(labelSpan);

      if (tabs.length > 1) {
        const closeSpan = document.createElement("span");
        closeSpan.className = "ab-tab-close";
        closeSpan.setAttribute("role", "button");
        closeSpan.setAttribute("aria-label", `Close ${tab.title || tab.tabId}`);
        closeSpan.textContent = "×";
        closeSpan.addEventListener("click", (ev) => {
          ev.stopPropagation();
          void runNav("tab_close", { tabId: tab.tabId });
        });
        tabBtn.appendChild(closeSpan);
      }
      tabsContainer.appendChild(tabBtn);
    }

    const addTabBtn = document.createElement("button");
    addTabBtn.type = "button";
    addTabBtn.className = "ab-btn ab-icon-btn";
    addTabBtn.setAttribute("aria-label", "New tab");
    addTabBtn.textContent = "+";
    addTabBtn.addEventListener(
      "click",
      () => void runNav("tab_new", { url: "about:blank" }),
    );
    tabsContainer.appendChild(addTabBtn);
  }

  dashBtn.textContent = state.dashboardRunning ? ":4848 ●" : ":4848 ↗";
  dashBtn.dataset.tone = state.dashboardRunning ? "active" : "";

  const hasSession = Boolean(active);
  backBtn.disabled = !hasSession;
  fwdBtn.disabled = !hasSession;
  reloadBtn.disabled = !hasSession;

  urlInput.disabled = navigating || creatingSession;
  if (!urlEditing) {
    urlInput.value = pendingNavUrl ?? active?.url ?? "";
  }

  const cmdCount = active?.commandCount ?? state.recentActivity.length;
  activityPill.textContent = `⚡ ${cmdCount}`;
  activityPill.setAttribute(
    "aria-expanded",
    drawerTab === "activity" ? "true" : "false",
  );

  const problemCount = (active?.errorCount ?? 0) + (active?.warningCount ?? 0);
  errorsPill.textContent = `${(active?.errorCount ?? 0) > 0 ? "✕" : "⚠"} ${problemCount}`;
  errorsPill.dataset.tone = (active?.errorCount ?? 0) > 0 ? "error" : "";
  errorsPill.setAttribute(
    "aria-expanded",
    drawerTab === "console" ? "true" : "false",
  );

  pickBtn.disabled = !hasSession;
  pickBtn.setAttribute(
    "aria-pressed",
    state.mode === "pick" ? "true" : "false",
  );

  const canDevTools = Boolean(active?.canInspectDevTools);
  devtoolsBtn.disabled = !canDevTools;
  devtoolsBtn.title = canDevTools
    ? "Inspect live tab with bundled Chrome DevTools"
    : "Chrome DevTools requires an active local Chrome session";
  devtoolsBtn.setAttribute(
    "aria-pressed",
    state.mode === "devtools" ? "true" : "false",
  );

  presetSelect.value = state.viewportPreset;
  presetSelect.disabled = !hasSession;
  selectCompatBtn.disabled = !hasSession;
  selectCompatBtn.setAttribute(
    "aria-pressed",
    state.selectCompatibility ? "true" : "false",
  );

  if (state.mode === "pick") {
    hintBarEl.hidden = false;
    hintBarEl.innerHTML = "";
    const msg = document.createElement("span");
    msg.textContent =
      "🎯 Pick mode: click or tap the surface first to take control if needed, hover any element to preview its @eN ref, and click to attach it to chat.";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ab-btn";
    cancelBtn.textContent = "Cancel (Esc)";
    cancelBtn.addEventListener("click", () => void switchMode("viewport"));
    hintBarEl.append(msg, cancelBtn);
  } else {
    hintBarEl.hidden = true;
  }

  if (drawerTab === "none") {
    drawerEl.hidden = true;
  } else {
    drawerEl.hidden = false;
    drawerEl.innerHTML = "";

    if (drawerTab === "activity") {
      const items = [...state.recentActivity].reverse().slice(0, 25);
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ab-log-row";
        empty.textContent =
          "No agent-browser commands recorded yet in this session.";
        drawerEl.appendChild(empty);
      } else {
        for (const item of items) {
          const row = document.createElement("div");
          row.className = "ab-log-row";

          const badge = document.createElement("span");
          badge.className = "ab-log-badge";
          badge.dataset.status = item.status;
          badge.textContent =
            item.status === "running"
              ? "RUN"
              : item.durationMs !== null
                ? `${item.durationMs}ms`
                : item.status.toUpperCase();

          const main = document.createElement("span");
          main.className = "ab-log-main";
          const targetHint = asString(
            item.params.selector ?? item.params.url ?? item.params.key,
          );
          main.textContent = `${item.action}${targetHint ? ` ${targetHint}` : ""}`;
          main.title = JSON.stringify(item.params);

          const attachBtn = document.createElement("button");
          attachBtn.type = "button";
          attachBtn.className = "ab-btn";
          attachBtn.textContent = "Attach";
          attachBtn.addEventListener("click", () => attachActivityRow(item));

          row.append(badge, main, attachBtn);
          drawerEl.appendChild(row);
        }
      }
    } else {
      const logs = [...state.recentConsole].reverse().slice(0, 25);
      if (logs.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ab-log-row";
        empty.textContent = "No console messages or page errors recorded.";
        drawerEl.appendChild(empty);
      } else {
        for (const log of logs) {
          const row = document.createElement("div");
          row.className = "ab-log-row";

          const badge = document.createElement("span");
          badge.className = "ab-log-badge";
          badge.dataset.status =
            log.level === "error" || log.kind === "page_error"
              ? "error"
              : "neutral";
          badge.textContent =
            log.kind === "page_error" ? "ERR" : log.level.toUpperCase();

          const main = document.createElement("span");
          main.className = "ab-log-main";
          main.textContent = log.text;
          main.title = log.text;

          const attachBtn = document.createElement("button");
          attachBtn.type = "button";
          attachBtn.className = "ab-btn";
          attachBtn.textContent = "Attach";
          attachBtn.addEventListener("click", () => attachConsoleRow(log));

          row.append(badge, main, attachBtn);
          drawerEl.appendChild(row);
        }
      }
    }
  }
}

host.onReady((ctx) => {
  applyHostReady(ctx, document.documentElement);
  themeMode = ctx.theme.mode;

  if (!mounted) {
    mounted = true;
    buildDomOnce();
    void callApi<DockStateSnapshot>("GET", "/api/state")
      .then((initial) => {
        state = initial;
        render();
        void syncViewerScaleAndTheme();
      })
      .catch(() => {
        render();
      });
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
      "change",
      () => {
        lastSentScale = 0;
        void syncViewerScaleAndTheme();
      },
    );
  } else {
    lastSentScale = 0;
    void syncViewerScaleAndTheme();
    render();
  }
});

host.onServiceEvent((ev) => {
  if (ev.topic === "state" && ev.data && typeof ev.data === "object") {
    state = ev.data as unknown as DockStateSnapshot;
    render();
    return;
  }
  if (ev.topic === "activity" && ev.data && typeof ev.data === "object") {
    const item = ev.data as unknown as ActivityEventItem;
    if (item.session === (state.activeSession ?? state.sessions[0]?.session)) {
      const idx = state.recentActivity.findIndex((a) => a.id === item.id);
      const updated =
        idx >= 0
          ? state.recentActivity.map((a, i) => (i === idx ? item : a))
          : [...state.recentActivity.slice(-39), item];
      state = { ...state, recentActivity: updated };
      if (drawerTab === "activity") render();
    }
    return;
  }
  if (ev.topic === "console" && ev.data && typeof ev.data === "object") {
    const item = ev.data as unknown as ConsoleEventItem;
    if (item.session === (state.activeSession ?? state.sessions[0]?.session)) {
      state = {
        ...state,
        recentConsole: [...state.recentConsole.slice(-39), item],
      };
      if (drawerTab === "console") render();
    }
    return;
  }
  if (ev.topic === "element-picked" && ev.data && typeof ev.data === "object") {
    const picked = ev.data as unknown as PickedElementPayload;
    const label = picked.ref
      ? `${picked.ref} <${picked.tag}>${picked.accessibleName ? ` "${picked.accessibleName.slice(0, 24)}"` : ""}`
      : `<${picked.tag}> ${picked.selector.slice(0, 28)}`;
    void host
      .attach({
        providerId: "agent-browser",
        id: `pick-${Date.now()}`,
        title: label,
        url: picked.url || "http://localhost:4848",
        text: formatPickedMarkdownClient(picked),
      })
      .then(() =>
        host.toast({
          kind: "success",
          message: `Attached ${label} to chat composer`,
        }),
      )
      .catch((err: unknown) => {
        void host.toast({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }
});
