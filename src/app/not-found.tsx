import type { Metadata } from 'next';
import { ArrowRight, Home } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import ToolPage from '@/components/layout/ToolPage';
import { getToolIcon } from '@/components/ToolIcon';
import { toolPages } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="404" title="Page not found">
        <p>That route doesn’t exist. Jump to a tool below, or head back home.</p>
      </PageHeader>

      <ul aria-label="Tools" className="divide-y-2 divide-border border-2 border-border bg-card">
        {toolPages.map((tool) => {
          const Icon = getToolIcon(tool.icon);
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
                  <span className="block font-semibold text-foreground">{tool.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{tool.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>

      {/* A full document load reapplies the route-specific CSP. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/10"
      >
        <Home className="size-4" aria-hidden="true" />
        Back to home
      </a>
    </ToolPage>
  );
}
