# Agent Browser — OpenChamber Extension

OpenChamber extension (`@openchamber/sdk@2.7.0`) integrating [`agent-browser`](https://agent-browser.dev) daemons and observability (`https://agent-browser.dev/dashboard`) directly into OpenChamber.

## Surfaces

- **Rail Panel (`service.surface: true` + Top Dock `panel/index.html`)**:
  - Live sequence-acked JPEG viewport (`?pacing=ack`) with OpenChamber **Agent ↔ User control handoff**, `409` stale-frame view fencing, Retina `1–3x` screen DPR scaling, and multi-click/drag/AltGr/soft-keyboard input handling.
  - 2-row responsive toolbar with session switcher, tab strip, URL omnibox, expandable **Activity** (`⚡`) and **Console / Page Errors** (`✕`) drawers (`host.onServiceEvent`), viewport presets, **`🎯 Pick @ref`** interactive element picker (attaches `@eN` ref + CSS selector + ARIA role + bounds + computed styles straight to chat), **`</> DevTools`** toggle (streams bundled `devtools://devtools/bundled/inspector.html` at JPEG quality `90` via policy-filtered loopback CDP relay), and **`:4848`** launcher for the stock Next.js dashboard.
- **Full-Screen Page (`panel/observatory.html` — _Agent Browser Observatory_)**:
  - **Activity**: Real-time `command` → `result` timeline with `@eN` params, latency, payload preview, and 1-click _Attach to Chat_.
  - **Console**: Live `console` & `page_error` feed + multi-line JavaScript REPL (`evaluate`).
  - **Network**: Credential-redacted (`[REDACTED]`) master-detail HTTP inspector + HAR capture toggle.
  - **Storage**: Credential-redacted Cookies, `localStorage`, and `sessionStorage` inspector.
- **Work Status (`statusSection.source`)**:
  - Multi-line per-session readout tailored to OpenChamber's `300px` Work Status card: session status dot, error/warning badge, and `Close` action on the session line; active host/path and compact last-command duration on the page line; command latency sparkline; and a dedicated `:4848` dashboard link row + `New` / `:4848` header controls.
- **Composer (`@Browser` Mentions + Dynamic `instructions` + `provides: ["browser"]`)**:
  - `@` menu items (`snapshot`, `errors`, `activity`, `network`), zero-idle-token active session instructions, and full `openchamber_web` headless browser provider support.

## Development

```bash
bun run typecheck   # bun check --no-script
bun run lint        # oxlint --type-aware
bun run build       # openchamber-guest-bundle (panel, observatory, node service)
bun run check       # openchamber-guest-check
bun run test        # unit + real agent-browser daemon integration tests
bun run test:ui     # Playwright real Chromium tests (960px/1280px desktop + 360px mobile)
```
