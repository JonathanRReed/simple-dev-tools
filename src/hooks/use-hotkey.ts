"use client";

import { useEffect, useRef } from "react";

export type HotkeyCombo = string; // e.g. "mod+enter", "mod+shift+c", "escape"

export interface HotkeyOptions {
  /** Allow the hotkey to fire while typing in inputs/textarea/select. */
  allowInInput?: boolean;
  /** Attach on window (default) or document. */
  target?: Window | Document;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function matches(combo: HotkeyCombo, event: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const needMod = parts.includes("mod");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");

  const mod = event.metaKey || event.ctrlKey;
  if (needMod !== mod) return false;
  if (needShift !== event.shiftKey) return false;
  if (needAlt !== event.altKey) return false;

  const eventKey = event.key.toLowerCase();
  if (key === "enter") return eventKey === "enter";
  if (key === "escape") return eventKey === "escape";
  if (key === "space") return eventKey === " ";
  return eventKey === key;
}

/**
 * Bind a keyboard shortcut. `mod` matches ⌘ on macOS and Ctrl elsewhere.
 * By default the binding is ignored while the user is typing in a field;
 * pass `allowInInput` for editor-style combos like mod+enter.
 */
export function useHotkey(
  combo: HotkeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!options.allowInInput && isTypingTarget(event.target)) return;
      if (matches(combo, event)) {
        handlerRef.current(event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, options.allowInInput]);
}
