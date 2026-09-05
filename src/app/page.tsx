'use client';

import * as React from 'react';
import { ArrowRight, Clock, Command as CommandIcon, SearchCode } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useCommandMenu } from '@/components/CommandMenu';
import { getToolIcon } from '@/components/ToolIcon';
import { MAX_RECENT, useRecentTools } from '@/hooks/use-recent-tools';
import { getToolPage, siteConfig, toolGroups, toolPages, type ToolPageInfo } from '@/lib/site';
import { cn } from '@/lib/utils';

const toolIndex = new Map(toolPages.map((t, i) => [t.href, i] as const));

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

const newHrefs = new Set(['/tools/diff/', '/tools/hash/', '/tools/markdown/', '/tools/query/']);

const allTags = Array.from(new Set(toolPages.flatMap((tool) => tool.tags))).sort();

export default function Home() {
  const { recent, clearRecent, hydrated } = useRecentTools();
  const { open, setOpen } = useCommandMenu();
  const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());

  const recentTools = React.useMemo(
    () =>
      recent
        .map((h) => getToolPage(h))
        .filter((t): t is ToolPageInfo => t != null)
        .slice(0, MAX_RECENT),
    [recent]
  );

  const hasActiveFilters = activeTags.size > 0;

  const toggleTag = React.useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const clearFilters = React.useCallback(() => {
    setActiveTags(new Set());
  }, []);

  const toolMatches = React.useCallback(
    (tool: ToolPageInfo) => {
      if (!hasActiveFilters) return true;
      return tool.tags.some((tag) => activeTags.has(tag));
    },
    [activeTags, hasActiveFilters]
  );

  const visibleCount = React.useMemo(
    () => toolPages.filter(toolMatches).length,
    [toolMatches]
  );

  // Press 1–9 to jump straight to a catalog tool (keyboard-first launcher).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key >= '1' && e.key <= '9') {
        const tool = toolPages[Number(e.key) - 1];
        if (tool) {
          e.preventDefault();
          window.location.assign(tool.href);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      {/* Masthead */}
      <header className="mb-8">
        <p className="brutal-label">{siteConfig.name}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
          Developer tools.
          <span className="text-muted-foreground"> Local, in-browser.</span>
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-muted-foreground">
          {toolPages.length} small, local tools. Nothing leaves your browser. Press{' '}
          <kbd className="border border-border bg-card px-1.5 py-0.5 text-xs">⌘K</kbd> anywhere,
          or <kbd className="border border-border bg-card px-1.5 py-0.5 text-xs">1</kbd>–
          <kbd className="border border-border bg-card px-1.5 py-0.5 text-xs">9</kbd> to jump.
        </p>
      </header>

      {/* Search launcher — opens the command palette (single search surface) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 border-2 border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary focus-visible:border-primary"
      >
        <SearchCode className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 font-mono text-sm text-muted-foreground group-hover:text-foreground">
          Search tools by name or tag…
        </span>
        <span className="hidden shrink-0 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground sm:flex">
          <CommandIcon className="size-3" aria-hidden="true" /> K
        </span>
      </button>

      {/* Recent strip — the fastest path back for returning visitors. */}
      {hydrated && recentTools.length > 0 ? (
        <section className="mt-6" aria-label="Recently opened tools">
          <div className="mb-2 flex items-center justify-between">
            <p className="brutal-label flex items-center gap-1.5">
              <Clock className="size-3" aria-hidden="true" /> Recent
            </p>
            <button
              type="button"
              onClick={clearRecent}
              className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTools.map((tool) => {
              const Icon = getToolIcon(tool.icon);
              return (
                <a
                  key={tool.href}
                  href={tool.href}
                  className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {tool.title}
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Tag filter */}
      <section className="mt-6" aria-label="Filter catalog by tag">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="brutal-label">Filter by tag</p>
          {hasActiveFilters ? (
            <div className="flex items-center gap-3" aria-live="polite" aria-atomic="true">
              <span className="font-mono text-xs text-muted-foreground">
                {visibleCount} of {toolPages.length} tools
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = activeTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                aria-label={`Filter by ${tag}`}
                className={cn(
                  'inline-flex items-center rounded-none border-2 px-2 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:border-primary',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary'
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </section>

      {/* Browse catalog */}
      {toolGroups.map((group) => {
        const matches = group.tools.filter(toolMatches);
        if (matches.length === 0) return null;
        return (
          <section key={group.title} className="mt-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="brutal-label">{group.title}</p>
              <p className="hidden font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground sm:block">
                {group.description}
              </p>
            </div>
            <ul aria-label={group.title} className="divide-y-2 divide-border border-2 border-border bg-card">
              {matches.map((tool) => {
                const Icon = getToolIcon(tool.icon);
                const idx = toolIndex.get(tool.href);
                const shortcut = idx != null && idx < 9 ? idx + 1 : null;
                const isNew = newHrefs.has(tool.href);
                return (
                  <li key={tool.href}>
                    <a
                      href={tool.href}
                      className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center border-2 border-border text-muted-foreground group-hover:border-primary group-hover:text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{tool.title}</span>
                          {isNew ? (
                            <Badge variant="default" className="h-4 px-1 text-[0.6rem]">
                              New
                            </Badge>
                          ) : null}
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
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {hasActiveFilters && visibleCount === 0 ? (
        <div className="mt-6 border-2 border-border bg-card px-3 py-4 font-mono text-sm text-muted-foreground">
          No tools match those tags.
        </div>
      ) : null}
    </div>
  );
}
