import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

export interface DiscoveredDaemonSession {
  readonly session: string;
  readonly socketDir: string;
  readonly sockPath: string;
  readonly streamPort: number;
  readonly pid: number;
  readonly engine: string;
  readonly provider: string | null;
}

export interface DaemonCommandResponse<T = Record<string, unknown>> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
}

export function buildAgentBrowserEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const home = baseEnv.HOME || os.homedir();
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const runtimeCandidate =
    baseEnv.XDG_RUNTIME_DIR || (uid !== null ? `/run/user/${uid}` : "");
  const xdgRuntimeDir =
    runtimeCandidate && fs.existsSync(runtimeCandidate)
      ? runtimeCandidate
      : undefined;

  const extraPaths = [
    path.join(home, ".local", "share", "mise", "shims"),
    path.join(home, ".local", "bin"),
    path.join(home, ".cargo", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  const existingParts = (baseEnv.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean);
  const mergedPath = [...new Set([...existingParts, ...extraPaths])].join(
    path.delimiter,
  );

  return {
    ...baseEnv,
    HOME: home,
    PATH: mergedPath,
    ...(xdgRuntimeDir ? { XDG_RUNTIME_DIR: xdgRuntimeDir } : {}),
  };
}

export function resolveCandidateSocketDirs(
  baseEnv: NodeJS.ProcessEnv = process.env,
): string[] {
  const env = buildAgentBrowserEnv(baseEnv);
  const candidates: string[] = [];

  if (env.AGENT_BROWSER_SOCKET_DIR) {
    candidates.push(env.AGENT_BROWSER_SOCKET_DIR);
  }
  if (env.XDG_RUNTIME_DIR) {
    candidates.push(path.join(env.XDG_RUNTIME_DIR, "agent-browser"));
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  if (uid !== null) {
    candidates.push(`/run/user/${uid}/agent-browser`);
  }
  const home = env.HOME || os.homedir();
  if (home) {
    candidates.push(path.join(home, ".agent-browser"));
  }
  candidates.push(path.join(os.tmpdir(), "agent-browser"));

  const roots = [...new Set(candidates)];
  const expanded: string[] = [];
  for (const root of roots) {
    expanded.push(root);
    const nsDir = path.join(root, "namespaces");
    try {
      if (fs.existsSync(nsDir) && fs.statSync(nsDir).isDirectory()) {
        for (const entry of fs.readdirSync(nsDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const runDir = path.join(nsDir, entry.name, "run");
            if (fs.existsSync(runDir)) {
              expanded.push(runDir);
            }
          }
        }
      }
    } catch {
      // Ignore unreadable namespace folders.
    }
  }
  return [...new Set(expanded)];
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

function readSmallTrimmedFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

export function discoverDaemonSessions(
  baseEnv: NodeJS.ProcessEnv = process.env,
): DiscoveredDaemonSession[] {
  const dirs = resolveCandidateSocketDirs(baseEnv);
  const byName = new Map<string, DiscoveredDaemonSession>();

  for (const dir of dirs) {
    let entries: fs.Dirent[];
    try {
      if (!fs.existsSync(dir)) continue;
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".stream")) continue;
      const session = entry.name.slice(0, -".stream".length);
      if (!session || session === "dashboard" || byName.has(session)) continue;

      const streamRaw = readSmallTrimmedFile(path.join(dir, entry.name));
      const pidRaw = readSmallTrimmedFile(path.join(dir, `${session}.pid`));
      const streamPort = Number(streamRaw);
      const pid = Number(pidRaw);
      if (
        !Number.isInteger(streamPort) ||
        streamPort <= 0 ||
        streamPort > 65535
      )
        continue;
      if (!isPidAlive(pid)) continue;

      const sockPath = path.join(dir, `${session}.sock`);
      const engine =
        readSmallTrimmedFile(path.join(dir, `${session}.engine`)) || "chrome";
      const provider =
        readSmallTrimmedFile(path.join(dir, `${session}.provider`)) || null;

      byName.set(session, {
        session,
        socketDir: dir,
        sockPath,
        streamPort,
        pid,
        engine,
        provider: provider || null,
      });
    }
  }

  return [...byName.values()].sort((a, b) => {
    if (a.session === "default") return -1;
    if (b.session === "default") return 1;
    return a.session.localeCompare(b.session);
  });
}

export function sendDaemonSocketCommand<T = Record<string, unknown>>(
  sockPath: string,
  action: string,
  params: Readonly<Record<string, unknown>> = {},
  timeoutMs = 12000,
): Promise<DaemonCommandResponse<T>> {
  return new Promise((resolve, reject) => {
    const id = `oc-${crypto.randomUUID().slice(0, 8)}`;
    const payload = `${JSON.stringify({ id, action, ...params })}\n`;
    const socket = net.createConnection({ path: sockPath });
    let settled = false;
    let buffer = "";

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Daemon command "${action}" timed out after ${timeoutMs}ms`,
          ),
        ),
      );
    }, timeoutMs);

    socket.setEncoding("utf8");
    socket.once("connect", () => {
      socket.write(payload);
    });
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) return;
      const line = buffer.slice(0, newlineIndex).trim();
      finish(() => {
        try {
          const parsed = JSON.parse(line) as DaemonCommandResponse<T>;
          resolve(parsed);
        } catch (err) {
          reject(
            new Error(
              `Malformed daemon JSON response for "${action}": ${String(err)}`,
            ),
          );
        }
      });
    });
    socket.once("error", (err) => {
      finish(() => reject(err));
    });
    socket.once("end", () => {
      if (!settled) {
        const trimmed = buffer.trim();
        if (trimmed) {
          finish(() => {
            try {
              resolve(JSON.parse(trimmed) as DaemonCommandResponse<T>);
            } catch (err) {
              reject(
                new Error(
                  `Incomplete daemon response for "${action}": ${String(err)}`,
                ),
              );
            }
          });
        } else {
          finish(() =>
            reject(
              new Error(`Daemon closed socket before answering "${action}"`),
            ),
          );
        }
      }
    });
  });
}

export function extractAgentBrowserCliError(res: {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}): string | null {
  let parsed: { success?: unknown; error?: unknown } | null = null;
  if (res.stdout) {
    try {
      const candidate = JSON.parse(res.stdout) as unknown;
      if (candidate && typeof candidate === "object") {
        parsed = candidate as { success?: unknown; error?: unknown };
      }
    } catch {
      // Fall back to exitCode/stderr handling below.
    }
  }
  if (parsed?.success === false) {
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return res.stderr || "agent-browser command failed";
  }
  if (res.exitCode !== 0) {
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return (
      res.stderr ||
      res.stdout ||
      `agent-browser exited with code ${res.exitCode ?? "unknown"}`
    );
  }
  return null;
}

export function execAgentBrowserCli(
  args: readonly string[],
  options: {
    readonly timeoutMs?: number;
    readonly baseEnv?: NodeJS.ProcessEnv;
  } = {},
): Promise<{
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const timeoutMs = options.timeoutMs ?? 25000;
  const env = buildAgentBrowserEnv(options.baseEnv);
  delete env.AGENT_BROWSER_STREAM_PORT;
  delete env.AGENT_BROWSER_DASHBOARD_ALLOWED_ORIGINS;

  return new Promise((resolve, reject) => {
    const child = spawn("agent-browser", args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let finished = false;
    let killEscalationTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      clearTimeout(timer);
      if (killEscalationTimer) {
        clearTimeout(killEscalationTimer);
        killEscalationTimer = null;
      }
    };

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGTERM");
      killEscalationTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // Process already exited.
        }
      }, 1500);
      killEscalationTimer.unref?.();
      reject(
        new Error(
          `agent-browser ${args.join(" ")} timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < 2_000_000) stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < 200_000) stderr += chunk;
    });
    child.once("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimers();
      reject(err);
    });
    child.once("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimers();
      resolve({ exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

export async function checkDashboardServer(
  baseEnv: NodeJS.ProcessEnv = process.env,
  fallbackPort = 4848,
): Promise<{
  readonly running: boolean;
  readonly port: number;
  readonly url: string;
}> {
  let port = fallbackPort;
  for (const dir of resolveCandidateSocketDirs(baseEnv)) {
    const cfgRaw = readSmallTrimmedFile(path.join(dir, "dashboard.config"));
    const pidRaw = readSmallTrimmedFile(path.join(dir, "dashboard.pid"));
    if (cfgRaw && pidRaw && isPidAlive(Number(pidRaw))) {
      try {
        const cfg = JSON.parse(cfgRaw) as { port?: number };
        if (typeof cfg.port === "number" && cfg.port > 0 && cfg.port <= 65535) {
          port = cfg.port;
        }
      } catch {
        // Keep fallback port.
      }
      break;
    }
  }

  const origin = `http://127.0.0.1:${port}`;
  try {
    const res = await fetch(`${origin}/api/sessions`, {
      headers: { Origin: origin },
      signal: AbortSignal.timeout(1200),
    });
    return {
      running: res.ok,
      port,
      url: `http://localhost:${port}`,
    };
  } catch {
    return {
      running: false,
      port,
      url: `http://localhost:${port}`,
    };
  }
}

export async function ensureDashboardRunning(
  port = 4848,
  baseEnv: NodeJS.ProcessEnv = process.env,
): Promise<{
  readonly running: boolean;
  readonly port: number;
  readonly url: string;
  readonly error?: string;
}> {
  const existing = await checkDashboardServer(baseEnv, port);
  if (existing.running) return existing;

  try {
    await execAgentBrowserCli(["dashboard", "start", "--port", String(port)], {
      timeoutMs: 10000,
      baseEnv,
    });
  } catch (err) {
    return {
      running: false,
      port,
      url: `http://localhost:${port}`,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  for (let i = 0; i < 10; i += 1) {
    const check = await checkDashboardServer(baseEnv, port);
    if (check.running) return check;
    await new Promise((r) => setTimeout(r, 150));
  }

  return {
    running: false,
    port,
    url: `http://localhost:${port}`,
    error: `Dashboard did not respond on http://127.0.0.1:${port}`,
  };
}
