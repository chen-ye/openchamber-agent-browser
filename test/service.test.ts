import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { guestStatusViewSchema } from "@openchamber/sdk/schemas";
import {
  discoverDaemonSessions,
  execAgentBrowserCli,
} from "../service/daemon-client.ts";
import {
  startExtensionServer,
  type RunningExtensionServer,
} from "../service/server.ts";
import {
  nextAvailableSessionName,
  normalizeNavigationUrl,
  sanitizeSessionName,
  type DockStateSnapshot,
} from "../shared/types.ts";

const SERVICE_TOKEN = "test-service-token-ab";
const TEST_SESSION_ID = "ses_abtest99";
const EXPECTED_AB_SESSION = `oc-${TEST_SESSION_ID}`;

describe("agent-browser OpenChamber extension service (real daemon e2e)", () => {
  let fixtureServer: http.Server;
  let fixtureBaseUrl = "";
  let hostCallbackServer: http.Server;
  let hostCallbackUrl = "";
  const emittedEvents: Array<{ topic: string; data: unknown }> = [];
  const instructionUpdates: string[] = [];
  let extServer: RunningExtensionServer;
  let dataDir = "";

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-ab-test-"));

    fixtureServer = http.createServer((req, res) => {
      const u = new URL(req.url ?? "/", "http://127.0.0.1");
      if (u.pathname === "/api/ping") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            pong: true,
            echoedToken: u.searchParams.get("api_key"),
          }),
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html>
<html>
  <head><title>Fixture Shop</title></head>
  <body style="margin:0;padding:24px;font-family:sans-serif;">
    <h1>Fixture Shop</h1>
    <button id="buy-btn" style="width:160px;height:44px;" onclick="document.getElementById('out').textContent = 'Bought:' + document.getElementById('tier').value">Buy Widget</button>
    <select id="tier" aria-label="Plan tier">
      <option value="starter">Starter Plan</option>
      <option value="pro">Pro Plan</option>
    </select>
    <input id="notes" placeholder="Order notes" />
    <p id="out">Idle</p>
    <script>
      console.error('Fixture warning error log');
      fetch('/api/ping?api_key=supersecret999&item=widget').catch(() => {});
    </script>
  </body>
</html>`);
    });

    await new Promise<void>((resolve) => {
      fixtureServer.listen(0, "127.0.0.1", () => {
        const addr = fixtureServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        fixtureBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    hostCallbackServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            method?: string;
            input?: { topic?: string; data?: unknown; text?: string };
          };
          if (parsed.method === "panels.emit" && parsed.input?.topic) {
            emittedEvents.push({
              topic: parsed.input.topic,
              data: parsed.input.data,
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: { delivered: true } }));
            return;
          }
          if (parsed.method === "instructions.set") {
            instructionUpdates.push(parsed.input?.text ?? "");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ result: { saved: true } }));
            return;
          }
        } catch {
          // Ignore malformed callback test payloads.
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: { saved: true } }));
      });
    });

    await new Promise<void>((resolve) => {
      hostCallbackServer.listen(0, "127.0.0.1", () => {
        const addr = hostCallbackServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        hostCallbackUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    extServer = await startExtensionServer({
      port: 0,
      token: SERVICE_TOKEN,
      dataDir,
      env: {
        ...process.env,
        OPENCHAMBER_SERVICE_TOKEN: SERVICE_TOKEN,
        OPENCHAMBER_HOST_CALLBACK_URL: hostCallbackUrl,
      },
    });
  }, 30000);

  afterAll(async () => {
    await execAgentBrowserCli(["--session", EXPECTED_AB_SESSION, "close"], {
      timeoutMs: 8000,
    }).catch(() => {});
    await extServer?.close();
    await new Promise<void>((resolve) => fixtureServer.close(() => resolve()));
    await new Promise<void>((resolve) =>
      hostCallbackServer.close(() => resolve()),
    );
    fs.rmSync(dataDir, { recursive: true, force: true });
  }, 20000);

  const authFetch = (
    urlPath: string,
    init: Omit<RequestInit, "headers"> & {
      headers?: Record<string, string>;
    } = {},
  ) =>
    fetch(`http://127.0.0.1:${extServer.port}${urlPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
        ...init.headers,
      },
    });

  test("enforces bearer token on /health", async () => {
    const unauth = await fetch(`http://127.0.0.1:${extServer.port}/health`);
    expect(unauth.status).toBe(401);

    const ok = await authFetch("/health");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
  });

  test("drives openchamber_web provider actions over a real agent-browser daemon", async () => {
    const callProvider = async (
      action: string,
      parameters: Record<string, unknown>,
    ) => {
      const res = await authFetch("/browser-control", {
        method: "POST",
        body: JSON.stringify({
          requestId: `req-${Date.now()}`,
          action,
          parameters,
          context: { directory: "/tmp", sessionId: TEST_SESSION_ID },
        }),
      });
      expect(res.status).toBe(200);
      return (await res.json()) as {
        ok: boolean;
        data?: Record<string, unknown>;
        error?: string;
      };
    };

    const preSnap = await callProvider("browser.snapshot", {});
    expect(preSnap.ok).toBe(false);
    expect(preSnap.error).toContain(`session "${EXPECTED_AB_SESSION}"`);

    const opened = await callProvider("browser.open", {
      url: fixtureBaseUrl,
      viewport: "desktop",
    });
    expect(opened.ok).toBe(true);
    expect(opened.data?.title).toBe("Fixture Shop");
    expect(opened.data?.session).toBe(EXPECTED_AB_SESSION);

    // Trigger a reload after WS attaches so console & network traffic are captured live.
    await authFetch("/api/session/select", {
      method: "POST",
      body: JSON.stringify({ session: EXPECTED_AB_SESSION }),
    });
    await authFetch("/api/network?session=" + EXPECTED_AB_SESSION);
    await authFetch("/api/nav", {
      method: "POST",
      body: JSON.stringify({ op: "reload" }),
    });

    const snap = await callProvider("browser.snapshot", {});
    expect(snap.ok).toBe(true);
    expect(snap.data?.session).toBe(EXPECTED_AB_SESSION);
    expect(String(snap.data?.text)).toContain("Fixture Shop");
    const elements = snap.data?.elements as Array<Record<string, unknown>>;
    expect(elements.some((e) => e.selector === "#buy-btn")).toBe(true);
    expect(
      elements.some((e) => e.selector === "#tier" && Array.isArray(e.options)),
    ).toBe(true);

    const badSelect = await callProvider("browser.select", {
      selector: "#tier",
      label: "Nonexistent",
    });
    expect(badSelect.ok).toBe(false);

    const goodSelect = await callProvider("browser.select", {
      selector: "#tier",
      label: "Pro Plan",
    });
    expect(goodSelect.ok).toBe(true);
    expect(goodSelect.data?.value).toBe("pro");

    const clicked = await callProvider("browser.click", { text: "Buy Widget" });
    expect(clicked.ok).toBe(true);

    const inspected = await callProvider("browser.inspect", {
      selector: "#out",
    });
    expect(inspected.ok).toBe(true);
    expect(inspected.data?.label).toBe("Bought:pro");

    const captured = await callProvider("browser.capture", {});
    expect(captured.ok).toBe(true);
    expect(captured.data?.mime).toBe("image/png");
    expect(String(captured.data?.base64).length).toBeGreaterThan(200);
  }, 45000);

  test("streams live JPEG surface frames, enforces user control lock, and picks @eN elements", async () => {
    const frameRes = await authFetch("/surface/frame?after=0&wait=5000");
    expect(frameRes.status).toBe(200);
    expect(frameRes.headers.get("content-type")).toBe("image/jpeg");
    const firstSeq = Number(frameRes.headers.get("x-surface-seq"));
    expect(firstSeq).toBeGreaterThanOrEqual(1);
    const jpegBytes = Buffer.from(await frameRes.arrayBuffer());
    expect(jpegBytes[0]).toBe(0xff);
    expect(jpegBytes[1]).toBe(0xd8);

    // Take user control and confirm agent provider calls pause respectfully.
    const ctrlRes = await authFetch("/surface/control", {
      method: "POST",
      body: JSON.stringify({ controller: "user", viewer: "viewer-1" }),
    });
    expect(ctrlRes.status).toBe(204);

    const blockedRes = await authFetch("/browser-control", {
      method: "POST",
      body: JSON.stringify({
        requestId: "req-blocked",
        action: "browser.click",
        parameters: { selector: "#buy-btn" },
        context: { directory: "/tmp", sessionId: TEST_SESSION_ID },
      }),
    });
    const blockedJson = (await blockedRes.json()) as {
      ok: boolean;
      error?: string;
    };
    expect(blockedJson.ok).toBe(false);
    expect(blockedJson.error).toContain("user currently controls");
    expect(blockedJson.error).toContain(EXPECTED_AB_SESSION);

    // Read exact #buy-btn bounding box center so Pick click lands squarely on the button.
    const rectEvalRes = await authFetch("/api/eval", {
      method: "POST",
      body: JSON.stringify({
        session: EXPECTED_AB_SESSION,
        expression: `(() => { const r = document.getElementById('buy-btn').getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; })()`,
      }),
    });
    const rectEvalJson = (await rectEvalRes.json()) as {
      ok: boolean;
      output: string;
    };
    const { cx, cy } = JSON.parse(rectEvalJson.output) as {
      cx: number;
      cy: number;
    };

    // Activate Pick @eN mode and click on #buy-btn's exact center.
    const modeRes = await authFetch("/api/mode", {
      method: "POST",
      body: JSON.stringify({ mode: "pick", colorScheme: "dark" }),
    });
    expect(modeRes.status).toBe(200);

    const pickInputRes = await authFetch("/surface/input", {
      method: "POST",
      body: JSON.stringify({
        events: [
          {
            type: "pointer",
            action: "down",
            x: cx,
            y: cy,
            button: 0,
            buttons: 1,
            modifiers: { alt: false, ctrl: false, meta: false, shift: false },
          },
        ],
      }),
    });
    expect(pickInputRes.status).toBe(204);

    for (
      let i = 0;
      i < 20 && !emittedEvents.some((e) => e.topic === "element-picked");
      i += 1
    ) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const pickedEvent = emittedEvents.find((e) => e.topic === "element-picked");
    expect(pickedEvent).toBeDefined();
    const pickedData = pickedEvent?.data as {
      selector: string;
      ref: string | null;
      tag: string;
    };
    expect(pickedData.selector).toBe("#buy-btn");
    expect(pickedData.tag).toBe("button");
    expect(pickedData.ref).toMatch(/^@e\d+$/);

    // Release user control.
    await authFetch("/surface/control", {
      method: "POST",
      body: JSON.stringify({ controller: "none" }),
    });
  }, 30000);

  test("retargets surface to bundled Chrome DevTools and enforces 409 frame fencing", async () => {
    const beforeStateRes = await authFetch("/api/state");
    const beforeState = (await beforeStateRes.json()) as {
      viewGeneration: number;
    };

    const dtRes = await authFetch("/api/mode", {
      method: "POST",
      body: JSON.stringify({ mode: "devtools", colorScheme: "dark" }),
    });
    expect(dtRes.status).toBe(200);
    const dtState = (await dtRes.json()) as {
      mode: string;
      viewGeneration: number;
    };
    expect(dtState.mode).toBe("devtools");
    expect(dtState.viewGeneration).toBeGreaterThan(beforeState.viewGeneration);

    // Stale frame seq 1 must be fenced with HTTP 409 after switching to DevTools.
    const staleInput = await authFetch("/surface/input", {
      method: "POST",
      headers: { "x-surface-frame-seq": "1" },
      body: JSON.stringify({
        events: [{ type: "text", text: "stale" }],
      }),
    });
    expect(staleInput.status).toBe(409);

    // Wait for DevTools bundled inspector.html to paint its first JPEG frame.
    const dtFrame = await authFetch("/surface/frame?after=0&wait=8000");
    expect(dtFrame.status).toBe(200);
    expect(dtFrame.headers.get("x-surface-title")).toContain("DevTools");

    // Return cleanly to viewport mode.
    const backToVp = await authFetch("/api/mode", {
      method: "POST",
      body: JSON.stringify({ mode: "viewport" }),
    });
    expect(backToVp.status).toBe(200);
  }, 30000);

  test("serves schema-valid Work Status, redacted Network details, and @Browser mentions", async () => {
    const statusRes = await authFetch("/status");
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    const parsedStatus = guestStatusViewSchema.safeParse(statusJson);
    expect(parsedStatus.success).toBe(true);
    if (parsedStatus.success) {
      for (const ctrl of parsedStatus.data.controls ?? []) {
        expect(ctrl.label.length).toBeLessThanOrEqual(6);
      }
      const sessRow = parsedStatus.data.rows.find(
        (r) => r.kind === "line" && r.id.startsWith("sess-"),
      );
      const pageRow = parsedStatus.data.rows.find(
        (r) => r.kind === "line" && r.id.startsWith("page-"),
      );
      expect(sessRow?.kind === "line" && sessRow.content).toBeUndefined();
      expect(pageRow?.kind === "line" && pageRow.content).toBeUndefined();
      if (sessRow?.kind === "line" && sessRow.badge) {
        expect(sessRow.badge.label).not.toContain(" ");
      }
    }

    const searchRes = await authFetch("/mentions/search", {
      method: "POST",
      body: JSON.stringify({ query: EXPECTED_AB_SESSION, directory: "/tmp" }),
    });
    const searchJson = (await searchRes.json()) as {
      items: Array<{ id: string; title: string }>;
    };
    expect(searchJson.items.length).toBeGreaterThanOrEqual(4);

    const netResolve = await authFetch("/mentions/resolve", {
      method: "POST",
      body: JSON.stringify({ id: `${EXPECTED_AB_SESSION}:network` }),
    });
    const netText = ((await netResolve.json()) as { text: string }).text;
    expect(netText).toContain("/api/ping");
    expect(netText).not.toContain("supersecret999");
    expect(netText).toContain("[REDACTED]");

    expect(
      instructionUpdates.some(
        (t) =>
          t.includes(EXPECTED_AB_SESSION) &&
          t.includes("network requests") &&
          t.includes("oc-<sessionId[:16]>") &&
          t.includes("env -u NO_PROXY"),
      ),
    ).toBe(true);
  }, 20000);

  test("validates session naming and URL normalization helpers", () => {
    expect(sanitizeSessionName("  --help  ")).toBe("help");
    expect(sanitizeSessionName("---")).toMatch(/^session-/);
    expect(sanitizeSessionName("a".repeat(80)).length).toBeLessThanOrEqual(48);

    expect(nextAvailableSessionName([])).toBe("default");
    expect(nextAvailableSessionName(["session-2"])).toBe("default");
    expect(nextAvailableSessionName(["default", "session-2"])).toBe(
      "session-3",
    );
    expect(nextAvailableSessionName(["default", "session-3"])).toBe(
      "session-2",
    );

    expect(normalizeNavigationUrl("localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(normalizeNavigationUrl("127.0.0.1:8080/app")).toBe(
      "http://127.0.0.1:8080/app",
    );
    expect(normalizeNavigationUrl("myapp.local:5173")).toBe(
      "https://myapp.local:5173",
    );
    expect(normalizeNavigationUrl("about:blank")).toBe("about:blank");
    expect(normalizeNavigationUrl("", "about:blank")).toBe("about:blank");
    expect(() => normalizeNavigationUrl("javascript:alert(1)")).toThrow(
      "Unsupported URL scheme",
    );
  });

  test("creates new sessions with scheme-less URLs, rejects duplicates with 409, and cleans up failed daemons", async () => {
    // Obtain a guaranteed-closed loopback port so navigation fails deterministically.
    const closedPort = await new Promise<number>((resolve) => {
      const probe = http.createServer();
      probe.listen(0, "127.0.0.1", () => {
        const addr = probe.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        probe.close(() => resolve(port));
      });
    });

    const failSession = `oc-fail-${Date.now().toString(36)}`;
    try {
      const failRes = await authFetch("/api/session/create", {
        method: "POST",
        body: JSON.stringify({
          session: failSession,
          url: `127.0.0.1:${closedPort}`,
        }),
      });
      expect(failRes.status).toBe(500);
      const failBody = (await failRes.json()) as { message?: string };
      expect(failBody.message).toBeTruthy();
      expect(
        discoverDaemonSessions().some((s) => s.session === failSession),
      ).toBe(false);
    } finally {
      await execAgentBrowserCli(["--session", failSession, "close"], {
        timeoutMs: 4000,
      }).catch(() => {});
    }

    const okSession = `oc-create-${Date.now().toString(36)}`;
    const fixtureHostPort = new URL(fixtureBaseUrl).host;
    try {
      const okRes = await authFetch("/api/session/create", {
        method: "POST",
        body: JSON.stringify({
          session: okSession,
          url: fixtureHostPort,
        }),
      });
      expect(okRes.status).toBe(200);
      const okState = (await okRes.json()) as DockStateSnapshot;
      expect(okState.activeSession).toBe(okSession);
      const createdSummary = okState.sessions.find(
        (s) => s.session === okSession,
      );
      expect(createdSummary).toBeDefined();
      expect(createdSummary?.url).toContain(fixtureHostPort);

      const dupRes = await authFetch("/api/session/create", {
        method: "POST",
        body: JSON.stringify({
          session: okSession,
          url: fixtureBaseUrl,
        }),
      });
      expect(dupRes.status).toBe(409);

      const navRes = await authFetch("/api/nav", {
        method: "POST",
        body: JSON.stringify({
          op: "navigate",
          url: `${fixtureHostPort}/?from=nav`,
        }),
      });
      expect(navRes.status).toBe(200);
      const navState = (await navRes.json()) as DockStateSnapshot;
      expect(
        navState.sessions.find((s) => s.session === okSession)?.url,
      ).toContain("from=nav");

      // Pinning okSession prevents browser.open from switching away.
      const pinRes = await authFetch("/api/session/pin", {
        method: "POST",
        body: JSON.stringify({ pinned: true }),
      });
      expect(pinRes.status).toBe(200);
      expect(((await pinRes.json()) as DockStateSnapshot).sessionPinned).toBe(
        true,
      );

      await authFetch("/browser-control", {
        method: "POST",
        body: JSON.stringify({
          requestId: `req-pin-${Date.now()}`,
          action: "browser.open",
          parameters: { url: `${fixtureBaseUrl}/?pinned=1` },
          context: { directory: "/tmp", sessionId: TEST_SESSION_ID },
        }),
      });
      await new Promise((r) => setTimeout(r, 150));
      const pinnedState = (await (
        await authFetch("/api/state")
      ).json()) as DockStateSnapshot;
      expect(pinnedState.activeSession).toBe(okSession);

      // Unpinning while user controls okSession still must not steal focus.
      await authFetch("/api/session/pin", {
        method: "POST",
        body: JSON.stringify({ pinned: false }),
      });
      await authFetch("/surface/control", {
        method: "POST",
        body: JSON.stringify({ controller: "user", viewer: "viewer-pin" }),
      });
      await authFetch("/browser-control", {
        method: "POST",
        body: JSON.stringify({
          requestId: `req-user-${Date.now()}`,
          action: "browser.open",
          parameters: { url: `${fixtureBaseUrl}/?user=1` },
          context: { directory: "/tmp", sessionId: TEST_SESSION_ID },
        }),
      });
      await new Promise((r) => setTimeout(r, 150));
      const userHeldState = (await (
        await authFetch("/api/state")
      ).json()) as DockStateSnapshot;
      expect(userHeldState.activeSession).toBe(okSession);

      // Releasing user control lets browser.open auto-follow to EXPECTED_AB_SESSION.
      await authFetch("/surface/control", {
        method: "POST",
        body: JSON.stringify({ controller: "none" }),
      });
      await authFetch("/browser-control", {
        method: "POST",
        body: JSON.stringify({
          requestId: `req-follow-${Date.now()}`,
          action: "browser.open",
          parameters: { url: `${fixtureBaseUrl}/?follow=1` },
          context: { directory: "/tmp", sessionId: TEST_SESSION_ID },
        }),
      });
      let followed = "";
      for (let i = 0; i < 20; i += 1) {
        const st = (await (
          await authFetch("/api/state")
        ).json()) as DockStateSnapshot;
        followed = st.activeSession ?? "";
        if (followed === EXPECTED_AB_SESSION) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(followed).toBe(EXPECTED_AB_SESSION);
    } finally {
      await authFetch("/surface/control", {
        method: "POST",
        body: JSON.stringify({ controller: "none" }),
      }).catch(() => {});
      await authFetch("/api/session/close", {
        method: "POST",
        body: JSON.stringify({ session: okSession }),
      }).catch(() => {});
      await execAgentBrowserCli(["--session", okSession, "close"], {
        timeoutMs: 4000,
      }).catch(() => {});
    }
  }, 45000);

  test("creates a default session from scheme-less omnibox navigate when no session is active", async () => {
    await authFetch("/api/session/close", {
      method: "POST",
      body: JSON.stringify({ session: EXPECTED_AB_SESSION }),
    });
    const stateBefore = (await (
      await authFetch("/api/state")
    ).json()) as DockStateSnapshot;
    if (stateBefore.sessions.length > 0) {
      // Unrelated host sessions exist on this machine; skip empty-state nav check safely.
      return;
    }

    const fixtureHostPort = new URL(fixtureBaseUrl).host;
    try {
      const navRes = await authFetch("/api/nav", {
        method: "POST",
        body: JSON.stringify({
          op: "navigate",
          url: `${fixtureHostPort}/?empty=1`,
        }),
      });
      expect(navRes.status).toBe(200);
      const navState = (await navRes.json()) as DockStateSnapshot;
      expect(navState.activeSession).toBe("default");
      expect(
        navState.sessions.find((s) => s.session === "default")?.url,
      ).toContain("empty=1");
    } finally {
      await authFetch("/api/session/close", {
        method: "POST",
        body: JSON.stringify({ session: "default" }),
      }).catch(() => {});
      await execAgentBrowserCli(["--session", "default", "close"], {
        timeoutMs: 4000,
      }).catch(() => {});
    }
  }, 30000);
});
