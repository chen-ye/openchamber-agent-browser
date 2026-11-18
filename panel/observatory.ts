import { connectHost } from "@openchamber/sdk";
import {
  applyHostReady,
  mountBadge,
  mountButton,
  mountEmpty,
  mountSearchField,
  mountSelect,
  mountTabs,
  mountTextField,
  type BadgeHandle,
  type ButtonHandle,
  type SelectHandle,
  type TabsHandle,
} from "@openchamber/sdk/ui";
import {
  nextAvailableSessionName,
  type ActivityEventItem,
  type ConsoleEventItem,
  type DockStateSnapshot,
  type NetworkRequestDetail,
  type NetworkRequestItem,
  type ObservatorySnapshot,
  type StorageSnapshot,
} from "../shared/types.ts";

const OBSERVATORY_STYLES = `
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
  line-height: 1.45;
  overflow-wrap: anywhere;
}
h1, h2, h3 {
  text-wrap: balance;
  margin: 0;
}
p, li {
  text-wrap: pretty;
}
#root {
  container: observatory / inline-size;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: clamp(0.65rem, 2vw, 1rem);
  min-block-size: 100dvh;
}
.obs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-block-end: 0.75rem;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
}
.obs-title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.obs-title {
  font-size: clamp(1rem, 0.92rem + 0.4vw, 1.25rem);
  font-weight: 600;
}
.obs-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.obs-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.obs-search-wrap {
  flex: 1 1 15rem;
  min-inline-size: 0;
}
.obs-search-wrap .oc-sdk-input {
  text-overflow: ellipsis;
}
@container observatory (inline-size < 30rem) {
  .obs-search-wrap {
    flex-basis: 100%;
  }
}
.obs-pane {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}
.obs-feed {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.obs-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.65rem 0.8rem;
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
.obs-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.obs-card-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  min-inline-size: 0;
}
.obs-mono {
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.8rem;
}
.obs-muted {
  color: var(--oc-muted, gray);
  font-size: 0.78rem;
}
.obs-pre {
  margin: 0;
  padding: 0.5rem 0.65rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  background: color-mix(in srgb, var(--oc-fg, currentColor) 5%, transparent);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-block-size: 14rem;
  overflow-y: auto;
}
.obs-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: var(--oc-mono, ui-monospace, monospace);
  background: color-mix(in srgb, var(--oc-fg, currentColor) 9%, transparent);
}
.obs-pill[data-tone="ok"] {
  background: color-mix(in srgb, var(--oc-success, #22c55e) 16%, transparent);
  color: var(--oc-success-text, #22c55e);
}
.obs-pill[data-tone="error"] {
  background: color-mix(in srgb, var(--oc-error, #ef4444) 18%, transparent);
  color: var(--oc-error-text, #ef4444);
}
.obs-pill[data-tone="warn"] {
  background: color-mix(in srgb, var(--oc-warning, #f59e0b) 18%, transparent);
  color: var(--oc-warning-text, #f59e0b);
}
.obs-inline-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--target-size);
  min-inline-size: var(--target-size);
  padding: 0.15rem 0.55rem;
  border-radius: calc(var(--oc-radius, 8px) - 2px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.25));
  background: var(--oc-bg, transparent);
  color: inherit;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}
.obs-inline-btn:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.14));
}
.obs-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  min-inline-size: 0;
}
@container observatory (inline-size > 52rem) {
  .obs-split[data-has-detail="true"] {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: start;
  }
}
.obs-split .obs-pre {
  max-block-size: min(26rem, 60dvh);
}
.obs-table-region {
  container: nettable / inline-size;
  overflow: auto;
  max-inline-size: 100%;
  max-block-size: min(32rem, 70dvh);
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.22));
}
.obs-table {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8rem;
}
.obs-table caption {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.obs-table thead {
  position: sticky;
  inset-block-start: 0;
  z-index: 2;
  background: var(--oc-elevated, #1e293b);
}
.obs-table th,
.obs-table td {
  padding: 0.48rem 0.65rem;
  text-align: left;
  border-block-end: 1px solid var(--oc-border, rgba(128, 128, 128, 0.16));
  vertical-align: top;
}
.obs-table tbody th {
  font-weight: 400;
  overflow-wrap: anywhere;
}
.obs-table tbody tr:last-child > * {
  border-block-end: 0;
}
.obs-table tbody tr {
  cursor: pointer;
}
.obs-table tbody tr:hover {
  background: var(--oc-hover, rgba(128, 128, 128, 0.1));
}
.obs-table tbody tr[data-selected="true"] {
  background: var(--oc-selection, rgba(128, 128, 128, 0.2));
}
@container nettable (inline-size < 25rem) {
  .obs-table,
  .obs-table thead,
  .obs-table tbody,
  .obs-table tr,
  .obs-table th,
  .obs-table td {
    display: block;
  }
  .obs-table thead {
    display: none;
  }
  .obs-table tbody tr {
    margin: 0.45rem;
    border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
    border-radius: calc(var(--oc-radius, 8px) - 2px);
  }
  .obs-table th,
  .obs-table td {
    padding: 0.32rem 0.55rem;
  }
  .obs-table tbody th {
    background: var(--oc-elevated, rgba(128, 128, 128, 0.08));
    font-weight: 600;
  }
  .obs-table td[data-col]::before {
    content: attr(data-col) ": ";
    font-weight: 600;
    color: var(--oc-muted, gray);
  }
}
.obs-repl-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: var(--oc-radius, 8px);
  border: 1px solid var(--oc-border, rgba(128, 128, 128, 0.24));
  background: var(--oc-elevated, rgba(128, 128, 128, 0.05));
}
`;

