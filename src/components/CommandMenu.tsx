"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Braces,
  CalendarClock,
  Clock,
  Code2,
  Database,
  FileJson,
  Home,
  Palette,
  QrCode,
  SearchCode,
  ShieldCheck,
  Workflow,
} from "lucide-react";

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
import { useRecentTools } from "@/hooks/use-recent-tools";
import { appThemes } from "@/lib/themes";
import { siteConfig, toolPages, trustPages, type ToolIcon } from "@/lib/site";

const iconMap = {
  braces: Braces,
  calendarClock: CalendarClock,
  clock: Clock,
  code: Code2,
  color: Palette,
  database: Database,
  json: FileJson,
  qr: QrCode,
  searchCode: SearchCode,
  shield: ShieldCheck,
  workflow: Workflow,
} satisfies Record<ToolIcon, typeof Code2>;

const normalize = (href: string) => (href === "/" ? "/" : href.replace(/\/$/, ""));

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
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { recent, pinned } = useRecentTools();

  const toggle = React.useCallback(() => setOpen((o) => !o), []);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Move to prev/next tool in the flat toolPages order.
  const step = React.useCallback(
    (delta: number) => {
      const idx = toolPages.findIndex((t) => normalize(t.href) === normalize(pathname ?? ""));
      const base = idx === -1 ? (delta > 0 ? -1 : 0) : idx;
      const next = (base + delta + toolPages.length) % toolPages.length;
      router.push(toolPages[next].href);
    },
    [pathname, router]
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

  const byHref = React.useMemo(() => {
    const map = new Map<string, (typeof toolPages)[number]>();
    for (const t of toolPages) map.set(normalize(t.href), t);
    return map;
  }, []);

  const pinnedTools = pinned.map((h) => byHref.get(h)).filter(Boolean) as typeof toolPages;
  const recentTools = recent
    .map((h) => byHref.get(h))
    .filter((t): t is (typeof toolPages)[number] => Boolean(t) && !pinned.includes(normalize(t!.href)));

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
                const Icon = iconMap[tool.icon];
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
                const Icon = iconMap[tool.icon];
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
              const Icon = iconMap[tool.icon];
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
