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
  Pin,
  PinOff,
  QrCode,
  SearchCode,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRecentTools } from '@/hooks/use-recent-tools';
import { siteConfig, toolPages, type ToolIcon, type ToolPageInfo } from '@/lib/site';
import { cn } from '@/lib/utils';

const iconMap = {
  braces: Braces,
  calendarClock: CalendarClock,
  code: Code2,
  database: Database,
  qr: QrCode,
  searchCode: SearchCode,
  shield: ShieldCheck,
  workflow: Workflow,
} satisfies Record<ToolIcon, typeof Code2>;

const normalize = (href: string) => (href === '/' ? '/' : href.replace(/\/$/, ''));

function matches(tool: ToolPageInfo, q: string): boolean {
  if (!q) return true;
  const haystack = `${tool.title} ${tool.description} ${tool.tags.join(' ')}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export default function Home() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const { recent, togglePin, isPinned } = useRecentTools();

  const filtered = React.useMemo(() => toolPages.filter((t) => matches(t, query)), [query]);

  React.useEffect(() => {
    setHighlight(0);
  }, [query]);

  const recentTools = React.useMemo(
    () =>
      recent
        .map((h) => toolPages.find((t) => normalize(t.href) === h))
        .filter((t): t is ToolPageInfo => Boolean(t))
        .slice(0, 4),
    [recent]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[highlight];
      if (target) router.push(target.href);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      {/* Masthead */}
      <header className="mb-8">
        <p className="brutal-label">{siteConfig.shortName}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Developer tools.
          <span className="text-muted-foreground"> Local, in-browser.</span>
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-sm text-muted-foreground">
          {toolPages.length} focused utilities. Your data never leaves your browser. Press{' '}
          <kbd className="border border-border bg-card px-1.5 py-0.5 text-xs">⌘K</kbd> anywhere.
        </p>
      </header>

      {/* Search launcher */}
      <div className="border-2 border-border bg-card">
        <div className="flex items-center gap-2 border-b-2 border-border px-3">
          <SearchCode className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tools by name or tag…"
            aria-label="Search tools"
            className="h-12 border-0 bg-transparent px-0 font-mono text-base focus-visible:border-0"
          />
          <span className="hidden shrink-0 items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground sm:flex">
            <CommandIcon className="size-3" /> K
          </span>
        </div>

        <ul aria-label="Tools" className="divide-y-2 divide-border">
          {filtered.map((tool, i) => {
            const Icon = iconMap[tool.icon];
            const active = i === highlight;
            const pinnedNow = isPinned(tool.href);
            return (
              <li key={tool.href}>
                <div
                  className={cn(
                    'group flex items-center gap-3 px-3 py-3 transition-colors',
                    active ? 'bg-primary/10' : 'hover:bg-accent'
                  )}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <Link
                    href={tool.href}
                    className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center border-2',
                        active ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                      )}
                    >
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
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePin(tool.href)}
                    aria-label={pinnedNow ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
                    title={pinnedNow ? 'Unpin' : 'Pin'}
                    className="shrink-0 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    {pinnedNow ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </button>
                  <ArrowRight
                    className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/40')}
                    aria-hidden="true"
                  />
                </div>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center font-mono text-sm text-muted-foreground">
              No tools match “{query}”.
            </li>
          ) : null}
        </ul>
      </div>

      {/* Recent strip */}
      {recentTools.length > 0 ? (
        <section className="mt-6">
          <p className="brutal-label mb-2 flex items-center gap-1.5">
            <Clock className="size-3" /> Recent
          </p>
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
        </section>
      ) : null}
    </div>
  );
}
