'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  Code2,
  Database,
  QrCode,
  SearchCode,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpotlightCard } from '@/components/ui/spotlight-card';

const toolGroups = [
  {
    title: 'Developer accelerators',
    description: 'Ship faster with guardrails and reusable snippets.',
    tools: [
      {
        title: 'API Snippet Generator',
        href: '/api-snippet',
        description: 'Draft OpenAPI-driven snippets for any stack on the fly.',
        icon: Code2,
        tags: ['REST', 'Swagger', 'Docs'],
      },
      {
        title: 'Mermaid Editor',
        href: '/mermaid',
        description: 'Sketch sequence diagrams, flows, and architecture quickly.',
        icon: Workflow,
        tags: ['Diagrams', 'Planning'],
      },
      {
        title: 'SQLite Playground',
        href: '/sqlite',
        description: 'Run SQL experiments with instant preview and persistence.',
        icon: Database,
        tags: ['SQL', 'Data'],
      },
      {
        title: 'Regex Lab',
        href: '/tools/regex',
        description: 'Iterate on patterns with explainers, tests, and sharing.',
        icon: SearchCode,
        tags: ['Regex', 'Testing'],
      },
      {
        title: 'IDs & Scheduling',
        href: '/tools/ids-cron',
        description: 'Generate ULIDs, UUIDs, and human-friendly CRON helpers.',
        icon: CalendarClock,
        tags: ['Scheduling', 'Automation'],
      },
      {
        title: 'Encoders & QR',
        href: '/tools/encode-qr',
        description: 'Encode payloads, produce QR assets, and inspect metadata.',
        icon: QrCode,
        tags: ['Security', 'Utilities'],
      },
    ],
  },
  {
    title: 'Studios',
    description: 'Opinionated workspaces for deeper problems.',
    tools: [
      {
        title: 'Schema & Types Studio',
        href: '/studio/schema',
        description: 'Convert sources between JSON Schema, TypeScript, and more.',
        icon: Code2,
        tags: ['Types', 'Validation'],
      },
      {
        title: 'Security & Tokens',
        href: '/studio/security',
        description: 'Inspect JWTs, secrets, and verify signatures confidently.',
        icon: ShieldCheck,
        tags: ['Security', 'Identity'],
      },
    ],
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {/* Hero Header with subtle gradient and enhanced styling */}
        <header className="mb-12 space-y-5 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-background p-6 backdrop-blur-sm sm:p-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl lg:text-5xl">
            <span className="gradient-text">Simple Dev Tools</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A small toolbox built by{' '}
            <span className="font-medium text-primary">Jonathan R Reed</span>{' '}
            to make everyday development faster and less noisy.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Explore quick utilities, accelerators, and studios to ship documentation, diagrams, data experiments, and more.
          </p>
        </header>

        {/* Tool Groups with staggered reveal and spotlight cards */}
        <div className="space-y-12">
          {toolGroups.map((group) => (
            <div key={group.title} className="space-y-6">
              <header className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{group.title}</h2>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </header>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.tools.map((tool, index) => (
                  <SpotlightCard key={tool.href} className="card-stagger h-full rounded-xl" style={{ animationDelay: `${index * 60}ms` }}>
                    <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm">
                      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary transition-transform duration-200 group-hover:scale-105">
                            <tool.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{tool.title}</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">{tool.description}</CardDescription>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4 pt-0 text-sm">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {tool.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-secondary/40 text-[11px] uppercase tracking-tight transition-colors hover:bg-secondary/60">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button asChild variant="ghost" className="btn-press justify-start gap-2 px-0 text-sm text-primary hover:bg-transparent hover:text-primary/80">
                          <Link href={tool.href}>
                            Open tool
                            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
