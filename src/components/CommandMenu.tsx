"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isTypingTarget, useSingleKeyShortcuts } from "@/hooks/use-single-key-shortcuts";
import { normalizeHref, toolPages } from "@/lib/site";

// The dialog (search library, Radix dialog, content detector) is not needed
// to paint or hydrate a page, so it is a separate chunk.
const loadPalette = () => import("@/components/CommandPalette");
const CommandPalette = dynamic(loadPalette, { ssr: false });

type CommandMenuValue = { open: boolean; setOpen: (open: boolean) => void; toggle: () => void };
const CommandMenuContext = React.createContext<CommandMenuValue | null>(null);

export function useCommandMenu(): CommandMenuValue {
  const ctx = React.useContext(CommandMenuContext);
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} };
  return ctx;
}

/**
 * Owns the command palette's open state and the global shortcuts (⌘K, `/`,
 * `[` and `]`). The palette UI itself is loaded on demand; see CommandPalette.
 */
export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // Mount the dialog only once it has been asked for, then keep it mounted so
  // its close animation can run.
  const [requested, setRequested] = React.useState(false);
  const pathname = usePathname();
  const [shortcutsOn] = useSingleKeyShortcuts();

  const toggle = React.useCallback(() => setOpen((o) => !o), []);

  React.useEffect(() => {
    if (open) setRequested(true);
  }, [open]);

  // Fetch the chunk when the browser is idle, so the first ⌘K is instant
  // without the download competing with the page's own work.
  React.useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadPalette(), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(() => void loadPalette(), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Move to prev/next tool in the flat toolPages order.
  const step = React.useCallback(
    (delta: number) => {
      const idx = toolPages.findIndex((t) => normalizeHref(t.href) === normalizeHref(pathname ?? ""));
      const base = idx === -1 ? (delta > 0 ? -1 : 0) : idx;
      const next = (base + delta + toolPages.length) % toolPages.length;
      window.location.assign(toolPages[next].href);
    },
    [pathname]
  );

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K toggles the palette from anywhere.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
        return;
      }
      // The rest are single-character shortcuts, which can be switched off.
      if (!shortcutsOn) return;
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/" || e.key === "?") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "[") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "]") {
        e.preventDefault();
        step(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle, step, shortcutsOn]);

  const value = React.useMemo<CommandMenuValue>(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      {requested ? <CommandPalette open={open} setOpen={setOpen} /> : null}
    </CommandMenuContext.Provider>
  );
}