const host = connectHost();
const root = document.querySelector<HTMLElement>("#root")!;

const styleEl = document.createElement("style");
styleEl.textContent = OBSERVATORY_STYLES;
document.head.appendChild(styleEl);

let selectedSession: string | null = null;
let activeTab: "activity" | "console" | "network" | "storage" = "activity";
let activityQuery = "";
let consoleQuery = "";
let consoleLevelFilter = "all";
let networkQuery = "";
let networkTypeFilter = "";
let replCode = "({ title: document.title, url: location.href })";
let replOutput: { ok: boolean; text: string } | null = null;

let snapshot: ObservatorySnapshot = {
  state: {
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
  },
  activity: [],
  consoleEvents: [],
};

let networkItems: readonly NetworkRequestItem[] = [];
let selectedRequestDetail: NetworkRequestDetail | null = null;
let storageData: StorageSnapshot | null = null;

let mounted = false;
let sessionPicker!: SelectHandle;
let statusBadge!: BadgeHandle;
let tabsHandle!: TabsHandle;

let activityPane!: HTMLElement;
let activityFeedEl!: HTMLDivElement;

let consolePane!: HTMLElement;
let consoleFeedEl!: HTMLDivElement;
let replOutputEl!: HTMLPreElement;
let attachReplBtn!: ButtonHandle;

let networkPane!: HTMLElement;
let harBtnWrap!: HTMLSpanElement;
let networkSplitEl!: HTMLDivElement;
let networkTableBody!: HTMLTableSectionElement;
let networkDetailEl!: HTMLDivElement;

let storagePane!: HTMLElement;
let storageBodyEl!: HTMLDivElement;
let attachStorageBtn!: ButtonHandle;

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

function effectiveSession(): string | null {
  return (
    selectedSession ??
    snapshot.state.activeSession ??
    snapshot.state.sessions[0]?.session ??
    null
  );
}

