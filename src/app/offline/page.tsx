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
      <PageHeader title="You are offline">
        <p>
          Your connection dropped. Tools you&apos;ve already opened are usually cached and should
          keep working without a network.
        </p>
      </PageHeader>

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
