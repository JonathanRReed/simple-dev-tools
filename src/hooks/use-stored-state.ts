import { useCallback, useEffect, useRef, useState } from "react";

/** How long to wait after the last keystroke before writing to localStorage. */
const PERSIST_DELAY_MS = 300;

/**
 * React state backed by localStorage, with the guarded semantics every tool
 * previously re-implemented by hand: SSR-safe reads, private-mode/quota-safe
 * writes, and hydration after mount so the first client render matches SSR.
 *
 * The state update is synchronous — callers keep a controlled input — but the
 * write is debounced. `localStorage.setItem` is synchronous and blocks the main
 * thread, and these tools call it on every keystroke against buffers that can
 * be megabytes (a pasted JSON document, a SQL script), so writing eagerly meant
 * serialising the whole buffer per character typed. A pending write is flushed
 * on unmount and on pagehide so nothing is lost by navigating away.
 *
 * String-focused by design — every current tool use case is a string. Callers
 * with structured data can JSON.stringify before storing.
 */
export function useStoredState(
  key: string,
  initialValue: string
): [string, (value: string) => void, () => void] {
  const [value, setValue] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ key: string; value: string } | null>(null);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      window.localStorage.setItem(next.key, next.value);
    } catch {
      /* ignore (private mode / quota) */
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) setValue(stored);
    } catch {
      /* ignore storage access errors (private mode, etc.) */
    }
  }, [key]);

  // A debounced write would otherwise be lost if the tab is closed or hidden
  // inside the delay window.
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const update = useCallback(
    (next: string) => {
      setValue(next);
      pending.current = { key, value: next };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, PERSIST_DELAY_MS);
    },
    [key, flush]
  );

  const clear = useCallback(() => {
    setValue(initialValue);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [initialValue, key]);

  return [value, update, clear] as const;
}

/**
 * Debounce a rapidly-changing value. Replaces the ad-hoc setTimeout debounce
 * effects previously duplicated across four tools.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
