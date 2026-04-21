'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Braces,
  CalendarClock,
  Code2,
  Database,
  QrCode,
  SearchCode,
  ShieldCheck,
  TerminalSquare,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { siteConfig, toolGroups, type ToolIcon } from '@/lib/site';
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

const primaryTools = toolGroups[0].tools;
const studioTools = toolGroups[1].tools;

export default function Home() {
  return (
    <div className="home-shell flex flex-1 flex-col overflow-x-hidden">
      <section className="home-hero mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:py-24">
        <div className="relative z-10 max-w-5xl">
          <p className="home-kicker">Simple Dev Tools</p>
          <h1 className="home-display mt-5 max-w-5xl text-5xl font-black leading-[0.95] text-foreground text-balance md:text-7xl">
            Fast tools for everyday dev work.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
            Browser utilities from {siteConfig.author.name} for API snippets, diagrams, SQL, regex, IDs, QR codes, schemas, and tokens.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="home-primary-cta btn-press h-12 rounded-xl px-6 text-base font-semibold">
              <Link href="/api-snippet/">
                Start with API snippets
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="home-secondary-cta btn-press h-12 rounded-xl px-6 text-base font-semibold">
              <Link href="/studio/schema/">
                Open schema studio
                <Braces className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="home-console group relative min-h-[430px] overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 p-4 shadow-2xl shadow-background/40 backdrop-blur">
          <div className="home-console-media" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-6 rounded-[1.5rem] border border-border/40 bg-background/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" />
                <span className="size-2.5 rounded-full bg-muted-foreground/50" />
                <span className="size-2.5 rounded-full bg-foreground/80" />
              </div>
              <TerminalSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-4">
              {primaryTools.slice(0, 4).map((tool) => {
                const Icon = iconMap[tool.icon];
                return (
                  <Link key={tool.href} href={tool.href} className="home-command-row group/row">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{tool.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">{tool.description}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 group-hover/row:text-primary" />
                  </Link>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="home-mini-panel">
                <span>curl</span>
                <strong>fetch</strong>
              </div>
              <div className="home-mini-panel">
                <span>json</span>
                <strong>zod</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="home-kicker">Tools</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black leading-none text-foreground text-balance md:text-5xl">
              Open the tool you need.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            Quick entry points for snippets, diagrams, local data, IDs, encoders, and regex checks.
          </p>
        </div>

        <div className="grid grid-flow-dense gap-6 md:grid-cols-2 lg:grid-cols-6">
          {primaryTools.map((tool, index) => (
            <ToolBentoCard
              key={tool.href}
              tool={tool}
              index={index}
              className={cn(index < 2 ? 'lg:col-span-3' : 'lg:col-span-2')}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[0.84fr_1.16fr] lg:py-32">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="home-kicker">Studios</p>
          <h2 className="mt-4 text-4xl font-black leading-none text-foreground text-balance md:text-5xl">
            Structured tools for schemas and tokens.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Generate types, validate payloads, inspect credentials, and keep sensitive checks local.
          </p>
        </div>
        <div className="workflow-accordion">
          {studioTools.map((tool) => {
            const Icon = iconMap[tool.icon];
            return (
              <Link key={tool.href} href={tool.href} className="workflow-panel group">
                <span className="relative z-10 flex h-full flex-col justify-between gap-10">
                  <span className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-background/70 text-primary backdrop-blur">
                      <Icon className="h-6 w-6" />
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-foreground/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                  </span>
                  <span>
                    <span className="block text-2xl font-black text-foreground">{tool.title}</span>
                    <span className="mt-3 block max-w-md text-sm leading-6 text-muted-foreground">{tool.description}</span>
                    <span className="mt-5 flex flex-wrap gap-2">
                      {tool.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="rounded-md bg-secondary/70 text-xs font-semibold">
                          {tag}
                        </Badge>
                      ))}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:pb-32">
        <div className="home-action-panel grid gap-8 rounded-[2rem] border border-border/50 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="home-kicker">Start here</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-none text-foreground text-balance md:text-5xl">
              Need a quick check?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Open a focused tool and get the result in the browser.
            </p>
          </div>
          <Button asChild size="lg" className="home-primary-cta btn-press h-12 rounded-xl px-6 text-base font-semibold">
            <Link href="/tools/regex/">
              Open Regex Lab
              <SearchCode className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ToolBentoCard({
  tool,
  index,
  className,
}: {
  tool: (typeof primaryTools)[number];
  index: number;
  className?: string;
}) {
  const Icon = iconMap[tool.icon];

  return (
    <SpotlightCard className={cn('card-stagger rounded-[1.25rem]', className)} style={{ animationDelay: `${index * 55}ms` }}>
      <Link href={tool.href} className="home-bento-card group">
        <span className="relative z-10 flex h-full flex-col justify-between gap-8">
          <span className="flex items-start justify-between gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-transform duration-500 group-hover:scale-105">
              <Icon className="h-6 w-6" />
            </span>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
          </span>
          <span>
            <span className="block text-2xl font-black leading-tight text-foreground">{tool.title}</span>
            <span className="mt-3 block max-w-md text-sm leading-6 text-muted-foreground">{tool.description}</span>
            <span className="mt-6 flex flex-wrap gap-2">
              {tool.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-md bg-secondary/70 text-xs font-semibold">
                  {tag}
                </Badge>
              ))}
            </span>
          </span>
        </span>
      </Link>
    </SpotlightCard>
  );
}
