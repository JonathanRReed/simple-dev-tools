"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Palette } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { getToolIcon } from "@/components/ToolIcon";
import { useRecentTools } from "@/hooks/use-recent-tools";
import { appThemes } from "@/lib/themes";
import { getToolPage, normalizeHref, siteConfig, toolPages, trustPages, type ToolPageInfo } from "@/lib/site";

// Keyword aliases so typing "data", "feedback", etc. finds the right page.
const PAGE_KEYWORDS: Record<string, string[]> = {
  "/about/": ["team", "author", "who", "maintainer"],
  "/contact/": ["email", "support", "feedback", "bug"],
  "/privacy/": ["data", "local", "tracking", "cookies"],
};

type CommandMenuValue = { open: boolean; setOpen: (open: boolean) => void; toggle: () => void };
const CommandMenuContext = React.createContext<CommandMenuValue | null>(null);

export function useCommandMenu(): CommandMenuValue {
  const ctx = React.useContext(CommandMenuContext);
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} };
  return ctx;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { recent, pinned } = useRecentTools();

  const toggle = React.useCallback(() => setOpen((o) => !o), []);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      window.location.assign(href);
    },
    []
  );

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
  }, [toggle, step]);

  // Reset the query each time the palette opens.
  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const pinnedSet = new Set(pinned);
  const pinnedTools = pinned
    .map((h) => getToolPage(h))
    .filter((t): t is ToolPageInfo => t != null);
  const recentTools = recent
    .filter((h) => !pinnedSet.has(h))
    .map((h) => getToolPage(h))
    .filter((t): t is ToolPageInfo => t != null);

  const showQuickGroups = query.trim() === "";

  const value = React.useMemo<CommandMenuValue>(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search tools, pages, themes…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>

          {showQuickGroups && pinnedTools.length > 0 ? (
            <CommandGroup heading="Pinned">
              {pinnedTools.map((tool) => {
                const Icon = getToolIcon(tool.icon);
                return (
                  <CommandItem key={`pin-${tool.href}`} value={`pinned ${tool.title}`} onSelect={() => go(tool.href)}>
                    <Icon />
                    <span>{tool.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}

          {showQuickGroups && recentTools.length > 0 ? (
            <CommandGroup heading="Recent">
              {recentTools.map((tool) => {
                const Icon = getToolIcon(tool.icon);
                return (
                  <CommandItem key={`recent-${tool.href}`} value={`recent ${tool.title}`} onSelect={() => go(tool.href)}>
                    <Icon />
                    <span>{tool.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}

          <CommandGroup heading="Navigation">
            <CommandItem value="home overview" keywords={["start", "catalog"]} onSelect={() => go("/")}>
              <Home />
              <span>Home</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Tools">
            {toolPages.map((tool) => {
              const Icon = getToolIcon(tool.icon);
              return (
                <CommandItem
                  key={tool.href}
                  value={tool.title}
                  keywords={[...tool.tags]}
                  onSelect={() => go(tool.href)}
                >
                  <Icon />
                  <span>{tool.title}</span>
                  <CommandShortcut>{tool.tags[0]}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Pages">
            {trustPages.map((page) => (
              <CommandItem
                key={page.href}
                value={page.title}
                keywords={PAGE_KEYWORDS[page.href] ?? []}
                onSelect={() => go(page.href)}
              >
                <span>{page.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Theme">
            {appThemes.map((theme) => (
              <CommandItem
                key={theme.id}
                value={`theme ${theme.label}`}
                onSelect={() => {
                  setTheme(theme.id);
                  setOpen(false);
                }}
              >
                <Palette />
                <span>{theme.label}</span>
                <CommandShortcut>{theme.description}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center gap-4 border-t-2 border-border px-3 py-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>[ ] prev/next</span>
          <span className="ml-auto truncate">{siteConfig.shortName}</span>
        </div>
      </CommandDialog>
    </CommandMenuContext.Provider>
  );
}
