import { useCallback, useSyncExternalStore } from "react";

/**
 * Single-character shortcuts (`/`, `[`, `]`, and the home rack's letter keys)
 * fire without a modifier, so WCAG 2.1.4 requires a way to turn them off:
 * speech-input users can otherwise trigger them by dictating. This is that
 * switch. It is on by default and remembered per browser.
 */
const STORAGE_KEY = "sdt:single-key-shortcuts";
const EVENT = "sdt:single-key-shortcuts";

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useSingleKeyShortcuts(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, read, () => true);
  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* private mode: the choice lasts for this page only */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [enabled, setEnabled];
}

/** True when a key event started in something the user is typing into. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}
