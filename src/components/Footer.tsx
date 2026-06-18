import Link from 'next/link';
import { ArrowUpRight, ExternalLink } from 'lucide-react';

import BrandMark from '@/components/BrandMark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { siteConfig, trustPages } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="footer-panel mt-12 px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 border-2 border-border bg-card p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex w-fit items-center gap-3" aria-label={`${siteConfig.name} home`}>
              <BrandMark className="size-11 shrink-0" />
              <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                {siteConfig.name}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">Quiet developer tools for focused browser work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
              Built by Jonathan R Reed
            </Badge>
            <span className="text-xs">© {new Date().getFullYear()} Jonathan R Reed. All rights reserved.</span>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Browser-based utilities for common development tasks, built and maintained by Jonathan R Reed.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FooterExternalLink href={siteConfig.provider.url} label="helloworldfirm.com" />
            <FooterExternalLink href="https://JonathanRReed.com" label="JonathanRReed.com" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {trustPages.map((page) => (
              <Link key={page.href} href={page.href} className="inline-flex min-h-11 min-w-11 items-center text-primary underline-offset-4 hover:underline">
                {page.title}
              </Link>
            ))}
            <Link
              href="https://jonathanrreed.com/projects/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              More projects
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Button asChild className="h-11 w-fit px-5">
            <Link href="/api-snippet/">
              Explore tools
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}

function FooterExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center justify-between border-2 border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-semibold text-primary">{label}</span>
      <ExternalLink className="h-4 w-4 text-primary" />
    </Link>
  );
}
