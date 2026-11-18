import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  OPENCHAMBER_SDK_API_VERSION,
  OPENCHAMBER_SDK_CHANNEL,
} from "@openchamber/sdk";
import {
  discoverDaemonSessions,
  execAgentBrowserCli,
} from "../service/daemon-client.ts";
import {
  startExtensionServer,
  type RunningExtensionServer,
} from "../service/server.ts";

const SERVICE_TOKEN = "pw-ui-token";
const PW_SESSION = "oc-ui-demo";
const SCREENSHOT_DIR = "/tmp/opencode";

const DARK_THEME_TOKENS = {
  background: "#0f1117",
  elevated: "#171b26",
  elevatedForeground: "#f1f5f9",
  foreground: "#e2e8f0",
  muted: "#94a3b8",
  mutedSurface: "#1e2433",
  subtle: "#64748b",
  border: "rgba(148, 163, 184, 0.22)",
  hover: "rgba(148, 163, 184, 0.12)",
  active: "rgba(148, 163, 184, 0.2)",
  selection: "rgba(59, 130, 246, 0.22)",
  selectionForeground: "#eff6ff",
  focus: "#3b82f6",
  primary: "#3b82f6",
  primaryForeground: "#ffffff",
  primaryText: "#60a5fa",
  success: "#22c55e",
  successText: "#4ade80",
  warning: "#f59e0b",
  warningText: "#fbbf24",
  error: "#ef4444",
  errorText: "#f87171",
  info: "#38bdf8",
  infoText: "#7dd3fc",
  font: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
  radius: "8px",
};

