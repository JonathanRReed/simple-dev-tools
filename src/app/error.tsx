'use client';

import { useEffect } from 'react';
import { Home, RotateCcw } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import ToolPage from '@/components/layout/ToolPage';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for debugging; nothing is sent anywhere.
    console.error(error);
  }, [error]);

  return (
    <ToolPage contentClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Error" title="Something went wrong">
        <p>
          This tool hit an unexpected error. Your data stays in the browser. Try again, or head
          back home.
        </p>
      </PageHeader>

      <div className="border-2 border-destructive/60 bg-card p-4">
        <p className="font-mono text-sm text-muted-foreground">
          {error.message || 'Unknown error.'}
          {error.digest ? <span className="block text-xs text-muted-foreground/70">Digest: {error.digest}</span> : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline" className="gap-2">
          {/* A full document load reapplies the route-specific CSP. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">
            <Home className="size-4" aria-hidden="true" />
            Back to home
          </a>
        </Button>
      </div>
    </ToolPage>
  );
}
