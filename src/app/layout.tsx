import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

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
import { SidebarInset } from '@/components/ui/sidebar';
import { siteConfig, toolPages } from '@/lib/site';

// Self-hosted (vendored) variable fonts — no build-time network fetch, so the
// static export builds reliably in any CI sandbox (e.g. Cloudflare Pages) and
// the fonts are served same-origin (satisfies the strict font-src 'self' CSP).
const fontSans = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
});

const fontDisplay = localFont({
  src: './fonts/space-grotesk-latin-variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '300 700',
});

const fontMono = localFont({
  src: './fonts/jetbrains-mono-latin-variable.woff2',
  variable: '--font-mono',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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

const authorProfile = {
  '@type': 'Person',
  name: siteConfig.author.name,
  alternateName: 'Jonathan Reed',
  url: siteConfig.author.url,
  sameAs: [
    'https://jonathanrreed.com/',
    'https://github.com/JonathanRReed',
    'https://helloworldfirm.com/',
  ],
};

const providerProfile = {
  '@type': 'Organization',
  name: siteConfig.provider.name,
  url: siteConfig.provider.url,
};

const toolEntities = toolPages.map((toolPage) => ({
  '@type': 'CreativeWork',
  name: toolPage.title,
  description: toolPage.description,
  url: `${siteConfig.url}${toolPage.href}`,
  creator: authorProfile,
  publisher: providerProfile,
  isAccessibleForFree: true,
}));

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  publisher: providerProfile,
  creator: authorProfile,
  inLanguage: 'en',
  hasPart: toolPages.map((toolPage) => ({
    '@type': 'WebPage',
    name: toolPage.title,
    description: toolPage.description,
    url: `${siteConfig.url}${toolPage.href}`,
    mainEntity: toolEntities.find((tool) => tool.url === `${siteConfig.url}${toolPage.href}`),
  })),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
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
                      <div className="flex min-w-0 flex-col overflow-x-hidden">
                        <div className="px-4 py-5 sm:px-6">
                          {children}
                        </div>
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
