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
        <div className="space-y-10">
          {toolGroups.map((group) => (
            <div key={group.title} className="space-y-6">
              <header className="space-y-1">
                <h3 className="text-xl font-semibold text-foreground">{group.title}</h3>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </header>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.tools.map((tool) => (
                  <Card key={tool.href} className="group h-full border-border/60 transition hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <tool.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{tool.title}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">{tool.description}</CardDescription>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/70 transition group-hover:text-primary" />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 pt-0 text-sm">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {tool.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-secondary/60 text-[11px] uppercase tracking-tight">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button asChild variant="ghost" className="justify-start gap-2 px-0 text-sm text-primary">
                        <Link href={tool.href}>
                          Open tool
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
