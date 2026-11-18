import type {
  SurfaceInputEvent,
  SurfaceKeyEvent,
  SurfaceModifiers,
  SurfacePointerEvent,
} from "@openchamber/sdk";

const CODE_TO_VK: Readonly<Record<string, number>> = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  NumpadEnter: 13,
  ShiftLeft: 16,
  ShiftRight: 16,
  ControlLeft: 17,
  ControlRight: 17,
  AltLeft: 18,
  AltRight: 18,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222,
};

export interface ClickTrackerState {
  readonly lastTimeMs: number;
  readonly lastX: number;
  readonly lastY: number;
  readonly lastButton: number;
  readonly count: number;
}

export const INITIAL_CLICK_TRACKER: ClickTrackerState = {
  lastTimeMs: 0,
  lastX: -100,
  lastY: -100,
  lastButton: -1,
  count: 0,
};

export function nextClickTracker(
  prev: ClickTrackerState,
  x: number,
  y: number,
  button: number,
  nowMs: number,
): ClickTrackerState {
  const dt = nowMs - prev.lastTimeMs;
  const dx = Math.abs(x - prev.lastX);
  const dy = Math.abs(y - prev.lastY);
  const chained =
    button === prev.lastButton && dt >= 0 && dt <= 500 && dx <= 4 && dy <= 4;
  const count = chained ? (prev.count % 3) + 1 : 1;
  return { lastTimeMs: nowMs, lastX: x, lastY: y, lastButton: button, count };
}

export function modifiersBitmask(modifiers: SurfaceModifiers): number {
  return (
    (modifiers.alt ? 1 : 0) |
    (modifiers.ctrl ? 2 : 0) |
    (modifiers.meta ? 4 : 0) |
    (modifiers.shift ? 8 : 0)
  );
}

export function virtualKeyCodeForEvent(
  event: Pick<SurfaceKeyEvent, "key" | "code" | "keyCode">,
): number | undefined {
  if (typeof event.keyCode === "number" && event.keyCode > 0) {
    return event.keyCode;
  }
  const mapped = CODE_TO_VK[event.code];
  if (mapped !== undefined) return mapped;
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.charCodeAt(3);
  }
  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.charCodeAt(5);
  }
  if (/^F([1-9]|1[0-2])$/.test(event.code)) {
    return 111 + Number(event.code.slice(1));
  }
  return undefined;
}

export function resolveMouseButton(
  event: Pick<SurfacePointerEvent, "action" | "button" | "buttons">,
): "left" | "middle" | "right" | "none" {
  if (event.action === "down" || event.action === "up") {
    if (event.button === 0) return "left";
    if (event.button === 1) return "middle";
    if (event.button === 2) return "right";
    return "none";
  }
  if ((event.buttons & 1) !== 0) return "left";
  if ((event.buttons & 4) !== 0) return "middle";
  if ((event.buttons & 2) !== 0) return "right";
  return "none";
}

export function scaleCoordinate(
  frameCoord: number,
  frameSize: number,
  cssViewportSize: number,
): number {
  if (frameSize <= 0 || cssViewportSize <= 0 || frameSize === cssViewportSize) {
    return Math.round(frameCoord * 100) / 100;
  }
  return Math.round(((frameCoord * cssViewportSize) / frameSize) * 100) / 100;
}

export type AgentBrowserWsInputMessage =
  | {
      readonly type: "input_mouse";
      readonly eventType:
        "mouseMoved" | "mousePressed" | "mouseReleased" | "mouseWheel";
      readonly x: number;
      readonly y: number;
      readonly button?: "left" | "middle" | "right" | "none";
      readonly clickCount?: number;
      readonly deltaX?: number;
      readonly deltaY?: number;
      readonly modifiers?: number;
    }
  | {
      readonly type: "input_keyboard";
      readonly eventType: "keyDown" | "keyUp" | "char";
      readonly key?: string;
      readonly code?: string;
      readonly text?: string;
      readonly windowsVirtualKeyCode?: number;
      readonly modifiers?: number;
    };

export function translateSurfaceEventsToWsMessages(
  events: readonly SurfaceInputEvent[],
  dimensions: {
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
  },
  initialTracker: ClickTrackerState,
  nowMs = Date.now(),
): {
  readonly messages: readonly AgentBrowserWsInputMessage[];
  readonly tracker: ClickTrackerState;
} {
  let tracker = initialTracker;
  const messages: AgentBrowserWsInputMessage[] = [];

  for (const event of events) {
    if (event.type === "pointer") {
      const x = scaleCoordinate(
        event.x,
        dimensions.frameWidth,
        dimensions.viewportWidth,
      );
      const y = scaleCoordinate(
        event.y,
        dimensions.frameHeight,
        dimensions.viewportHeight,
      );
      const button = resolveMouseButton(event);
      const modifiers = modifiersBitmask(event.modifiers);

      if (event.action === "down") {
        tracker = nextClickTracker(tracker, x, y, event.button, nowMs);
        messages.push({
          type: "input_mouse",
          eventType: "mousePressed",
          x,
          y,
          button,
          clickCount: tracker.count,
          ...(modifiers ? { modifiers } : {}),
        });
      } else if (event.action === "up") {
        messages.push({
          type: "input_mouse",
          eventType: "mouseReleased",
          x,
          y,
          button,
          clickCount: Math.max(1, tracker.count),
          ...(modifiers ? { modifiers } : {}),
        });
      } else {
        messages.push({
          type: "input_mouse",
          eventType: "mouseMoved",
          x,
          y,
          ...(button !== "none" ? { button } : {}),
          ...(modifiers ? { modifiers } : {}),
        });
      }
      continue;
    }

    if (event.type === "wheel") {
      const x = scaleCoordinate(
        event.x,
        dimensions.frameWidth,
        dimensions.viewportWidth,
      );
      const y = scaleCoordinate(
        event.y,
        dimensions.frameHeight,
        dimensions.viewportHeight,
      );
      const modifiers = modifiersBitmask(event.modifiers);
      messages.push({
        type: "input_mouse",
        eventType: "mouseWheel",
        x,
        y,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ...(modifiers ? { modifiers } : {}),
      });
      continue;
    }

    if (event.type === "key") {
      // Strip Ctrl+Alt when AltGr produced a printable character so Linux Chromium inserts the character cleanly.
      const isAltGrPrintable =
        event.modifiers.ctrl &&
        event.modifiers.alt &&
        !event.modifiers.meta &&
        event.key.length === 1;
      const effectiveModifiers: SurfaceModifiers = isAltGrPrintable
        ? { ...event.modifiers, ctrl: false, alt: false }
        : event.modifiers;
      const modifiers = modifiersBitmask(effectiveModifiers);
      const vk = virtualKeyCodeForEvent(event);
      const isPrintable =
        event.action === "down" &&
        event.key.length === 1 &&
        !effectiveModifiers.ctrl &&
        !effectiveModifiers.meta &&
        !effectiveModifiers.alt;

      messages.push({
        type: "input_keyboard",
        eventType: event.action === "down" ? "keyDown" : "keyUp",
        ...(event.key ? { key: event.key } : {}),
        ...(event.code ? { code: event.code } : {}),
        ...(isPrintable ? { text: event.key } : {}),
        ...(vk !== undefined ? { windowsVirtualKeyCode: vk } : {}),
        ...(modifiers ? { modifiers } : {}),
      });
      continue;
    }

    if (event.type === "text") {
      for (const ch of event.text) {
        messages.push({
          type: "input_keyboard",
          eventType: "char",
          text: ch,
        });
      }
    }
  }

  return { messages, tracker };
}
