import type { Metadata } from 'next';
import { Home } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import ToolPage from '@/components/layout/ToolPage';
import ToolChip from '@/components/tool/ToolChip';
import { toolCatalog } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="404" title="Page not found">
        <p>That address doesn’t lead anywhere. Pick a tool below.</p>
      </PageHeader>

      <ul aria-label="Tools" className="grid gap-3 sm:grid-cols-2">
        {toolCatalog.map((tool) => (
          <li key={tool.href}>
            <ToolChip tool={tool} />
          </li>
        ))}
      </ul>

      {/* A full document load reapplies the route-specific CSP. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="key inline-flex h-10 w-fit items-center gap-2 rounded-md px-4 text-sm font-semibold text-secondary-foreground sm:h-9"
      >
        <Home className="size-4" aria-hidden="true" />
        Back to all tools
      </a>
    </ToolPage>
  );
}