async function refreshAll(): Promise<void> {
  try {
    const sess = effectiveSession();
    const qs = sess ? `?session=${encodeURIComponent(sess)}` : "";
    snapshot = await callApi<ObservatorySnapshot>(
      "GET",
      `/api/observatory${qs}`,
    );
    if (!selectedSession && snapshot.state.activeSession) {
      selectedSession = snapshot.state.activeSession;
    }
    if (activeTab === "network") {
      await refreshNetwork();
    } else if (activeTab === "storage") {
      await refreshStorage();
    }
    render();
  } catch (err) {
    await host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function refreshNetwork(clear = false): Promise<void> {
  const sess = effectiveSession();
  if (!sess) {
    networkItems = [];
    selectedRequestDetail = null;
    renderNetworkPane();
    return;
  }
  try {
    const params = new URLSearchParams({ session: sess });
    if (networkTypeFilter) params.set("type", networkTypeFilter);
    if (clear) params.set("clear", "1");
    const res = await callApi<{ requests: NetworkRequestItem[] }>(
      "GET",
      `/api/network?${params.toString()}`,
    );
    networkItems = res.requests;
    if (clear) selectedRequestDetail = null;
    renderNetworkPane();
  } catch (err) {
    void host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function inspectRequest(requestId: string): Promise<void> {
  const sess = effectiveSession();
  if (!sess) return;
  try {
    const params = new URLSearchParams({ session: sess, requestId });
    const res = await callApi<{ detail: NetworkRequestDetail | null }>(
      "GET",
      `/api/network/detail?${params.toString()}`,
    );
    selectedRequestDetail = res.detail;
    renderNetworkPane();
  } catch (err) {
    void host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function refreshStorage(): Promise<void> {
  const sess = effectiveSession();
  if (!sess) {
    storageData = null;
    renderStoragePane();
    return;
  }
  try {
    const res = await callApi<{ storage: StorageSnapshot | null }>(
      "GET",
      `/api/storage?session=${encodeURIComponent(sess)}`,
    );
    storageData = res.storage;
    renderStoragePane();
  } catch (err) {
    void host.toast({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function buildObservatoryDom(): void {
  const header = document.createElement("header");
  header.className = "obs-header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "obs-title-group";
  const h1 = document.createElement("h1");
  h1.className = "obs-title";
  h1.textContent = "Agent Browser Observatory";
  const badgeWrap = document.createElement("span");
  statusBadge = mountBadge(badgeWrap, { label: "Idle", tone: "neutral" });
  titleGroup.append(h1, badgeWrap);

  const headerControls = document.createElement("div");
  headerControls.className = "obs-controls";
  const selectWrap = document.createElement("div");
  sessionPicker = mountSelect(selectWrap, {
    value: "",
    options: [{ id: "", label: "No active session" }],
    placeholder: "Select session",
    onChange: (next) => {
      selectedSession = next || null;
      sessionPicker.update({ value: next });
      void refreshAll();
    },
  });

  const newBtnWrap = document.createElement("span");
  let creatingSession = false;
  const newSessionBtnHandle: ButtonHandle = mountButton(newBtnWrap, {
    label: "New Session",
    variant: "outline",
    size: "sm",
    onClick: () => {
      if (creatingSession) return;
      const nextName = nextAvailableSessionName(
        snapshot.state.sessions.map((s) => s.session),
      );
      creatingSession = true;
      newSessionBtnHandle.update({
        label: "Launching…",
        loading: true,
        disabled: true,
      });
      void callApi<DockStateSnapshot>("POST", "/api/session/create", {
        session: nextName,
        url: "https://example.com",
      })
        .then((created) => {
          selectedSession = created.activeSession ?? nextName;
          return refreshAll();
        })
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          creatingSession = false;
          newSessionBtnHandle.update({
            label: "New Session",
            loading: false,
            disabled: false,
          });
        });
    },
  });

  const refreshWrap = document.createElement("span");
  mountButton(refreshWrap, {
    label: "Refresh",
    variant: "outline",
    size: "sm",
    onClick: () => void refreshAll(),
  });

  const openDashWrap = document.createElement("span");
  mountButton(openDashWrap, {
    label: "Open :4848 Dashboard",
    variant: "default",
    size: "sm",
    onClick: () => {
      void callApi<{ running: boolean; url: string; error?: string }>(
        "POST",
        "/api/dashboard/start",
        {},
      )
        .then(async (res) => {
          if (res.running) {
            await host.openUrl(res.url);
          } else {
            await host.toast({
              kind: "error",
              message: res.error || "Failed to launch :4848 dashboard",
            });
          }
        })
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
  });

  headerControls.append(selectWrap, newBtnWrap, refreshWrap, openDashWrap);
  header.append(titleGroup, headerControls);

  const tabsBar = document.createElement("div");
  tabsHandle = mountTabs(tabsBar, {
    items: [
      { id: "activity", label: "Activity", count: 0 },
      { id: "console", label: "Console", count: 0 },
      { id: "network", label: "Network" },
      { id: "storage", label: "Storage" },
    ],
    activeId: activeTab,
    trackBackground: true,
    onChange: (next) => {
      activeTab = next as typeof activeTab;
      tabsHandle.update({ activeId: activeTab });
      updatePaneVisibility();
      if (activeTab === "network") void refreshNetwork();
      if (activeTab === "storage") void refreshStorage();
    },
  });

  // 1. Activity Pane
  activityPane = document.createElement("section");
  activityPane.className = "obs-pane";
  const actToolbar = document.createElement("div");
  actToolbar.className = "obs-toolbar";
  const actSearchWrap = document.createElement("div");
  actSearchWrap.className = "obs-search-wrap";
  const actSearch = mountSearchField(actSearchWrap, {
    value: activityQuery,
    placeholder: "Filter commands, @eN refs, URLs, or payloads…",
    onChange: (v) => {
      activityQuery = v;
      actSearch.update({ value: v });
      renderActivityPane();
    },
  });
  actToolbar.appendChild(actSearchWrap);
  activityFeedEl = document.createElement("div");
  activityFeedEl.className = "obs-feed";
  activityPane.append(actToolbar, activityFeedEl);

  // 2. Console + REPL Pane
  consolePane = document.createElement("section");
  consolePane.className = "obs-pane";
  const conToolbar = document.createElement("div");
  conToolbar.className = "obs-toolbar";
  const conSearchWrap = document.createElement("div");
  conSearchWrap.className = "obs-search-wrap";
  const conSearch = mountSearchField(conSearchWrap, {
    value: consoleQuery,
    placeholder: "Filter console output and page exceptions…",
    onChange: (v) => {
      consoleQuery = v;
      conSearch.update({ value: v });
      renderConsolePane();
    },
  });
  const levelWrap = document.createElement("div");
  const levelSelect = mountSelect(levelWrap, {
    value: consoleLevelFilter,
    options: [
      { id: "all", label: "All levels" },
      { id: "error", label: "Errors & exceptions" },
      { id: "warn", label: "Warnings" },
      { id: "log", label: "Logs & info" },
    ],
    onChange: (v) => {
      consoleLevelFilter = v;
      levelSelect.update({ value: v });
      renderConsolePane();
    },
  });
  conToolbar.append(conSearchWrap, levelWrap);

  const replBox = document.createElement("div");
  replBox.className = "obs-repl-box";
  const replFieldWrap = document.createElement("div");
  const replField = mountTextField(replFieldWrap, {
    label: "Live JavaScript REPL (evaluates in active tab)",
    value: replCode,
    multiline: true,
    rows: 2,
    mono: true,
    onChange: (v) => {
      replCode = v;
      replField.update({ value: v });
    },
  });
  const replActions = document.createElement("div");
  replActions.className = "obs-controls";
  const runReplWrap = document.createElement("span");
  mountButton(runReplWrap, {
    label: "Evaluate JS",
    variant: "default",
    size: "sm",
    onClick: () => {
      void callApi<{ ok: boolean; output: string }>("POST", "/api/eval", {
        session: effectiveSession(),
        expression: replCode,
      })
        .then((res) => {
          replOutput = { ok: res.ok, text: res.output };
          renderConsolePane();
        })
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
  });
  const attachReplWrap = document.createElement("span");
  attachReplBtn = mountButton(attachReplWrap, {
    label: "Attach Result",
    variant: "outline",
    size: "sm",
    disabled: true,
    onClick: () => {
      if (!replOutput) return;
      void host
        .attach({
          providerId: "agent-browser",
          id: `repl-${Date.now()}`,
          title: `JS Eval (${effectiveSession() ?? "browser"})`,
          url: "http://localhost:4848",
          text: `### Browser JS Evaluation (\`${effectiveSession() ?? "default"}\`)\n\`\`\`js\n${replCode}\n\`\`\`\n**Result**:\n\`\`\`json\n${replOutput.text}\n\`\`\``,
        })
        .then(() =>
          host.toast({
            kind: "success",
            message: "Attached REPL output to chat",
          }),
        )
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
  });
  replActions.append(runReplWrap, attachReplWrap);
  replOutputEl = document.createElement("pre");
  replOutputEl.className = "obs-pre";
  replOutputEl.hidden = true;
  replBox.append(replFieldWrap, replActions, replOutputEl);

  consoleFeedEl = document.createElement("div");
  consoleFeedEl.className = "obs-feed";
  consolePane.append(replBox, conToolbar, consoleFeedEl);

  // 3. Network + HAR Pane
  networkPane = document.createElement("section");
  networkPane.className = "obs-pane";
  const netToolbar = document.createElement("div");
  netToolbar.className = "obs-toolbar";
  const netSearchWrap = document.createElement("div");
  netSearchWrap.className = "obs-search-wrap";
  const netSearch = mountSearchField(netSearchWrap, {
    value: networkQuery,
    placeholder: "Filter request URL or method…",
    onChange: (v) => {
      networkQuery = v;
      netSearch.update({ value: v });
      renderNetworkPane();
    },
  });
  const netTypeWrap = document.createElement("div");
  const netTypeSelect = mountSelect(netTypeWrap, {
    value: networkTypeFilter,
    options: [
      { id: "", label: "All types" },
      { id: "xhr,fetch", label: "XHR / Fetch" },
      { id: "document", label: "Document" },
      { id: "script,stylesheet", label: "JS / CSS" },
    ],
    onChange: (v) => {
      networkTypeFilter = v;
      netTypeSelect.update({ value: v });
      void refreshNetwork();
    },
  });
  const netClearWrap = document.createElement("span");
  mountButton(netClearWrap, {
    label: "Clear",
    variant: "outline",
    size: "sm",
    onClick: () => void refreshNetwork(true),
  });
  harBtnWrap = document.createElement("span");
  netToolbar.append(netSearchWrap, netTypeWrap, netClearWrap, harBtnWrap);

  networkSplitEl = document.createElement("div");
  networkSplitEl.className = "obs-split";
  const tableRegion = document.createElement("div");
  tableRegion.className = "obs-table-region";
  tableRegion.tabIndex = 0;
  tableRegion.setAttribute("role", "region");
  tableRegion.setAttribute("aria-labelledby", "obs-net-caption");

  const netTable = document.createElement("table");
  netTable.className = "obs-table";
  netTable.innerHTML = `
    <caption id="obs-net-caption">Captured browser network requests</caption>
    <thead>
      <tr>
        <th scope="col">URL</th>
        <th scope="col">Method</th>
        <th scope="col">Status</th>
        <th scope="col">Type</th>
      </tr>
    </thead>
  `;
  networkTableBody = document.createElement("tbody");
  netTable.appendChild(networkTableBody);
  tableRegion.appendChild(netTable);

  networkDetailEl = document.createElement("div");
  networkSplitEl.append(tableRegion, networkDetailEl);
  networkPane.append(netToolbar, networkSplitEl);

  // 4. Storage Pane
  storagePane = document.createElement("section");
  storagePane.className = "obs-pane";
  const storToolbar = document.createElement("div");
  storToolbar.className = "obs-toolbar";
  const storRefreshWrap = document.createElement("span");
  mountButton(storRefreshWrap, {
    label: "Reload Storage",
    variant: "outline",
    size: "sm",
    onClick: () => void refreshStorage(),
  });
  const storAttachWrap = document.createElement("span");
  attachStorageBtn = mountButton(storAttachWrap, {
    label: "Attach Summary",
    variant: "outline",
    size: "sm",
    disabled: true,
    onClick: () => {
      if (!storageData) return;
      const md = [
        `### Browser Storage Summary (\`${storageData.session}\`)`,
        `- **Cookies**: ${storageData.cookies.length} (${storageData.cookies.map((c) => c.name).join(", ") || "none"})`,
        `- **localStorage keys**: ${Object.keys(storageData.localStorage).join(", ") || "none"}`,
        `- **sessionStorage keys**: ${Object.keys(storageData.sessionStorage).join(", ") || "none"}`,
      ].join("\n");
      void host
        .attach({
          providerId: "agent-browser",
          id: `stor-${Date.now()}`,
          title: `Storage (${storageData.session})`,
          url: "http://localhost:4848",
          text: md,
        })
        .then(() =>
          host.toast({
            kind: "success",
            message: "Attached storage summary to chat",
          }),
        )
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
  });
  storToolbar.append(storRefreshWrap, storAttachWrap);
  storageBodyEl = document.createElement("div");
  storageBodyEl.className = "obs-feed";
  storagePane.append(storToolbar, storageBodyEl);

  root.append(
    header,
    tabsBar,
    activityPane,
    consolePane,
    networkPane,
    storagePane,
  );
  updatePaneVisibility();
}

function updatePaneVisibility(): void {
  activityPane.hidden = activeTab !== "activity";
  consolePane.hidden = activeTab !== "console";
  networkPane.hidden = activeTab !== "network";
  storagePane.hidden = activeTab !== "storage";
}

function render(): void {
  if (!mounted) return;
  const sessName = effectiveSession();
  const sessSummary =
    snapshot.state.sessions.find((s) => s.session === sessName) ?? null;

  if (snapshot.state.sessions.length === 0) {
    sessionPicker.update({
      value: "",
      options: [{ id: "", label: "No active session" }],
      disabled: true,
    });
    statusBadge.update({ label: "No sessions running", tone: "neutral" });
  } else {
    sessionPicker.update({
      value: sessName ?? snapshot.state.sessions[0]!.session,
      options: snapshot.state.sessions.map((s) => ({
        id: s.session,
        label: s.session,
        hint: `${s.engine} · ${s.viewportWidth}×${s.viewportHeight}`,
      })),
      disabled: false,
    });
    statusBadge.update({
      label: sessSummary
        ? `${sessSummary.connected ? "Live" : "Idle"} · ${sessSummary.viewportWidth}×${sessSummary.viewportHeight}`
        : "Ready",
      tone: sessSummary?.connected ? "success" : "neutral",
    });
  }

  tabsHandle.update({
    activeId: activeTab,
    items: [
      { id: "activity", label: "Activity", count: snapshot.activity.length },
      { id: "console", label: "Console", count: snapshot.consoleEvents.length },
      {
        id: "network",
        label: "Network",
        ...(networkItems.length ? { count: networkItems.length } : {}),
      },
      { id: "storage", label: "Storage" },
    ],
  });

  renderActivityPane();
  renderConsolePane();
  renderNetworkPane();
  renderStoragePane();
}

function renderActivityPane(): void {
  activityFeedEl.innerHTML = "";
  const q = activityQuery.trim().toLowerCase();
  const filtered = [...snapshot.activity].reverse().filter((item) => {
    if (!q) return true;
    return (
      item.action.toLowerCase().includes(q) ||
      JSON.stringify(item.params).toLowerCase().includes(q) ||
      (item.dataPreview?.toLowerCase().includes(q) ?? false)
    );
  });

  if (filtered.length === 0) {
    mountEmpty(activityFeedEl, {
      title:
        snapshot.state.sessions.length === 0
          ? "No browser sessions active"
          : "No matching commands yet",
      body: "Every agent-browser CLI or provider command streams here in real time with its @eN selector, duration, and return payload.",
    });
    return;
  }

  for (const item of filtered.slice(0, 120)) {
    const card = document.createElement("article");
    card.className = "obs-card";

    const head = document.createElement("div");
    head.className = "obs-card-head";

    const meta = document.createElement("div");
    meta.className = "obs-card-meta";

    const statusPill = document.createElement("span");
    statusPill.className = "obs-pill";
    statusPill.dataset.tone =
      item.status === "error" ? "error" : item.status === "ok" ? "ok" : "";
    statusPill.textContent = item.status.toUpperCase();

    const actionEl = document.createElement("strong");
    actionEl.className = "obs-mono";
    actionEl.textContent = item.action;

    const durEl = document.createElement("span");
    durEl.className = "obs-muted";
    durEl.textContent =
      item.durationMs !== null ? `${item.durationMs}ms` : "running…";

    meta.append(statusPill, actionEl, durEl);

    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className = "obs-inline-btn";
    attachBtn.textContent = "Attach to Chat";
    attachBtn.addEventListener("click", () => {
      const md = [
        `### agent-browser Command (\`${item.session}\`)`,
        `- **Action**: \`${item.action}\``,
        `- **Params**: \`${JSON.stringify(item.params)}\``,
        `- **Status**: **${item.status.toUpperCase()}**${item.durationMs !== null ? ` (${item.durationMs}ms)` : ""}`,
        ...(item.dataPreview
          ? [`- **Payload**:\n\`\`\`json\n${item.dataPreview}\n\`\`\``]
          : []),
      ].join("\n");
      void host
        .attach({
          providerId: "agent-browser",
          id: `obs-act-${item.id}`,
          title: `${item.action} (${item.status})`,
          url: "http://localhost:4848",
          text: md,
        })
        .then(() =>
          host.toast({
            kind: "success",
            message: `Attached ${item.action} to chat`,
          }),
        )
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    });

    head.append(meta, attachBtn);
    card.appendChild(head);

    if (Object.keys(item.params).length > 0) {
      const paramsPre = document.createElement("pre");
      paramsPre.className = "obs-pre";
      paramsPre.textContent = JSON.stringify(item.params, null, 2);
      card.appendChild(paramsPre);
    }
    if (item.dataPreview) {
      const resPre = document.createElement("pre");
      resPre.className = "obs-pre";
      resPre.textContent = item.dataPreview;
      card.appendChild(resPre);
    }
    activityFeedEl.appendChild(card);
  }
}

function renderConsolePane(): void {
  attachReplBtn.update({ disabled: !replOutput });
  if (replOutput) {
    replOutputEl.hidden = false;
    replOutputEl.textContent = replOutput.text;
  } else {
    replOutputEl.hidden = true;
  }

  consoleFeedEl.innerHTML = "";
  const q = consoleQuery.trim().toLowerCase();
  const filtered = [...snapshot.consoleEvents].reverse().filter((item) => {
    if (
      consoleLevelFilter === "error" &&
      item.level !== "error" &&
      item.kind !== "page_error"
    )
      return false;
    if (consoleLevelFilter === "warn" && item.level !== "warn") return false;
    if (
      consoleLevelFilter === "log" &&
      item.level !== "log" &&
      item.level !== "info" &&
      item.level !== "debug"
    ) {
      return false;
    }
    if (!q) return true;
    return (
      item.text.toLowerCase().includes(q) ||
      item.argsPreview.join(" ").toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    mountEmpty(consoleFeedEl, {
      title: "Console is clean",
      body: "Console messages and uncaught page exceptions stream here automatically.",
    });
    return;
  }

  for (const item of filtered.slice(0, 120)) {
    const card = document.createElement("article");
    card.className = "obs-card";

    const head = document.createElement("div");
    head.className = "obs-card-head";
    const meta = document.createElement("div");
    meta.className = "obs-card-meta";

    const pill = document.createElement("span");
    pill.className = "obs-pill";
    pill.dataset.tone =
      item.kind === "page_error" || item.level === "error"
        ? "error"
        : item.level === "warn"
          ? "warn"
          : "";
    pill.textContent =
      item.kind === "page_error" ? "EXCEPTION" : item.level.toUpperCase();

    const loc = document.createElement("span");
    loc.className = "obs-muted";
    loc.textContent =
      item.line !== null
        ? `line ${item.line}`
        : new Date(item.timestamp).toLocaleTimeString();

    meta.append(pill, loc);

    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className = "obs-inline-btn";
    attachBtn.textContent = "Attach to Chat";
    attachBtn.addEventListener("click", () => {
      void host
        .attach({
          providerId: "agent-browser",
          id: `obs-con-${item.seq}`,
          title: `[${item.level.toUpperCase()}] ${item.text.slice(0, 44)}`,
          url: "http://localhost:4848",
          text: `### Browser Console (${item.session})\n\`\`\`text\n${item.text}\n\`\`\``,
        })
        .then(() =>
          host.toast({
            kind: "success",
            message: "Attached console entry to chat",
          }),
        )
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    });

    head.append(meta, attachBtn);

    const pre = document.createElement("pre");
    pre.className = "obs-pre";
    pre.textContent =
      item.argsPreview.length > 0 && !item.argsPreview.includes(item.text)
        ? `${item.text}\n${item.argsPreview.join("\n")}`
        : item.text;

    card.append(head, pre);
    consoleFeedEl.appendChild(card);
  }
}

function renderNetworkPane(): void {
  harBtnWrap.innerHTML = "";
  mountButton(harBtnWrap, {
    label: snapshot.state.harRecording
      ? "Stop HAR Capture"
      : "Start HAR Capture",
    variant: snapshot.state.harRecording ? "destructive" : "outline",
    size: "sm",
    onClick: () => {
      void callApi<DockStateSnapshot>("POST", "/api/har/toggle", {
        session: effectiveSession(),
      })
        .then((nextState) => {
          snapshot = { ...snapshot, state: nextState };
          renderNetworkPane();
          if (!nextState.harRecording && nextState.lastHarPath) {
            void host.toast({
              kind: "success",
              message: `Saved HAR to ${nextState.lastHarPath}`,
            });
          }
        })
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    },
  });

  networkTableBody.innerHTML = "";
  const q = networkQuery.trim().toLowerCase();
  const rows = [...networkItems].reverse().filter((r) => {
    if (!q) return true;
    return (
      r.url.toLowerCase().includes(q) || r.method.toLowerCase().includes(q)
    );
  });

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "obs-muted";
    td.textContent =
      "No network requests recorded yet. Navigate or trigger page activity to inspect traffic.";
    tr.appendChild(td);
    networkTableBody.appendChild(tr);
  } else {
    for (const req of rows.slice(0, 150)) {
      const tr = document.createElement("tr");
      tr.dataset.selected =
        selectedRequestDetail?.requestId === req.requestId ? "true" : "false";
      tr.addEventListener("click", () => void inspectRequest(req.requestId));

      const thUrl = document.createElement("th");
      thUrl.scope = "row";
      thUrl.className = "obs-mono";
      thUrl.textContent =
        req.url.length > 72 ? `${req.url.slice(0, 72)}…` : req.url;
      thUrl.title = req.url;

      const tdMethod = document.createElement("td");
      tdMethod.dataset.col = "Method";
      tdMethod.className = "obs-mono";
      tdMethod.textContent = req.method;

      const tdStatus = document.createElement("td");
      tdStatus.dataset.col = "Status";
      const statusSpan = document.createElement("span");
      statusSpan.className = "obs-pill";
      statusSpan.dataset.tone =
        req.status === null
          ? ""
          : req.status >= 400
            ? "error"
            : req.status >= 200 && req.status < 300
              ? "ok"
              : "warn";
      statusSpan.textContent =
        req.status === null ? "pending" : String(req.status);
      tdStatus.appendChild(statusSpan);

      const tdType = document.createElement("td");
      tdType.dataset.col = "Type";
      tdType.className = "obs-muted";
      tdType.textContent = req.resourceType;

      tr.append(thUrl, tdMethod, tdStatus, tdType);
      networkTableBody.appendChild(tr);
    }
  }

  networkDetailEl.innerHTML = "";
  networkSplitEl.dataset.hasDetail = selectedRequestDetail ? "true" : "false";
  if (selectedRequestDetail) {
    const d = selectedRequestDetail;
    const card = document.createElement("article");
    card.className = "obs-card";

    const head = document.createElement("div");
    head.className = "obs-card-head";
    const meta = document.createElement("div");
    meta.className = "obs-card-meta";
    const methodBadge = document.createElement("strong");
    methodBadge.className = "obs-mono";
    methodBadge.textContent = d.method;
    const statusPill = document.createElement("span");
    statusPill.className = "obs-pill";
    statusPill.dataset.tone =
      d.status === null
        ? ""
        : d.status >= 400
          ? "error"
          : d.status >= 200 && d.status < 300
            ? "ok"
            : "warn";
    statusPill.textContent = d.status === null ? "pending" : String(d.status);
    meta.append(methodBadge, statusPill);

    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className = "obs-inline-btn";
    attachBtn.style.flexShrink = "0";
    attachBtn.textContent = "Attach Request to Chat";
    attachBtn.addEventListener("click", () => {
      const md = [
        `### Network Request (\`${d.method} ${d.status ?? "pending"}\`)`,
        `- **URL**: ${d.url}`,
        `- **Headers**: \`${JSON.stringify(d.headers)}\``,
        ...(d.postData
          ? [
              `- **Request Body**:\n\`\`\`\n${d.postData.slice(0, 2000)}\n\`\`\``,
            ]
          : []),
        ...(d.responseBody
          ? [
              `- **Response Body**:\n\`\`\`\n${d.responseBody.slice(0, 3000)}\n\`\`\``,
            ]
          : []),
      ].join("\n");
      void host
        .attach({
          providerId: "agent-browser",
          id: `net-${d.requestId}`,
          title: `${d.method} ${d.status ?? ""} ${d.url.slice(0, 36)}`,
          url: d.url.startsWith("http") ? d.url : "http://localhost:4848",
          text: md,
        })
        .then(() =>
          host.toast({
            kind: "success",
            message: "Attached network request to chat",
          }),
        )
        .catch((err: unknown) => {
          void host.toast({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    });
    head.append(meta, attachBtn);

    const urlLine = document.createElement("div");
    urlLine.className = "obs-mono obs-muted";
    urlLine.textContent = d.url;

    const detailPre = document.createElement("pre");
    detailPre.className = "obs-pre";
    detailPre.textContent = JSON.stringify(
      {
        requestHeaders: d.headers,
        responseHeaders: d.responseHeaders,
        ...(d.postData ? { postData: d.postData } : {}),
        ...(d.responseBody ? { responseBody: d.responseBody } : {}),
      },
      null,
      2,
    );

    card.append(head, urlLine, detailPre);
    networkDetailEl.appendChild(card);
  }
}

function renderStoragePane(): void {
  attachStorageBtn.update({ disabled: !storageData });
  storageBodyEl.innerHTML = "";
  if (!storageData) {
    mountEmpty(storageBodyEl, {
      title: "No storage loaded",
      body: "Select an active session to view credential-redacted cookies, localStorage, and sessionStorage.",
    });
    return;
  }

  const cookieCard = document.createElement("article");
  cookieCard.className = "obs-card";
  const cookieTitle = document.createElement("h2");
  cookieTitle.className = "obs-title";
  cookieTitle.textContent = `Cookies (${storageData.cookies.length})`;
  const cookiePre = document.createElement("pre");
  cookiePre.className = "obs-pre";
  cookiePre.textContent =
    storageData.cookies.length === 0
      ? "No cookies set on current origin."
      : JSON.stringify(storageData.cookies, null, 2);
  cookieCard.append(cookieTitle, cookiePre);

  const localCard = document.createElement("article");
  localCard.className = "obs-card";
  const localTitle = document.createElement("h2");
  localTitle.className = "obs-title";
  localTitle.textContent = `localStorage (${Object.keys(storageData.localStorage).length})`;
  const localPre = document.createElement("pre");
  localPre.className = "obs-pre";
  localPre.textContent =
    Object.keys(storageData.localStorage).length === 0
      ? "Empty"
      : JSON.stringify(storageData.localStorage, null, 2);
  localCard.append(localTitle, localPre);

  const sessCard = document.createElement("article");
  sessCard.className = "obs-card";
  const sessTitle = document.createElement("h2");
  sessTitle.className = "obs-title";
  sessTitle.textContent = `sessionStorage (${Object.keys(storageData.sessionStorage).length})`;
  const sessPre = document.createElement("pre");
  sessPre.className = "obs-pre";
  sessPre.textContent =
    Object.keys(storageData.sessionStorage).length === 0
      ? "Empty"
      : JSON.stringify(storageData.sessionStorage, null, 2);
  sessCard.append(sessTitle, sessPre);

  storageBodyEl.append(cookieCard, localCard, sessCard);
}

host.onReady((ctx) => {
  applyHostReady(ctx, document.documentElement);
  if (!mounted) {
    mounted = true;
    buildObservatoryDom();
    void refreshAll();
  } else {
    render();
  }
});

host.onServiceEvent((ev) => {
  if (ev.topic === "state" && ev.data && typeof ev.data === "object") {
    snapshot = { ...snapshot, state: ev.data as unknown as DockStateSnapshot };
    render();
    return;
  }
  if (ev.topic === "activity" && ev.data && typeof ev.data === "object") {
    const item = ev.data as unknown as ActivityEventItem;
    if (item.session === effectiveSession()) {
      const idx = snapshot.activity.findIndex((a) => a.id === item.id);
      const nextAct =
        idx >= 0
          ? snapshot.activity.map((a, i) => (i === idx ? item : a))
          : [...snapshot.activity, item];
      snapshot = { ...snapshot, activity: nextAct };
      if (activeTab === "activity") renderActivityPane();
      tabsHandle.update({
        activeId: activeTab,
        items: [
          {
            id: "activity",
            label: "Activity",
            count: snapshot.activity.length,
          },
          {
            id: "console",
            label: "Console",
            count: snapshot.consoleEvents.length,
          },
          {
            id: "network",
            label: "Network",
            ...(networkItems.length ? { count: networkItems.length } : {}),
          },
          { id: "storage", label: "Storage" },
        ],
      });
    }
    return;
  }
  if (ev.topic === "console" && ev.data && typeof ev.data === "object") {
    const item = ev.data as unknown as ConsoleEventItem;
    if (item.session === effectiveSession()) {
      snapshot = {
        ...snapshot,
        consoleEvents: [...snapshot.consoleEvents, item],
      };
      if (activeTab === "console") renderConsolePane();
    }
  }
});
