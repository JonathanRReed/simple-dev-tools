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

// Self-hosted (vendored) variable fonts — no build-time network fetch, so the
// static export builds reliably in any CI sandbox (e.g. Cloudflare Pages) and
// the fonts are served same-origin (satisfies the strict font-src 'self' CSP).
// globals.css maps these variables onto Tailwind's --font-sans/display/mono.
const fontInter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

const fontSpaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-variable.woff2',
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: '300 700',
});

const fontJetBrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-variable.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: '100 800',
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
        url: '/og-image.avif',
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
    images: ['/og-image.avif'],
  },
  icons: {
    icon: [
      { url: '/simple_dev_tools_logo_assets/favicon.ico', sizes: 'any' },
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
  themeColor: '#0a0d12',
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontInter.variable} ${fontSpaceGrotesk.variable} ${fontJetBrainsMono.variable}`}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
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
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground"
                  >
                    Skip to content
                  </a>
                  <div className="flex w-full min-w-0 bg-background">
                    <AppSidebar />
                    <SidebarInset id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col">
                      <AppHeader />
                      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                        <div className="flex-1 px-4 py-5 sm:px-6">{children}</div>
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
