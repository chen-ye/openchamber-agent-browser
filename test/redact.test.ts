import { describe, expect, test } from "bun:test";
import {
  REDACTED,
  redactBodyText,
  redactHeaders,
  redactUrl,
} from "../service/redact.ts";
import {
  INITIAL_CLICK_TRACKER,
  translateSurfaceEventsToWsMessages,
} from "../service/input-translator.ts";

describe("credential redaction", () => {
  test("scrubs URL userinfo, sensitive query params, and hash tokens", () => {
    const raw =
      "https://alice:s3cr3t@example.com/callback?api_key=abc123&page=2#access_token=xyz987&tab=net";
    const safe = redactUrl(raw);
    expect(safe).not.toContain("s3cr3t");
    expect(safe).not.toContain("abc123");
    expect(safe).not.toContain("xyz987");
    expect(safe).toContain("page=2");
    expect(safe).toContain(REDACTED);
  });

  test("scrubs sensitive HTTP headers while preserving ordinary headers", () => {
    const out = redactHeaders({
      Authorization: "Bearer live-secret-token",
      Cookie: "sid=12345",
      "Content-Type": "application/json",
    });
    expect(out.Authorization).toBe(REDACTED);
    expect(out.Cookie).toBe(REDACTED);
    expect(out["Content-Type"]).toBe("application/json");
  });

  test("scrubs JSON and urlencoded request bodies", () => {
    const jsonOut = redactBodyText(
      JSON.stringify({
        username: "alice",
        password: "pw1",
        nested: { clientSecret: "shh" },
      }),
      "application/json",
    );
    expect(jsonOut).toContain('"username": "alice"');
    expect(jsonOut).not.toContain("pw1");
    expect(jsonOut).not.toContain("shh");
    expect(jsonOut).toContain(REDACTED);

    const formOut = redactBodyText(
      "email=a%40b.co&csrf_token=tok999",
      "application/x-www-form-urlencoded",
    );
    expect(formOut).toContain("email=");
    expect(formOut).not.toContain("tok999");
  });
});

describe("surface input translator", () => {
  test("scales HiDPI coordinates, synthesizes multi-clicks, and omits null keyboard fields", () => {
    const first = translateSurfaceEventsToWsMessages(
      [
        {
          type: "pointer",
          action: "down",
          x: 200,
          y: 100,
          button: 0,
          buttons: 1,
          modifiers: { alt: false, ctrl: false, meta: false, shift: false },
        },
        {
          type: "pointer",
          action: "up",
          x: 200,
          y: 100,
          button: 0,
          buttons: 0,
          modifiers: { alt: false, ctrl: false, meta: false, shift: false },
        },
      ],
      {
        frameWidth: 2560,
        frameHeight: 1600,
        viewportWidth: 1280,
        viewportHeight: 800,
      },
      INITIAL_CLICK_TRACKER,
      1000,
    );
    expect(first.messages[0]).toEqual({
      type: "input_mouse",
      eventType: "mousePressed",
      x: 100,
      y: 50,
      button: "left",
      clickCount: 1,
    });

    const second = translateSurfaceEventsToWsMessages(
      [
        {
          type: "pointer",
          action: "down",
          x: 202,
          y: 100,
          button: 0,
          buttons: 1,
          modifiers: { alt: false, ctrl: false, meta: false, shift: false },
        },
      ],
      {
        frameWidth: 2560,
        frameHeight: 1600,
        viewportWidth: 1280,
        viewportHeight: 800,
      },
      first.tracker,
      1250,
    );
    expect(second.messages[0]).toMatchObject({
      type: "input_mouse",
      eventType: "mousePressed",
      clickCount: 2,
    });

    const keyBatch = translateSurfaceEventsToWsMessages(
      [
        {
          type: "key",
          action: "down",
          key: ".",
          code: "Period",
          modifiers: { alt: false, ctrl: false, meta: false, shift: false },
        },
        {
          type: "key",
          action: "down",
          key: "Enter",
          code: "Enter",
          modifiers: { alt: false, ctrl: true, meta: false, shift: false },
        },
      ],
      {
        frameWidth: 1280,
        frameHeight: 800,
        viewportWidth: 1280,
        viewportHeight: 800,
      },
      INITIAL_CLICK_TRACKER,
    );

    expect(keyBatch.messages[0]).toEqual({
      type: "input_keyboard",
      eventType: "keyDown",
      key: ".",
      code: "Period",
      text: ".",
      windowsVirtualKeyCode: 190,
    });
    expect(keyBatch.messages[1]).toEqual({
      type: "input_keyboard",
      eventType: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
      modifiers: 2,
    });
    expect(JSON.stringify(keyBatch.messages)).not.toContain(":null");
  });
});
