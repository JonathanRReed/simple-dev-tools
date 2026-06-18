'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Braces,
  CalendarClock,
  Clock,
  Code2,
  Command as CommandIcon,
  Database,
  FileJson,
  Palette,
  QrCode,
  SearchCode,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useCommandMenu } from '@/components/CommandMenu';
import { MAX_RECENT, useRecentTools } from '@/hooks/use-recent-tools';
import { siteConfig, toolGroups, toolPages, type ToolIcon, type ToolPageInfo } from '@/lib/site';
import { cn } from '@/lib/utils';

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

const normalize = (href: string) => (href === '/' ? '/' : href.replace(/\/$/, ''));
const toolIndex = new Map(toolPages.map((t, i) => [t.href, i] as const));

// Group labels match the sidebar's so the two surfaces read consistently.
const groupLabel = (title: string) => (title === 'Developer accelerators' ? 'Tools' : title);

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

export default function Home() {
  const router = useRouter();
  const { recent, clearRecent, hydrated } = useRecentTools();
  const { open, setOpen } = useCommandMenu();

  const recentTools = React.useMemo(
    () =>
      recent
        .map((h) => toolPages.find((t) => normalize(t.href) === h))
        .filter((t): t is ToolPageInfo => Boolean(t))
        .slice(0, MAX_RECENT),
    [recent]
  );

  // Press 1–9 to jump straight to a catalog tool (keyboard-first launcher).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key >= '1' && e.key <= '9') {
        const tool = toolPages[Number(e.key) - 1];
        if (tool) {
          e.preventDefault();
          router.push(tool.href);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, router]);

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      {/* Masthead */}
      <header className="mb-8">
        <p className="brutal-label">{siteConfig.name}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Developer tools.
          <span className="text-muted-foreground"> Local, in-browser.</span>
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-muted-foreground">
          {toolPages.length} small, local tools. Nothing leaves your browser. Press{' '}
          <kbd className="border border-border bg-card px-1.5 py-0.5 text-xs">⌘K</kbd> anywhere.
        </p>
      </header>

      {/* Search launcher — opens the command palette (single search surface) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 border-2 border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary focus-visible:border-primary"
        aria-label="Search tools"
      >
        <SearchCode className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 font-mono text-sm text-muted-foreground group-hover:text-foreground">
          Search tools by name or tag…
        </span>
        <span className="hidden shrink-0 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground sm:flex">
          <CommandIcon className="size-3" /> K
        </span>
      </button>

      {/* Browse catalog */}
      {toolGroups.map((group) => (
        <section key={group.title} className="mt-6">
          <p className="brutal-label mb-2">{groupLabel(group.title)}</p>
          <ul aria-label={groupLabel(group.title)} className="divide-y-2 divide-border border-2 border-border bg-card">
            {group.tools.map((tool) => {
              const Icon = iconMap[tool.icon];
              const idx = toolIndex.get(tool.href);
              const shortcut = idx != null && idx < 9 ? idx + 1 : null;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center border-2 border-border text-muted-foreground group-hover:border-primary group-hover:text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{tool.title}</span>
                        {tool.tags.slice(0, 1).map((tag) => (
                          <Badge key={tag} variant="outline" className="hidden sm:inline-flex">
                            {tag}
                          </Badge>
                        ))}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">{tool.description}</span>
                    </span>
                    {shortcut ? (
                      <kbd className="hidden shrink-0 border border-border bg-background px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-muted-foreground sm:inline-block">
                        {shortcut}
                      </kbd>
                    ) : null}
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Recent strip */}
      {hydrated ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="brutal-label flex items-center gap-1.5">
              <Clock className="size-3" /> Recent
            </p>
            {recentTools.length > 0 ? (
              <button
                type="button"
                onClick={clearRecent}
                className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
              >
                Clear
              </button>
            ) : null}
          </div>
          {recentTools.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentTools.map((tool) => {
                const Icon = iconMap[tool.icon];
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {tool.title}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-border bg-card px-3 py-2 font-mono text-sm text-muted-foreground">
              Tools you open appear here.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
