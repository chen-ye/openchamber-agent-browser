import { asString } from "../shared/types.ts";

const SECRET_NAME_RE =
  /(?:auth|bearer|cookie|password|passwd|secret|token|credential|api[-_]?key|access[-_]?key|private[-_]?key|session[-_]?id|signature|csrf|xsrf|^key$|^code$|jwt)/i;

const BEARER_VALUE_RE = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{6,}/gi;

export const REDACTED = "[REDACTED]";

export function isSensitiveKey(name: string): boolean {
  return SECRET_NAME_RE.test(name.trim());
}

export function redactText(text: string, maxChars = 4000): string {
  const scrubbed = text.replace(
    BEARER_VALUE_RE,
    (_match, scheme: string) => `${scheme} ${REDACTED}`,
  );
  return scrubbed.length > maxChars
    ? `${scrubbed.slice(0, maxChars)}…`
    : scrubbed;
}

export function redactUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const hasCredentials = parsed.username !== "" || parsed.password !== "";
    let changed = hasCredentials;
    if (hasCredentials) {
      parsed.username = REDACTED;
      parsed.password = "";
    }
    for (const [key] of parsed.searchParams.entries()) {
      if (isSensitiveKey(key)) {
        parsed.searchParams.set(key, REDACTED);
        changed = true;
      }
    }
    if (parsed.hash.includes("=")) {
      const rawHash = parsed.hash.slice(1);
      const hashParams = new URLSearchParams(rawHash);
      let hashChanged = false;
      for (const [key] of hashParams.entries()) {
        if (isSensitiveKey(key)) {
          hashParams.set(key, REDACTED);
          hashChanged = true;
        }
      }
      if (hashChanged) {
        parsed.hash = `#${hashParams.toString()}`;
        changed = true;
      }
    }
    return changed
      ? decodeURIComponent(parsed.toString()).replaceAll(
          encodeURIComponent(REDACTED),
          REDACTED,
        )
      : rawUrl;
  } catch {
    return redactText(rawUrl, 2000);
  }
}

export function redactHeaders(
  headers: Readonly<Record<string, unknown>> | null | undefined,
): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactText(asString(value), 2000),
    ]),
  );
}

export function redactUnknown(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[…]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return redactUrl(value);
    }
    return redactText(value, 2000);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => redactUnknown(entry, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 60)
        .map(([k, v]) => [
          k,
          isSensitiveKey(k) ? REDACTED : redactUnknown(v, depth + 1),
        ]),
    );
  }
  return asString(value);
}

export function redactBodyText(
  body: string | null | undefined,
  mimeType: string | null | undefined,
  maxChars = 8000,
): string | null {
  if (body === null || body === undefined || body === "") return null;
  const trimmed = body.trim();
  const normalizedMime = (mimeType ?? "").toLowerCase();

  if (
    normalizedMime.includes("json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const serialized = JSON.stringify(redactUnknown(parsed), null, 2);
      return serialized.length > maxChars
        ? `${serialized.slice(0, maxChars)}…`
        : serialized;
    } catch {
      return redactText(body, maxChars);
    }
  }

  if (normalizedMime.includes("x-www-form-urlencoded")) {
    try {
      const params = new URLSearchParams(body);
      const next = new URLSearchParams();
      for (const [key, val] of params.entries()) {
        next.append(key, isSensitiveKey(key) ? REDACTED : redactText(val, 500));
      }
      const out = next.toString();
      return out.length > maxChars ? `${out.slice(0, maxChars)}…` : out;
    } catch {
      return redactText(body, maxChars);
    }
  }

  return redactText(body, maxChars);
}

export function formatPreviewJson(
  value: unknown,
  maxChars = 1200,
): string | null {
  if (value === null || value === undefined) return null;
  const safe = redactUnknown(value);
  const text = typeof safe === "string" ? safe : JSON.stringify(safe);
  if (!text || text === "{}" || text === "null") return null;
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
