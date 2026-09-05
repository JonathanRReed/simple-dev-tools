import { ArrowUpRight, ShieldCheck } from 'lucide-react';

import BrandMark from '@/components/BrandMark';
import { featuredToolHrefs, getToolPage, siteConfig, toolPages, trustPages } from '@/lib/site';
import packageJson from '../../package.json';

const featuredTools = featuredToolHrefs
  .map((href) => getToolPage(href))
  .filter((tool): tool is NonNullable<typeof tool> => tool != null);

const siteLinks = [{ title: 'Home', href: '/' }, ...trustPages] as const;

const elsewhereLinks = [
  { title: 'GitHub', href: 'https://github.com/JonathanRReed/simple-dev-tools' },
  { title: 'helloworldfirm.com', href: siteConfig.provider.url },
  { title: 'JonathanRReed.com', href: siteConfig.author.url },
  { title: 'More projects', href: `${siteConfig.author.url}/projects/` },
] as const;

/**
 * Site footer: brand + local-first promise on the left, three link columns on
 * the right, and a single meta line. Square, 2px rules, no cards-in-cards.
 */
export default function Footer() {
  return (
    <footer className="mt-12 border-t-2 border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            {/* A full document load reapplies the route-specific CSP. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="flex w-fit items-center gap-3" aria-label={`${siteConfig.name} home`}>
              <BrandMark className="size-10 shrink-0" />
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                {siteConfig.name}
              </span>
            </a>
            <p className="max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
              {toolPages.length} local-first developer tools. Nothing you paste leaves your
              browser: no accounts, no servers, no tracking.
            </p>
            <p className="inline-flex w-fit items-center gap-1.5 border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="size-3.5 text-rp-pine" aria-hidden="true" />
              Runs locally
            </p>
          </div>

          <FooterColumn label="Site">
            {siteLinks.map((page) => (
              <li key={page.href}>
                <FooterLink href={page.href}>{page.title}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn label="Shortcuts">
            {featuredTools.map((tool) => (
              <li key={tool.href}>
                <FooterLink href={tool.href}>{tool.title}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn label="Elsewhere">
            {elsewhereLinks.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} external>
                  {link.title}
                </FooterLink>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t-2 border-border pt-5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.provider.name}
          </span>
          <span>v{packageJson.version} · Functional Source License</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-3">
      <p className="brutal-label">{label}</p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </nav>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex min-h-9 items-center gap-1 text-sm text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:text-primary"
    >
      {children}
      {external ? <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
    </a>
  );
}
