import './globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import type { Organization, Person, WebPage, WebSite, WithContext } from 'schema-dts';

import AppHeader from '@/components/AppHeader';
import { CommandMenuProvider } from '@/components/CommandMenu';
import Footer from '@/components/Footer';
import AppSidebar, { AppSidebarProvider } from '@/components/Sidebar';
import { BackToTop } from '@/components/layout/BackToTop';
import {
  NavigationProgressBar,
  NavigationProgressProvider,
} from '@/components/layout/NavigationProgress';
import { RouteFocus } from '@/components/layout/RouteFocus';
import { ThemeProvider } from '@/components/theme-provider';
import { RecentToolsProvider } from '@/hooks/use-recent-tools';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { SidebarInset } from '@/components/ui/sidebar';
import { siteConfig, toolPages } from '@/lib/site';

// Self-hosted (vendored) fonts — no build-time network fetch, so the static
// export builds reliably in any CI sandbox (e.g. Cloudflare Pages) and the
// fonts are served same-origin (satisfies the strict font-src 'self' CSP).
// globals.css maps these variables onto --font-sans, --font-mono and the
// `font-display` utility. See src/app/fonts/README.md for where each came from.
const fontArchivo = localFont({
  src: './fonts/archivo-latin-variable.woff2',
  variable: '--font-archivo',
  display: 'swap',
  weight: '100 900',
});

// Headings use one static cut (expanded width, weight 800) rather than the
// two-axis variable file, which is six times the size.
const fontArchivoDisplay = localFont({
  src: './fonts/archivo-display-latin-800.woff2',
  variable: '--font-archivo-display',
  display: 'swap',
  weight: '800',
});

// The default metric-adjusted fallback is a proportional face, which would
// reflow every digest and table when the real font arrives. Fall back to the
// system monospace instead, so only the letterforms change.
const fontAtkinsonMono = localFont({
  src: './fonts/atkinson-hyperlegible-mono-latin-variable.woff2',
  variable: '--font-atkinson-mono',
  display: 'swap',
  weight: '200 800',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Developer tools by ${siteConfig.author.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.provider.name,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Developer tools by ${siteConfig.author.name}`,
    description: siteConfig.description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} by ${siteConfig.author.name}`,
      },
      {
        url: '/simple_dev_tools_logo_assets/simple-dev-tools-favicon-512x512.png',
        width: 512,
        height: 512,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | Developer tools by ${siteConfig.author.name}`,
    description: siteConfig.description,
    creator: siteConfig.author.handle,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/simple_dev_tools_logo_assets/favicon.ico', sizes: 'any' },
      { url: '/simple_dev_tools_logo_assets/icon.svg', type: 'image/svg+xml' },
      { url: '/simple_dev_tools_logo_assets/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/simple_dev_tools_logo_assets/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/simple_dev_tools_logo_assets/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
    shortcut: '/simple_dev_tools_logo_assets/favicon.ico',
  },
  manifest: '/simple_dev_tools_logo_assets/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the default dark and light benches (Art Deco and Paper).
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#020508' },
    { media: '(prefers-color-scheme: light)', color: '#f7f3ea' },
  ],
  colorScheme: 'dark light',
};

// Structured data, typed against schema.org via schema-dts so a renamed
// property or wrong enum fails typecheck instead of silently going stale.
const authorProfile: Person = {
  '@type': 'Person',
  name: siteConfig.author.name,
  alternateName: 'Jonathan Reed',
  url: siteConfig.author.url,
  sameAs: ['https://jonathanrreed.com/', 'https://github.com/JonathanRReed'],
};

const providerProfile: Organization = {
  '@type': 'Organization',
  name: siteConfig.provider.name,
  url: siteConfig.provider.url,
};

const toolWebPages: WebPage[] = toolPages.map((toolPage) => {
  const url = `${siteConfig.url}${toolPage.href}`;
  return {
    '@type': 'WebPage',
    name: toolPage.title,
    description: toolPage.description,
    url,
    mainEntity: {
      '@type': 'CreativeWork',
      name: toolPage.title,
      description: toolPage.description,
      url,
      creator: authorProfile,
      publisher: providerProfile,
      isAccessibleForFree: true,
    },
  };
});

const jsonLd: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  publisher: providerProfile,
  creator: authorProfile,
  inLanguage: 'en',
  hasPart: toolWebPages,
};

// Escape "<" so the JSON can never close the <script> element early.
const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

// Navigation is by full page loads, so let the browser fetch a page's HTML
// while the pointer is still on its link. Prefetch only, never prerender: a
// prerendered tool would run and record itself as "recently opened" without
// ever being seen. Browsers that do not know speculation rules ignore this.
const speculationRules = JSON.stringify({
  prefetch: [
    {
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: '/sqljs/*' } },
          { not: { href_matches: '/*.*' } },
        ],
      },
      eagerness: 'moderate',
    },
  ],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontArchivo.variable} ${fontArchivoDisplay.variable} ${fontAtkinsonMono.variable}`}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: speculationRules }} />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <NavigationProgressProvider>
            <NavigationProgressBar />
            <RecentToolsProvider>
              <AppSidebarProvider>
                <CommandMenuProvider>
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-input focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-pop"
                  >
                    Skip to content
                  </a>
                  <div className="bench flex w-full min-w-0">
                    <AppSidebar />
                    <SidebarInset id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col bg-transparent">
                      <AppHeader />
                      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                        <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</div>
                        <Footer />
                      </div>
                      <RouteFocus />
                      <BackToTop />
                    </SidebarInset>
                  </div>
                </CommandMenuProvider>
              </AppSidebarProvider>
            </RecentToolsProvider>
          </NavigationProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
