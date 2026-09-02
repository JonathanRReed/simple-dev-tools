import { useCallback, useEffect, useState } from "react";

/**
 * React state backed by localStorage, with the guarded semantics every tool
 * previously re-implemented by hand: SSR-safe reads, private-mode/quota-safe
 * writes, and hydration after mount so the first client render matches SSR.
 *
 * String-focused by design — every current tool use case is a string. Callers
 * with structured data can JSON.stringify before storing.
 */
export function useStoredState(
  key: string,
  initialValue: string
): [string, (value: string) => void, () => void] {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored != null) setValue(stored);
    } catch {
      /* ignore storage access errors (private mode, etc.) */
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* ignore (private mode / quota) */
      }
    },
    [key]
  );

  const clear = useCallback(() => {
    setValue(initialValue);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [initialValue, key]);

  return [value, update, clear] as const;
}

/** Whether the stored value has been read from localStorage at least once. */
export function useStoredHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
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
