import { ArrowUpRight } from 'lucide-react';

import BrandMark from '@/components/BrandMark';
import { featuredToolHrefs, getToolPage, siteConfig, toolPages, trustPages } from '@/lib/site';
import packageJson from '../../package.json';

const featuredTools = featuredToolHrefs
  .map((href) => getToolPage(href))
  .filter((tool): tool is NonNullable<typeof tool> => tool != null);

// Static export: the year is fixed when the site is built.
const BUILD_YEAR = new Date().getFullYear();

const siteLinks = [{ title: 'All tools', href: '/' }, ...trustPages] as const;

const elsewhereLinks = [
  { title: 'Source on GitHub', href: 'https://github.com/JonathanRReed/simple-dev-tools' },
  { title: 'Hello.World Consulting', href: siteConfig.provider.url },
  { title: 'Jonathan R. Reed', href: siteConfig.author.url },
  { title: 'More projects', href: `${siteConfig.author.url}/projects/` },
] as const;

/**
 * Site footer: brand and the local-first promise on the left, three link
 * columns on the right, and one meta line. It sits on the bench under a
 * hairline, not in a card.
 */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            {/* A full document load reapplies the route-specific CSP. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="flex w-fit items-center gap-3 rounded-md" aria-label={`${siteConfig.name} home`}>
              <BrandMark className="size-9" label="" />
              <span className="font-display text-lg text-foreground">{siteConfig.name}</span>
            </a>
            <p className="max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
              {toolPages.length} developer tools that run in this tab. No account, no server, and
              nothing you paste is uploaded.
            </p>
          </div>

          <FooterColumn label="Site">
            {siteLinks.map((page) => (
              <li key={page.href}>
                <FooterLink href={page.href}>{page.title}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn label="Popular">
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

        <div className="mt-10 flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {BUILD_YEAR} {siteConfig.author.name}, {siteConfig.provider.name}
          </span>
          <span>
            Version {packageJson.version}, Functional Source License
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <ul className="flex flex-col">{children}</ul>
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
      className="inline-flex min-h-9 items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      {external ? <ArrowUpRight className="size-3.5 opacity-70" aria-hidden="true" /> : null}
    </a>
  );
}
