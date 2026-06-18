import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Home } from 'lucide-react';

import ToolPage from '@/components/layout/ToolPage';
import { toolPages } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="brutal-label">404</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          That route doesn’t exist. Jump to a tool below, or head back home.
        </p>
      </header>

      <ul aria-label="Tools" className="divide-y-2 divide-border border-2 border-border bg-card">
        {toolPages.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{tool.title}</span>
                <span className="block truncate text-sm text-muted-foreground">{tool.description}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/10"
      >
        <Home className="size-4" aria-hidden="true" />
        Back to home
      </Link>
    </ToolPage>
  );
}
