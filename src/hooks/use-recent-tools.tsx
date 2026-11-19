"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { getToolPage, normalizeHref, toolPages, type ToolMeta } from "@/lib/site";

const RECENT_KEY = "sdt:recent-tools";
const PINNED_KEY = "sdt:pinned-tools";
export const MAX_RECENT = 5;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

const toolHrefs = new Set(toolPages.map((t) => normalizeHref(t.href)));

type RecentToolsValue = {
  recent: string[];
  pinned: string[];
  recordVisit: (href: string) => void;
  togglePin: (href: string) => void;
  isPinned: (href: string) => boolean;
  clearRecent: () => void;
  /** True once localStorage has been read on the client (avoids first-paint flash). */
  hydrated: boolean;
};

const RecentToolsContext = React.createContext<RecentToolsValue | null>(null);

export function RecentToolsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [recent, setRecent] = React.useState<string[]>([]);
  const [pinned, setPinned] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setRecent(readList(RECENT_KEY));
    setPinned(readList(PINNED_KEY));
    setHydrated(true);
  }, []);

  const recordVisit = React.useCallback((href: string) => {
    const key = normalizeHref(href);
    if (!toolHrefs.has(key)) return;
    setRecent((prev) => {
      const next = [key, ...prev.filter((h) => h !== key)].slice(0, MAX_RECENT);
      writeList(RECENT_KEY, next);
      return next;
    });
  }, []);

  // Record the active tool whenever the route changes.
  React.useEffect(() => {
    if (pathname) recordVisit(pathname);
  }, [pathname, recordVisit]);

  const togglePin = React.useCallback((href: string) => {
    const key = normalizeHref(href);
    if (!toolHrefs.has(key)) return;
    setPinned((prev) => {
      const next = prev.includes(key) ? prev.filter((h) => h !== key) : [...prev, key];
      writeList(PINNED_KEY, next);
      return next;
    });
  }, []);

  const isPinned = React.useCallback((href: string) => pinned.includes(normalizeHref(href)), [pinned]);

  const clearRecent = React.useCallback(() => {
    setRecent([]);
    writeList(RECENT_KEY, []);
  }, []);

  const value = React.useMemo<RecentToolsValue>(
    () => ({ recent, pinned, recordVisit, togglePin, isPinned, clearRecent, hydrated }),
    [recent, pinned, recordVisit, togglePin, isPinned, clearRecent, hydrated]
  );

  return <RecentToolsContext.Provider value={value}>{children}</RecentToolsContext.Provider>;
}

export function useRecentTools(): RecentToolsValue {
  const ctx = React.useContext(RecentToolsContext);
  if (!ctx) {
    // Safe fallback so the hook works even outside the provider.
    return {
      recent: [],
      pinned: [],
      recordVisit: () => {},
      togglePin: () => {},
      isPinned: () => false,
      clearRecent: () => {},
      hydrated: false,
    };
  }
  return ctx;
}

const isTool = (tool: ToolMeta | undefined): tool is ToolMeta => tool != null;

/**
 * Pinned and recent tools as catalog entries, with pinned tools left out of
 * the recent list so nothing is shown twice. Memoized, so typing in a search
 * box or navigating does not rebuild the lists.
 */
export function useQuickTools(): { pinnedTools: ToolMeta[]; recentTools: ToolMeta[] } {
  const { pinned, recent } = useRecentTools();
  return React.useMemo(() => {
    const pinnedSet = new Set(pinned);
    return {
      pinnedTools: pinned.map((href) => getToolPage(href)).filter(isTool),
      recentTools: recent
        .filter((href) => !pinnedSet.has(href))
        .map((href) => getToolPage(href))
        .filter(isTool),
    };
  }, [pinned, recent]);
}
