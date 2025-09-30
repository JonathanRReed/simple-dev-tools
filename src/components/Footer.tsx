import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-border/60 bg-background/60 px-6 py-6 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 text-sm">
        <Card className="border-border/60 bg-card/70 backdrop-blur">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Image src="/logo.avif" alt="Hello.World Consulting" width={42} height={42} className="rounded-full logo-img-strict" unoptimized />
            <div>
              <CardTitle className="text-xl">Hello.World Consulting</CardTitle>
              <CardDescription className="text-muted-foreground">Simple dev tools for teams that ship.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="flex items-center gap-1 bg-secondary/60 text-secondary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Crafted by Jonathan Reed
              </Badge>
              <span className="text-xs">2025 © All Rights Reserved</span>
            </div>
            <Separator className="bg-border/40" />
            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="https://helloworldfirm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/10"
              >
                <span className="font-semibold text-primary">helloworldfirm.com</span>
                <ExternalLink className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="https://JonathanRReed.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/10"
              >
                <span className="font-semibold text-primary">JonathanRReed.com</span>
                <ExternalLink className="h-4 w-4 text-primary" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Image src="/jonathan.avif" alt="Jonathan Reed" width={28} height={28} className="rounded-full border border-primary/50 profile-img-strict" unoptimized />
              <span>Built with care for the developer community.</span>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:text-primary">
                <Link href="/api-snippet">Explore tools</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </footer>
  );
}
