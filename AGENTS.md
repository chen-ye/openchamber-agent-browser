# Agent notes for the Agent Browser extension

## Build and verification

Run `bun run build` after any TypeScript change. OpenChamber serves `panel/main.js`, `panel/observatory.js`, and `service/main.js` directly without compiling `.ts` sources.

Run `bun run typecheck`, `bun run lint`, `bun run check`, `bun run test`, and `bun run test:ui` before finishing changes.

## OpenChamber Work Status (`statusSection.source`) invariants

- **300px card & header controls.** OpenChamber renders `WorkStatusPanel` at `300px` width (`284px` inner scroller, `276px` inner `Line` width, `256px` first-section heading width with `pe-7` for the settings gear). `StatusHeaderControls` caps header buttons at `max-w-[5rem]` (`64px` text box), so `controls[].label` must stay at 6 characters or fewer (`New`, `:4848`).
- **Row columns and fixed height.** In `WorkStatusGuestView`, desktop `Line` rows have fixed `h-7` (`28px`) height. Setting `row.content` locks `row.label` to a rigid `w-24 shrink-0` (`96px`) column; omitting `row.content` gives `row.label` `flex-1 min-w-0 truncate`. Keep session names and host/path URLs on `row.content`-free rows, never inside `chips` (`Chip` uses `shrink-0` without truncation and `chips` wraps onto multiple lines inside `h-7`).
- **Badges and values.** `WorkStatusPill` (`row.badge`) does not set `shrink-0` or `whitespace-nowrap`, so multi-word badge labels must use `\u00A0` (such as `249\u00A0err`) to prevent 2-line wrapping. `row.value` uses `shrink-0` without truncation, so keep values compact (`<= 16` characters) and keep two-click `confirm` prompts short (`Close?`).

## Upstream `agent-browser` quirks

- `agent-browser <= 0.43.0` checks `resp["status"] == "success"` instead of `resp["success"] == true` when broadcasting WebSocket `result` events, emitting `success: false` on succeeded commands with non-null `data`. Check `msg.error` and `msg.data` rather than trusting `msg.success` alone.
- OpenChamber strips `XDG_RUNTIME_DIR`, proxy env vars (`NO_PROXY`/`no_proxy`/`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` — see `INHERITED_SERVICE_ENV_NAMES` in OpenChamber's `guests/service.js`), and non-allowlisted `AGENT_BROWSER_*` env vars (such as `AGENT_BROWSER_EXECUTABLE_PATH`) from guest service environments:
  - Daemon socket discovery must check `/run/user/<uid>/agent-browser` explicitly.
  - In `agent-browser` (`0.41.1` silently with `relaunchedBrowser: false`; `0.43.0` with `relaunchedBrowser: true` and `settings.changes`), if the extension service starts a daemon without `NO_PROXY`/`no_proxy`/`HTTP_PROXY`/`AGENT_BROWSER_*` and a subsequent shell CLI call has any of them set (e.g. `NO_PROXY=127.0.0.1,localhost,::1` causing `proxy-bypass: default → 127.0.0.1,localhost,::1 (--proxy-bypass), relaunched browser`), `agent-browser` hashes a `launchHash` mismatch and kills & relaunches Chrome to `about:blank` inside the same daemon (keeping pre-relaunch `network requests` in daemon memory).
  - From shell, invoke CLI commands against extension-started daemons with `env -u NO_PROXY -u no_proxy -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy -u ALL_PROXY -u all_proxy agent-browser --session <name> ...` (or set `"proxyBypass": ""` in local `~/.agent-browser/config.json` to neutralize `NO_PROXY`/`no_proxy` fallback; note `"proxy": ""` passes a bare `--proxy-server` flag to Chrome so prefer `env -u` or host allowlisting). Put user-level defaults like `executablePath` in local `~/.agent-browser/config.json` (read via `HOME`) rather than shell-only env vars.
- **Redaction boundary:** Observatory (`/api/network`, `/api/network/detail`, `/api/storage`) and `@Browser` mentions intentionally redact credentials via `service/redact.ts`, whereas `agent-browser --session <name> network request <id> --json` / `cookies get --json` / `storage local --json` return raw headers/tokens behind OpenCode shell approval.
