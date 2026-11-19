# Agent Browser extension for OpenChamber

Integrates [`agent-browser`](https://agent-browser.dev) into OpenChamber with a live interactive browser panel, full-screen Observatory inspector, Work Status controls, `@Browser` mentions, session instructions, and native `openchamber_web` support.

## Setup

### Prerequisites

1. OpenChamber `>= 2.7.0`.
2. Install [`agent-browser`](https://agent-browser.dev) on your `PATH` (or in `~/.local/share/mise/shims`, `~/.local/bin`, `~/.cargo/bin`, `/opt/homebrew/bin`, or `/usr/local/bin`).

### Enable in OpenChamber

1. Open **Settings → Extensions** and add the `agent-browser` folder (or repository URL).
2. Approve the requested permissions (`agent-browser` command execution and chat composer attachment).

### Configuration notes

OpenChamber runs extension services without shell proxy variables (`NO_PROXY`, `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`) or non-allowlisted `AGENT_BROWSER_*` environment variables:

- Put persistent browser defaults such as `executablePath` or `"proxyBypass": ""` in `~/.agent-browser/config.json`.
- When running `agent-browser` from a shell with proxy environment variables set against a session started by OpenChamber, unset them so Chrome does not relaunch to `about:blank`:

```bash
env -u NO_PROXY -u no_proxy -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy -u ALL_PROXY -u all_proxy agent-browser --session <name> <command>
```

## Using Agent Browser in OpenChamber

### Live browser panel and toolbar

The **Agent Browser** panel docks above OpenChamber's live browser viewport. Click or tap the viewport to take control from the agent (pointer, scroll, keyboard, clipboard, and a `⌨` touch keyboard button on touch devices); release control to let the agent resume driving.

Top toolbar row:

- **Session switcher**: Switch between active `agent-browser` sessions (`chat` for `oc-*` sessions driven by `openchamber_web`, `panel` for manual or CLI sessions).
- **Pin (`📌`)**: Keep `browser.open` from switching the panel away from your selected session.
- **`CLI`**: Copy `agent-browser --session <name>` to your clipboard.
- **`⊞ Session`**: Open the inline launcher to start a new session with a custom name and URL (defaults to `https://example.com`).
- **Tab strip**: Switch tabs, open a blank tab (`+`), or close tabs (`×`).
- **`:4848 ↗` / `:4848 ●`**: Start and open the standalone `agent-browser` dashboard at `http://localhost:4848`.

Second toolbar row:

- **Navigation**: Back (`←`), Forward (`→`), Reload (`↻`), and URL bar (defaults `localhost`/`127.0.0.1` to `http://` and other hosts to `https://`).
- **`⚡` Activity drawer**: View recent `agent-browser` commands, parameters, status, and duration, and click **Attach** to send an entry to chat.
- **`✕` / `⚠` Console & errors drawer**: View console warnings, errors, and uncaught page exceptions, and click **Attach** to send an entry to chat.
- **`🎯 Pick @ref`**: Hover any element on the page to preview its `@eN` ref, tag, label, and size, then click to attach its `@eN` ref, CSS selector, ARIA role, accessible name, bounds, text, and computed styles to chat (`Esc` or **Cancel (Esc)** exits).
- **`</> DevTools`**: Open bundled Chrome DevTools inside the viewport for local Chrome sessions.
- **Viewport preset**: Choose **Fit panel**, **Mobile 390×844**, **Tablet 768×1024**, or **Desktop 1280×800**.
- **`▤ Selects`**: Toggle in-page `appearance: base-select` rendering for native `<select>` menus.

### Agent Browser Observatory

Open **Extension pages → Agent Browser Observatory** for a full-screen debugger across any active session:

- **Activity**: Filter recorded commands, `@eN` refs, URLs, and payloads, and click **Attach to Chat**.
- **Console**: Run expressions in the **Live JavaScript REPL** (**Evaluate JS** / **Attach Result**), filter console output and exceptions by level (**All levels**, **Errors & exceptions**, **Warnings**, **Logs & info**), and attach entries to chat.
- **Network**: Filter requests by URL, method, or resource type (**All types**, **XHR / Fetch**, **Document**, **JS / CSS**), inspect redacted request/response headers and bodies, **Attach Request to Chat**, **Clear**, or toggle **Start HAR Capture** / **Stop HAR Capture** (writes `.har` files under the extension data directory's `har/` folder).
- **Storage**: View credential-redacted cookies, `localStorage`, and `sessionStorage`, and click **Attach Summary** to send key/cookie names to chat.

### Work Status panel

The **Agent Browser** section in Work Status shows:

- Header buttons: **New** (starts a new session at `https://example.com`) and **:4848** (starts the standalone dashboard when stopped; when running, a **Dashboard** row with a `:4848` link chip appears instead).
- Per-session rows: session name with status dot, error/warning badge (`N err`, `N warn`) or tab count, a two-click **Close** (`Close?`) button, active host/path with last command duration, and a command latency sparkline once two or more commands are recorded.

### `@Browser` mentions

Type `@` in the chat composer and choose **Browser** to search and attach context from any active session:

- `Interactive @eN Snapshot`
- `Console & Page Errors`
- `Command Activity`
- `Network Requests`

Sensitive headers, query parameters, cookies, and storage values shown in Observatory and `@Browser` mentions are redacted as `[REDACTED]`.

### Session instructions and `openchamber_web`

- **Session instructions**: When sessions are running, OpenChamber receives a live summary of active session names, URLs, error counts, and safe CLI flags; nothing is injected when no sessions are active.
- **Built-in browser provider**: When configured as OpenChamber's browser provider, `openchamber_web` runs each chat in an isolated `oc-<sessionId>` session (`open`, `close`, `snapshot`, `click`, `type`, `select`, `scroll`, `inspect`, `capture`, `back`, `forward`, `resize`), separate from manual `panel` or CLI sessions.

### How the pieces fit together

```text
  agent-browser daemons (Unix socket + WebSocket stream)
        │  frames, tabs, commands, console, CDP
        ▼
  Agent Browser service (redaction, @eN picker, DevTools relay)
        │
        ├──► Top Panel & Live Surface ◄──► User / openchamber_web
        ├──► Observatory Page (Activity, Console REPL, Network/HAR, Storage)
        ├──► Work Status (New, :4848, Close, latency sparklines)
        └──► @Browser Mentions & Session Instructions
```

## Development

```bash
bun run typecheck
bun run lint
bun run build
bun run check
bun run test
bun run test:ui
```