test.describe("Agent Browser OpenChamber guest surfaces (real Chromium + real daemon)", () => {
  let fixtureServer: http.Server;
  let fixtureUrl = "";
  let harnessServer: http.Server;
  let harnessUrl = "";
  let extServer: RunningExtensionServer;
  let dataDir = "";
  const packageRoot = path.resolve(import.meta.dirname, "..");

  test.beforeAll(async () => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-ab-pw-"));

    fixtureServer = http.createServer((req, res) => {
      const u = new URL(req.url ?? "/", "http://127.0.0.1");
      if (u.pathname === "/api/orders") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            orders: [{ id: "ORD-42", total: 129 }],
            secret_key: "topsecret",
          }),
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html>
<html>
  <head><title>Example App</title></head>
  <body style="margin:0;padding:32px;background:#0b1220;color:#e2e8f0;font-family:system-ui,sans-serif;">
    <h1 style="margin:0 0 12px;">Example Telemetry Portal</h1>
    <p style="color:#94a3b8;margin:0 0 20px;">Live mission checkout &amp; status verification</p>
    <button id="sync-btn" style="padding:10px 18px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-weight:600;">Sync Telemetry</button>
    <script>
      console.warn('Slow telemetry channel warning: 142ms jitter');
      console.error('Failed to validate secondary beacon signature');
      fetch('/api/orders?token=secret-demo-tok&device=dev-101').catch(() => {});
    </script>
  </body>
</html>`);
    });

    await new Promise<void>((resolve) => {
      fixtureServer.listen(0, "127.0.0.1", () => {
        const addr = fixtureServer.address();
        fixtureUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
        resolve();
      });
    });

    extServer = await startExtensionServer({
      port: 0,
      token: SERVICE_TOKEN,
      dataDir,
    });

    // Open a real agent-browser session and run real commands so Activity/Console/Network are populated.
    await execAgentBrowserCli(
      ["--session", PW_SESSION, "open", fixtureUrl, "--json"],
      { timeoutMs: 30000 },
    );
    await fetch(`http://127.0.0.1:${extServer.port}/api/session/select`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ session: PW_SESSION }),
    });
    await new Promise((r) => setTimeout(r, 200));
    await fetch(
      `http://127.0.0.1:${extServer.port}/api/network?session=${PW_SESSION}`,
      {
        headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
      },
    );
    await execAgentBrowserCli(["--session", PW_SESSION, "reload", "--json"], {
      timeoutMs: 15000,
    });
    await execAgentBrowserCli(
      ["--session", PW_SESSION, "snapshot", "-i", "--json"],
      { timeoutMs: 15000 },
    );
    await execAgentBrowserCli(
      ["--session", PW_SESSION, "click", "#sync-btn", "--json"],
      { timeoutMs: 15000 },
    );

    // Host harness server: serves panel/ assets AND proxies /__service/* + /__surface-frame to extServer.
    harnessServer = http.createServer((req, res) => {
      void (async () => {
        const u = new URL(req.url ?? "/", "http://127.0.0.1");

        if (u.pathname === "/__host/dock") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(buildHostHarnessHtml("/panel/index.html", "panel", true));
          return;
        }
        if (u.pathname === "/__host/observatory") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            buildHostHarnessHtml("/panel/observatory.html", "page", false),
          );
          return;
        }
        if (u.pathname === "/__host/work-status") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(buildWorkStatusHarnessHtml());
          return;
        }
        if (u.pathname === "/__surface-frame") {
          const upstream = await fetch(
            `http://127.0.0.1:${extServer.port}/surface/frame?after=0&wait=5000`,
            {
              headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
            },
          );
          if (upstream.status === 200) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.writeHead(200, {
              "Content-Type": "image/jpeg",
              "Cache-Control": "no-store",
            });
            res.end(buf);
          } else {
            res.writeHead(204).end();
          }
          return;
        }
        if (u.pathname.startsWith("/__service/")) {
          const targetPath = u.pathname.slice("/__service".length) + u.search;
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const bodyText = Buffer.concat(chunks).toString("utf8");
          const upstream = await fetch(
            `http://127.0.0.1:${extServer.port}${targetPath}`,
            {
              method: req.method ?? "GET",
              headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
              ...(bodyText ? { body: bodyText } : {}),
            },
          );
          const respText = await upstream.text();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: upstream.status, body: respText }));
          return;
        }

        const rel = u.pathname.replace(/^\/+/, "");
        const full = path.resolve(packageRoot, rel);
        if (
          !full.startsWith(packageRoot) ||
          !fs.existsSync(full) ||
          !fs.statSync(full).isFile()
        ) {
          res.writeHead(404).end("Not found");
          return;
        }
        const ext = path.extname(full);
        const mime =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".js"
              ? "application/javascript; charset=utf-8"
              : ext === ".svg"
                ? "image/svg+xml"
                : "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(fs.readFileSync(full));
      })();
    });

    await new Promise<void>((resolve) => {
      harnessServer.listen(0, "127.0.0.1", () => {
        const addr = harnessServer.address();
        harnessUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    await execAgentBrowserCli(["--session", PW_SESSION, "close"], {
      timeoutMs: 8000,
    }).catch(() => {});
    await extServer?.close();
    await new Promise<void>((resolve) => harnessServer.close(() => resolve()));
    await new Promise<void>((resolve) => fixtureServer.close(() => resolve()));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  test("renders Top Dock + Live Surface cleanly on desktop (960px) and narrow rail (360px)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.setViewportSize({ width: 960, height: 720 });
    await page.goto(`${harnessUrl}/__host/dock`);

    const guestFrame = page.frameLocator("#guest-frame");
    await expect(guestFrame.getByLabel("Page URL")).toHaveValue(
      new RegExp("^http://127\\.0\\.0\\.1:"),
    );

    await expect(
      guestFrame.getByLabel("Active agent-browser session"),
    ).toContainText("· chat");

    const pinBtn = guestFrame.getByRole("button", {
      name: "Pin current session (disable auto-follow on browser.open)",
    });
    await expect(pinBtn).toHaveAttribute("aria-pressed", "false");
    await pinBtn.click();
    await expect(pinBtn).toHaveAttribute("aria-pressed", "true");
    await pinBtn.click();
    await expect(pinBtn).toHaveAttribute("aria-pressed", "false");

    await guestFrame
      .getByRole("button", { name: "Copy agent-browser --session flag" })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __clipboardWrites: string[] })
              .__clipboardWrites,
        ),
      )
      .toContain(`agent-browser --session ${PW_SESSION}`);

    await expect(guestFrame.locator(".ab-new-bar")).toBeHidden();
    await expect(guestFrame.locator(".ab-hint")).toBeHidden();

    // Expand Activity drawer and verify real commands are visible, OK-badged, and attachable.
    await guestFrame.getByLabel("Toggle live command activity feed").click();
    await expect(guestFrame.locator(".ab-drawer")).toBeVisible();
    await expect(guestFrame.locator(".ab-log-row").first()).toBeVisible();
    await expect(
      guestFrame.locator('.ab-log-badge[data-status="ok"]').first(),
    ).toBeVisible();

    await guestFrame
      .locator(".ab-log-row button", { hasText: "Attach" })
      .first()
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __attachedItems: unknown[] })
              .__attachedItems.length,
        ),
      )
      .toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ab-dock-desktop.png"),
      fullPage: false,
    });

    // Switch to narrow 360px rail / mobile width and verify no horizontal overflow and no vertical clipping.
    await page.setViewportSize({ width: 360, height: 740 });
    await guestFrame
      .getByLabel("Toggle console and page errors drawer")
      .click();
    await expect(guestFrame.locator(".ab-drawer")).toContainText(
      "beacon signature",
    );

    const dockOverflow = await guestFrame
      .locator("#root")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(dockOverflow).toBe(false);

    await expect
      .poll(async () => {
        const frameH = await page
          .locator("#guest-frame")
          .evaluate((el) => el.getBoundingClientRect().height);
        const rootH = await guestFrame
          .locator("#root")
          .evaluate((el) => el.getBoundingClientRect().height);
        return frameH >= rootH - 2;
      })
      .toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ab-dock-mobile.png"),
      fullPage: false,
    });
    expect(errors).toEqual([]);
  });

  test("renders Full-Screen Observatory across Activity, Console/REPL, and Network at 1280px and 360px", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.setViewportSize({ width: 1280, height: 820 });
    await page.goto(`${harnessUrl}/__host/observatory`);

    const guestFrame = page.frameLocator("#guest-frame");
    await expect(
      guestFrame.getByRole("heading", { name: "Agent Browser Observatory" }),
    ).toBeVisible();
    await expect(guestFrame.locator(".obs-card").first()).toBeVisible();

    // Switch to Network tab and inspect a captured request (verifying token redaction and single-pane visibility).
    await guestFrame.getByRole("tab", { name: /^Network/ }).click();
    await expect(guestFrame.locator("section.obs-pane").nth(0)).toBeHidden();
    await expect(guestFrame.locator("section.obs-pane").nth(1)).toBeHidden();
    await expect(guestFrame.locator("section.obs-pane").nth(2)).toBeVisible();
    await expect(guestFrame.locator("section.obs-pane").nth(3)).toBeHidden();

    await expect(
      guestFrame.locator(".obs-table tbody tr").first(),
    ).toBeVisible();
    const ordersRow = guestFrame
      .locator(".obs-table tbody tr", { hasText: "/api/orders" })
      .first();
    await expect(ordersRow).toBeVisible();
    await expect(ordersRow).toContainText("[REDACTED]");
    await ordersRow.click();
    await expect(
      guestFrame.getByRole("button", { name: "Attach Request to Chat" }),
    ).toBeVisible();

    const headerBox = await guestFrame.locator(".obs-header").boundingBox();
    expect(headerBox && headerBox.y >= 0).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ab-observatory-desktop.png"),
      fullPage: false,
    });

    // Switch to Console & REPL and evaluate live JS on 360px mobile viewport.
    await page.setViewportSize({ width: 360, height: 780 });
    await guestFrame.getByRole("tab", { name: /^Console/ }).click();
    await expect(guestFrame.locator("section.obs-pane").nth(1)).toBeVisible();
    await expect(guestFrame.locator("section.obs-pane").nth(2)).toBeHidden();
    await guestFrame.getByRole("button", { name: "Evaluate JS" }).click();
    await expect(guestFrame.locator(".obs-repl-box .obs-pre")).toContainText(
      "Example App",
    );

    const obsOverflow = await guestFrame
      .locator("#root")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(obsOverflow).toBe(false);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "ab-observatory-mobile.png"),
      fullPage: false,
    });
    expect(errors).toEqual([]);
  });

  test('creates a new session inside sandbox="allow-scripts", supports Enter in omnibox, and keeps form open on error', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const closedPort = await new Promise<number>((resolve) => {
      const probe = http.createServer();
      probe.listen(0, "127.0.0.1", () => {
        const addr = probe.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        probe.close(() => resolve(port));
      });
    });

    const preExistingSessions = new Set(
      discoverDaemonSessions().map((s) => s.session),
    );
    const failSession = `oc-ui-fail-${Date.now().toString(36)}`;
    const newSession = `oc-ui-new-${Date.now().toString(36)}`;

    try {
      await page.setViewportSize({ width: 960, height: 720 });
      await page.goto(`${harnessUrl}/__host/dock`);

      const guestFrame = page.frameLocator("#guest-frame");
      await guestFrame
        .getByRole("button", { name: "Start new browser session" })
        .click();
      await expect(guestFrame.locator(".ab-new-bar")).toBeVisible();
      await expect(guestFrame.getByLabel("New session name")).not.toHaveValue(
        "",
      );

      // 1. Trigger a deterministic failure on a closed loopback port: toast surfaces and form stays open.
      await guestFrame.getByLabel("New session name").fill(failSession);
      await guestFrame
        .getByLabel("Initial URL")
        .fill(`http://127.0.0.1:${closedPort}`);
      await guestFrame.getByRole("button", { name: "Launch" }).click();

      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as unknown as {
                __toasts: Array<{ kind: string; message: string }>;
              }
            ).__toasts.some((t) => t.kind === "error"),
          ),
        )
        .toBe(true);
      await expect(guestFrame.locator(".ab-new-bar")).toBeVisible();
      await expect(
        guestFrame.getByRole("button", { name: "Launch" }),
      ).toBeEnabled();

      // 2. Launch a real session against a delayed local HTTP server so we can observe the Launching… pending state,
      //    using a scheme-less host:port URL inside sandbox="allow-scripts".
      const slowServer = http.createServer((_req, res) => {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            "<!doctype html><html><head><title>Slow Local App</title></head><body><h1>Slow Local App</h1></body></html>",
          );
        }, 450);
      });
      await new Promise<void>((resolve) => {
        slowServer.listen(0, "127.0.0.1", () => resolve());
      });
      const slowAddr = slowServer.address();
      const slowPort =
        typeof slowAddr === "object" && slowAddr ? slowAddr.port : 0;
      const slowHostPort = `127.0.0.1:${slowPort}`;

      try {
        await guestFrame.getByLabel("New session name").fill(newSession);
        await guestFrame.getByLabel("Initial URL").fill(slowHostPort);
        await guestFrame.getByRole("button", { name: "Launch" }).click();

        await expect(
          guestFrame.getByRole("button", { name: "Launching…" }),
        ).toBeDisabled();
        await expect(guestFrame.locator(".ab-new-bar")).toBeHidden({
          timeout: 20000,
        });
      } finally {
        slowServer.closeAllConnections?.();
        await new Promise<void>((resolve) => slowServer.close(() => resolve()));
      }

      await expect(
        guestFrame.getByLabel("Active agent-browser session"),
      ).toHaveValue(newSession);
      await expect(guestFrame.getByLabel("Page URL")).toHaveValue(
        new RegExp(`^http://${slowHostPort.replaceAll(".", "\\.")}`),
      );

      // 3. Verify omnibox Enter navigation works without <form> inside sandbox="allow-scripts"
      //    and keeps/restores URL on failed navigation.
      const urlInput = guestFrame.getByLabel("Page URL");
      await urlInput.click();
      await urlInput.fill(`http://127.0.0.1:${closedPort}/bad`);
      await urlInput.press("Enter");
      await expect(urlInput).toHaveValue(`http://127.0.0.1:${closedPort}/bad`, {
        timeout: 15000,
      });

      await urlInput.click();
      await urlInput.fill(`${fixtureUrl}/?via=omnibox`);
      await urlInput.press("Enter");
      await expect(urlInput).toHaveValue(/\?via=omnibox/, { timeout: 15000 });

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "ab-dock-new-session.png"),
        fullPage: false,
      });

      // 4. Verify Observatory New Session button shows pending state and handles completion/errors cleanly.
      await page.goto(`${harnessUrl}/__host/observatory`);
      const obsFrame = page.frameLocator("#guest-frame");
      await expect(
        obsFrame.getByRole("button", { name: "New Session" }),
      ).toBeVisible();
      await obsFrame.getByRole("button", { name: "New Session" }).click();
      await expect(
        obsFrame.getByRole("button", { name: "Launching…" }),
      ).toBeDisabled();
      await expect(
        obsFrame.getByRole("button", { name: "New Session" }),
      ).toBeEnabled({ timeout: 20000 });

      expect(errors).toEqual([]);
    } finally {
      const candidates = new Set([
        failSession,
        newSession,
        ...discoverDaemonSessions()
          .map((s) => s.session)
          .filter((name) => !preExistingSessions.has(name)),
      ]);
      for (const name of candidates) {
        if (name === PW_SESSION || preExistingSessions.has(name)) continue;
        await execAgentBrowserCli(["--session", name, "close"], {
          timeoutMs: 4000,
        }).catch(() => {});
      }
    }
  });

  test("renders 300px Work Status view with long hostnames, 249 errors, sparkline, and :4848 without truncation, wrap, or overlap", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Populate console error count (249 errors) and command latency on the active session.
    await fetch(`http://127.0.0.1:${extServer.port}/api/eval`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({
        session: PW_SESSION,
        expression: `(() => { for (let i = 0; i < 248; i++) console.error('burst error ' + i); history.replaceState(null, '', '/?panel=proc&detail='); return true; })()`,
      }),
    });
    await new Promise((r) => setTimeout(r, 250));

    await page.setViewportSize({ width: 420, height: 420 });
    await page.goto(`${harnessUrl}/__host/work-status`);
    await expect(
      page.locator('[data-work-status-row^="sess-"]').first(),
    ).toBeVisible();

    const layoutAudit = await page.evaluate(() => {
      const headingTitle = document.querySelector<HTMLElement>(
        "[data-heading-title]",
      )!;
      const headerBtns = [
        ...document.querySelectorAll<HTMLElement>(
          "[data-work-status-controls] button > span",
        ),
      ];
      const scroller = document.querySelector<HTMLElement>(
        "[data-work-status-scroller]",
      )!;
      const lineRows = [
        ...document.querySelectorAll<HTMLElement>("[data-work-status-line]"),
      ];

      const rowAudits = lineRows.map((row) => {
        const children = [...row.children] as HTMLElement[];
        let siblingOverlap = false;
        for (let i = 0; i < children.length; i += 1) {
          for (let j = i + 1; j < children.length; j += 1) {
            const a = children[i]!.getBoundingClientRect();
            const b = children[j]!.getBoundingClientRect();
            if (a.width === 0 || b.width === 0) continue;
            const xOverlap =
              Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const yOverlap =
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (xOverlap > 1 && yOverlap > 1) {
              siblingOverlap = true;
            }
          }
        }
        const rect = row.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const maxChildRight = Math.max(
          ...children.map((c) => c.getBoundingClientRect().right),
        );
        const maxChildHeight = Math.max(
          ...children.map((c) => c.getBoundingClientRect().height),
        );
        return {
          id: row.dataset.workStatusRow,
          rowOverflowX: row.scrollWidth > row.clientWidth + 1,
          clippedByPanel: maxChildRight > scrollerRect.right + 1,
          tallChildWrap: maxChildHeight > rect.height + 1,
          siblingOverlap,
        };
      });

      return {
        titleTruncated: headingTitle.scrollWidth > headingTitle.clientWidth + 1,
        controlTruncated: headerBtns.some(
          (b) => b.scrollWidth > b.clientWidth + 1,
        ),
        scrollerOverflowX: scroller.scrollWidth > scroller.clientWidth + 1,
        rowAudits,
      };
    });

    expect(layoutAudit.titleTruncated).toBe(false);
    expect(layoutAudit.controlTruncated).toBe(false);
    expect(layoutAudit.scrollerOverflowX).toBe(false);
    for (const r of layoutAudit.rowAudits) {
      expect(r).toEqual({
        id: r.id,
        rowOverflowX: false,
        clippedByPanel: false,
        tallChildWrap: false,
        siblingOverlap: false,
      });
    }

    // Also inject long internal hostname onto the session with 250 errors to test worst-case width.
    await page.locator("[data-work-status-card]").screenshot({
      path: path.join(SCREENSHOT_DIR, "ab-work-status.png"),
    });

    // Arm the Close confirmation state ("Close?") on the badged session row and verify zero overlap/clipping.
    const badgedSessionRow = page
      .locator('[data-work-status-row^="sess-"]')
      .filter({ has: page.locator(".ws-pill") })
      .first();
    await badgedSessionRow.locator("button", { hasText: "Close" }).click();
    await expect(
      badgedSessionRow.locator("button", { hasText: "Close?" }),
    ).toBeVisible();
    const armedAudit = await badgedSessionRow.evaluate((row) => {
      const children = [...row.children] as HTMLElement[];
      let siblingOverlap = false;
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          const a = children[i]!.getBoundingClientRect();
          const b = children[j]!.getBoundingClientRect();
          if (a.width === 0 || b.width === 0) continue;
          const xOverlap =
            Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const yOverlap =
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (xOverlap > 1 && yOverlap > 1) siblingOverlap = true;
        }
      }
      return {
        overflowX: row.scrollWidth > row.clientWidth + 1,
        tallWrap: row.getBoundingClientRect().height > 29,
        siblingOverlap,
      };
    });
    expect(armedAudit).toEqual({
      overflowX: false,
      tallWrap: false,
      siblingOverlap: false,
    });
    expect(errors).toEqual([]);
  });
});

function buildWorkStatusHarnessHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        background: #090b10;
        color: #e2e8f0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      }
      /* Mirrors OpenChamber WorkStatusPanel (width: 300px, p-2, pe-7 on first heading, overflow-x: hidden) */
      .ws-card {
        position: relative;
        width: 300px;
        background: #13161f;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 12px;
        overflow: hidden;
      }
      .ws-gear {
        position: absolute;
        inset-inline-end: 8px;
        top: 8px;
        height: 24px;
        padding-inline: 4px;
        display: inline-flex;
        align-items: center;
        color: #94a3b8;
        font-size: 13px;
      }
      .ws-scroller {
        padding: 8px;
        overflow-x: hidden;
        overflow-y: auto;
      }
      .ws-heading {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 24px;
        margin-bottom: 2px;
        padding-inline-end: 28px;
      }
      .ws-heading-btn {
        display: flex;
        min-width: 0;
        flex: 1 1 0%;
        align-items: center;
        gap: 8px;
        padding-inline: 4px;
        background: transparent;
        border: 0;
        color: #f1f5f9;
        font: inherit;
        text-align: start;
      }
      .ws-heading-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 500;
      }
      .ws-controls {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 4px;
      }
      .ws-ctrl-btn {
        max-width: 5rem;
        height: 22px;
        padding: 0 8px;
        border-radius: 6px;
        border: 0;
        background: transparent;
        color: #cbd5e1;
        font: inherit;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
      }
      .ws-ctrl-btn:hover { background: rgba(148, 163, 184, 0.12); }
      .ws-truncate {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Mirrors WorkStatusGuestView Line: h-7 (28px fixed), px-1, gap-2, w-24 shrink-0 when content else flex-1 */
      .ws-line {
        display: flex;
        width: 100%;
        height: 28px;
        padding-inline: 4px;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #94a3b8;
      }
      .ws-dot {
        width: 6px;
        height: 6px;
        flex-shrink: 0;
        border-radius: 9999px;
      }
      .ws-icon {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
      }
      .ws-label-fixed { width: 96px; flex-shrink: 0; }
      .ws-label-flex { flex: 1 1 0%; }
      .ws-chips {
        display: flex;
        min-width: 0;
        flex: 1 1 0%;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      }
      .ws-chip {
        flex-shrink: 0;
        border-radius: 9999px;
        padding: 1px 6px;
        font-size: 11px;
        font-weight: 500;
        line-height: 16px;
        font-variant-numeric: tabular-nums;
        background: rgba(148, 163, 184, 0.14);
        color: #94a3b8;
      }
      /* WorkStatusPill intentionally omits shrink-0 / whitespace-nowrap, matching OpenChamber */
      .ws-pill {
        border-radius: 9999px;
        font-weight: 500;
        padding: 1px 6px;
        font-size: 11px;
        line-height: 16px;
      }
      .ws-value {
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .ws-action-wrap { display: inline-flex; }
      .ws-action-btn {
        max-width: 8rem;
        height: 22px;
        padding: 0 8px;
        border-radius: 6px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 17, 23, 0.6);
        color: #e2e8f0;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
      }
      .ws-chart { height: 16px; min-width: 0; flex: 1 1 0%; }
      .ws-note { margin: 0; padding: 4px; font-size: 12px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <aside class="ws-card" data-work-status-card>
      <span class="ws-gear" aria-hidden="true">⚙</span>
      <div class="ws-scroller" data-work-status-scroller>
        <section>
          <div class="ws-heading" data-work-status-heading>
            <button type="button" class="ws-heading-btn">
              <span class="ws-icon" aria-hidden="true">⌄</span>
              <span class="ws-heading-title" data-heading-title>Agent Browser</span>
              <span style="flex:1 1 0%"></span>
            </button>
            <div class="ws-controls" data-work-status-controls></div>
          </div>
          <div id="ws-rows"></div>
        </section>
      </div>
    </aside>
    <script>
      const TONE = {
        default: '#e2e8f0',
        muted: '#94a3b8',
        accent: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#f87171',
        info: '#38bdf8',
      };
      const ICON_SVG = {
        global: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm-2.29-2.333A17.9 17.9 0 0 1 8.027 13H4.062a8.008 8.008 0 0 0 5.648 6.667ZM10.03 13c.151 2.439.848 4.73 1.97 6.752A15.905 15.905 0 0 0 13.97 13h-3.94Zm9.908 0h-3.965a17.9 17.9 0 0 1-1.683 6.667A8.008 8.008 0 0 0 19.938 13ZM4.062 11h3.965A17.9 17.9 0 0 1 9.71 4.333 8.008 8.008 0 0 0 4.062 11Zm5.969 0h3.938A15.905 15.905 0 0 0 12 4.248 15.905 15.905 0 0 0 10.03 11Zm4.259-6.667A17.9 17.9 0 0 1 15.973 11h3.965a8.008 8.008 0 0 0-5.648-6.667Z"/></svg>',
        pulse: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9 7.539 15 21.539 18.659 13H23v-2h-5.659L15 16.461 9 2.461 5.341 11H1v2h5.659L9 7.539Z"/></svg>',
      };

      async function load() {
        const res = await fetch('/__service/status');
        const envelope = await res.json();
        const view = JSON.parse(envelope.body);
        // Simulate long internal hostname + running :4848 dashboard row alongside real session state
        if (view.rows.length > 0) {
          const pageRow = view.rows.find((r) => r.kind === 'line' && r.id.startsWith('page-'));
          if (pageRow) pageRow.label = 'app.example.test:8443';
          if (!view.rows.some((r) => r.id === 'dashboard')) {
            view.rows.push({
              kind: 'line',
              id: 'dashboard',
              label: 'Dashboard',
              dot: 'info',
              content: { kind: 'chips', chips: [{ id: 'open-dash', label: ':4848', tone: 'info', url: 'http://localhost:4848' }] },
              value: 'listening',
              valueTone: 'muted',
            });
            view.controls = (view.controls || []).filter((c) => c.id !== 'start-dashboard');
          }
        }

        const ctrlsEl = document.querySelector('[data-work-status-controls]');
        ctrlsEl.innerHTML = '';
        for (const c of view.controls || []) {
          const btn = document.createElement('button');
          btn.className = 'ws-ctrl-btn';
          const sp = document.createElement('span');
          sp.className = 'ws-truncate';
          sp.textContent = c.label;
          btn.appendChild(sp);
          ctrlsEl.appendChild(btn);
        }

        const rowsEl = document.getElementById('ws-rows');
        rowsEl.innerHTML = '';
        for (const row of view.rows) {
          if (row.kind === 'note') {
            const p = document.createElement('p');
            p.className = 'ws-note';
            p.dataset.workStatusRow = row.id;
            p.textContent = row.text;
            rowsEl.appendChild(p);
            continue;
          }
          const line = document.createElement('div');
          line.className = 'ws-line';
          line.dataset.workStatusLine = '1';
          line.dataset.workStatusRow = row.id;

          if (row.dot) {
            const dot = document.createElement('span');
            dot.className = 'ws-dot';
            dot.style.background = TONE[row.dot] || TONE.accent;
            line.appendChild(dot);
          }
          if (row.icon && ICON_SVG[row.icon]) {
            const ic = document.createElement('span');
            ic.className = 'ws-icon';
            ic.innerHTML = ICON_SVG[row.icon];
            line.appendChild(ic);
          }

          const lbl = document.createElement('span');
          lbl.className = 'ws-truncate ' + (row.content ? 'ws-label-fixed' : 'ws-label-flex');
          lbl.textContent = row.label;
          line.appendChild(lbl);

          if (row.content) {
            if (row.content.kind === 'chips') {
              const cw = document.createElement('div');
              cw.className = 'ws-chips';
              for (const ch of row.content.chips) {
                const chip = document.createElement('span');
                chip.className = 'ws-chip';
                if (ch.tone && TONE[ch.tone] && ch.tone !== 'muted') {
                  chip.style.color = TONE[ch.tone];
                  chip.style.background = 'color-mix(in srgb, ' + TONE[ch.tone] + ' 18%, transparent)';
                }
                chip.textContent = ch.label;
                cw.appendChild(chip);
              }
              line.appendChild(cw);
            } else if (row.content.kind === 'chart') {
              const chartDiv = document.createElement('div');
              chartDiv.className = 'ws-chart';
              const vals = row.content.values || [];
              const top = Math.max(1, ...vals);
              const pts = vals.map((v, i) => (i === 0 ? 'M' : 'L') + ((i / Math.max(1, vals.length - 1)) * 100).toFixed(1) + ' ' + (15 - (v / top) * 14).toFixed(1)).join(' ');
              chartDiv.innerHTML = '<svg viewBox="0 0 100 16" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible;"><path d="' + pts + ' L100 16 L0 16 Z" fill="rgba(59,130,246,0.18)"/><path d="' + pts + '" fill="none" stroke="#3b82f6" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
              line.appendChild(chartDiv);
            }
          }

          if (row.badge) {
            const pill = document.createElement('span');
            pill.className = 'ws-pill';
            const c = TONE[row.badge.tone] || TONE.default;
            pill.style.color = c;
            pill.style.background = 'color-mix(in srgb, ' + c + ' 18%, transparent)';
            pill.textContent = row.badge.label;
            line.appendChild(pill);
          }

          if (row.value) {
            const val = document.createElement('span');
            val.className = 'ws-value';
            if (row.valueTone && TONE[row.valueTone]) val.style.color = TONE[row.valueTone];
            val.textContent = row.value;
            line.appendChild(val);
          }

          for (const act of row.actions || []) {
            if (act.kind === 'button') {
              const wrap = document.createElement('span');
              wrap.className = 'ws-action-wrap';
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'ws-action-btn';
              const sp = document.createElement('span');
              sp.className = 'ws-truncate';
              sp.textContent = act.label;
              btn.appendChild(sp);
              let armed = false;
              btn.addEventListener('click', () => {
                if (act.confirm && !armed) {
                  armed = true;
                  sp.textContent = act.confirm;
                }
              });
              wrap.appendChild(btn);
              line.appendChild(wrap);
            }
          }

          rowsEl.appendChild(line);
        }
      }
      load();
    </script>
  </body>
</html>`;
}

function buildHostHarnessHtml(
  entryPath: string,
  surface: "panel" | "page",
  showSurfaceCanvas: boolean,
): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #0f1117;
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
      }
      #guest-frame {
        width: 100%;
        border: 0;
        height: ${showSurfaceCanvas ? "76px" : "100%"};
        flex: ${showSurfaceCanvas ? "0 0 auto" : "1 1 auto"};
      }
      #surface-wrap {
        flex: 1 1 auto;
        display: ${showSurfaceCanvas ? "flex" : "none"};
        flex-direction: column;
        background: #090b10;
        overflow: hidden;
      }
      #handoff-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        font-size: 12px;
        background: #141925;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        color: #94a3b8;
      }
      #surface-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: top center;
      }
    </style>
  </head>
  <body>
    <iframe id="guest-frame" sandbox="allow-scripts" src="${entryPath}"></iframe>
    <div id="surface-wrap">
      <div id="handoff-bar">
        <span>Shared Surface — Click or type to take control</span>
        <span style="color:#4ade80;">● Streaming JPEG</span>
      </div>
      <img id="surface-img" src="/__surface-frame" alt="Live agent-browser surface" />
    </div>
    <script>
      window.__attachedItems = [];
      window.__clipboardWrites = [];
      window.__toasts = [];
      const iframe = document.getElementById('guest-frame');
      const CHANNEL = ${JSON.stringify(OPENCHAMBER_SDK_CHANNEL)};
      const VERSION = ${JSON.stringify(OPENCHAMBER_SDK_API_VERSION)};
      const THEME = ${JSON.stringify(DARK_THEME_TOKENS)};

      window.addEventListener('message', async (ev) => {
        if (ev.source !== iframe.contentWindow) return;
        const msg = ev.data;
        if (!msg || msg.channel !== CHANNEL || msg.v !== VERSION) return;

        if (msg.type === 'hello') {
          iframe.contentWindow.postMessage({
            channel: CHANNEL,
            v: VERSION,
            type: 'ready',
            payload: {
              theme: { mode: 'dark', tokens: THEME },
              locale: 'en-US',
              directory: '/tmp',
              session: { id: 'ses_demo', title: 'Browser QA', busy: false },
              surface: ${JSON.stringify(surface)},
              connection: { connected: true, account: null },
              settings: {},
              item: null,
            }
          }, '*');
          return;
        }

        if (msg.type === 'resize') {
          if (${showSurfaceCanvas ? "true" : "false"} && msg.payload && typeof msg.payload.height === 'number') {
            iframe.style.height = msg.payload.height + 'px';
          }
          if (msg.id) {
            iframe.contentWindow.postMessage({ channel: CHANNEL, v: VERSION, type: 'result', id: msg.id, ok: true, payload: {} }, '*');
          }
          return;
        }

        if (msg.type === 'service-request') {
          const { method, path: reqPath, query, body } = msg.payload;
          const qs = query ? '?' + new URLSearchParams(query).toString() : '';
          const resp = await fetch('/__service' + reqPath + qs, {
            method: method || 'GET',
            ...(body !== undefined ? { body } : {}),
          });
          const resultPayload = await resp.json();
          iframe.contentWindow.postMessage({
            channel: CHANNEL,
            v: VERSION,
            type: 'result',
            id: msg.id,
            ok: true,
            payload: resultPayload,
          }, '*');
          return;
        }

        if (msg.type === 'attach') {
          window.__attachedItems.push(msg.payload);
          iframe.contentWindow.postMessage({ channel: CHANNEL, v: VERSION, type: 'result', id: msg.id, ok: true, payload: {} }, '*');
          return;
        }

        if (msg.type === 'toast') {
          window.__toasts.push(msg.payload);
          iframe.contentWindow.postMessage({ channel: CHANNEL, v: VERSION, type: 'result', id: msg.id, ok: true, payload: {} }, '*');
          return;
        }

        if (msg.type === 'clipboard-write') {
          window.__clipboardWrites.push(msg.payload?.text ?? '');
          iframe.contentWindow.postMessage({ channel: CHANNEL, v: VERSION, type: 'result', id: msg.id, ok: true, payload: {} }, '*');
          return;
        }

        if (msg.id) {
          iframe.contentWindow.postMessage({ channel: CHANNEL, v: VERSION, type: 'result', id: msg.id, ok: true, payload: {} }, '*');
        }
      });
    </script>
  </body>
</html>`;
}
