import type { Metadata } from 'next';
import { Home } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import ToolPage from '@/components/layout/ToolPage';

export const metadata: Metadata = {
  title: 'Offline',
  alternates: {
    canonical: '/offline/',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="No connection" title="You are offline">
        <p>
          Your connection dropped. Tools you&apos;ve already opened are usually cached and should
          keep working without a network.
        </p>
      </PageHeader>

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
