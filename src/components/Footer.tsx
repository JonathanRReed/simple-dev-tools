import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { siteConfig, trustPages } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/70 px-6 py-10 backdrop-blur">
      <div className="footer-panel mx-auto grid w-full max-w-6xl gap-8 rounded-[1.75rem] border border-border/50 p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex flex-col gap-3">
            <Image
              src="/simple_dev_tools_logo_assets/simple-dev-tools-logo-footer-transparent.png"
              alt={`${siteConfig.name} by ${siteConfig.provider.name}`}
              width={512}
              height={171}
              className="h-16 w-auto"
              unoptimized
            />
            <p className="text-sm text-muted-foreground">Quiet developer tools for focused browser work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1 rounded-md bg-secondary/70 text-secondary-foreground">
              Built by Jonathan Reed
            </Badge>
            <span className="text-xs">2026 (c) All Rights Reserved</span>
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
          <Button asChild className="btn-press h-11 w-fit rounded-xl px-5">
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
      className="flex min-h-12 items-center justify-between rounded-xl border border-border/60 bg-card/55 px-4 py-3 text-sm transition duration-200 hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-semibold text-primary">{label}</span>
      <ExternalLink className="h-4 w-4 text-primary" />
    </Link>
  );
}
