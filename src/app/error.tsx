'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCcw } from 'lucide-react';

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
      <header className="space-y-2">
        <p className="brutal-label">Error</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          This tool hit an unexpected error. Your data stays in the browser. Try again, or head back home.
        </p>
      </header>

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
          <Link href="/">
            <Home className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </Button>
      </div>
    </ToolPage>
  );
}
