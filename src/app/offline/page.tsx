import type { Metadata } from 'next';
import { Home, WifiOff } from 'lucide-react';

import ToolPage from '@/components/layout/ToolPage';

export const metadata: Metadata = {
  title: 'Offline',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="brutal-label">No connection</p>
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <WifiOff className="size-8 text-muted-foreground" aria-hidden="true" />
          You are offline
        </h1>
        <p className="text-muted-foreground">
          Your connection dropped. Any tools you&apos;ve already opened are saved
          in your browser&apos;s cache and will keep working without a network.
        </p>
      </header>

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
