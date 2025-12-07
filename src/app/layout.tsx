import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Footer from '@/components/Footer';
import AppSidebar, { AppSidebarProvider } from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import InitialLoadOverlay from '@/components/layout/InitialLoadOverlay';
import {
  NavigationProgressBar,
  NavigationProgressProvider,
} from '@/components/layout/NavigationProgress';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export const metadata: Metadata = {
  title: {
    default: 'Simple-Dev-Tools – Hello.World Consulting',
    template: '%s | Simple-Dev-Tools – Hello.World Consulting',
  },
  description:
    'Simple dev tools by Hello.World Consulting. Developer accelerators, encoders, regex lab, schema studio, security utilities, and more.',
  keywords: [
    'developer tools',
    'in-browser dev tools',
    'API snippet generator',
    'mermaid editor',
    'SQLite playground',
    'regex tester',
    'JSON schema validator',
    'JWT decoder',
    'QR code generator',
    'ULID generator',
    'cron expression',
  ],
  authors: [{ name: 'Jonathan Reed', url: 'https://jonathanrreed.com' }],
  creator: 'Hello.World Consulting',
  publisher: 'Hello.World Consulting',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dev-tools.helloworldfirm.com',
    siteName: 'Simple Dev Tools',
    title: 'Simple Dev Tools – Hello.World Consulting',
    description:
      'Developer accelerators, encoders, regex lab, schema studio, security utilities, and more. All tools run in-browser.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simple Dev Tools – Hello.World Consulting',
    description:
      'Developer accelerators, encoders, regex lab, schema studio, security utilities, and more.',
    creator: '@jonathanrreed',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/Favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/Favicon/favicon-96x96.avif', type: 'image/avif', sizes: '96x96' },
    ],
    apple: [{ url: '/Favicon/apple-touch-icon.avif', type: 'image/avif', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/Favicon/site.webmanifest',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Simple Dev Tools',
  description:
    'Developer accelerators, encoders, regex lab, schema studio, security utilities by Hello.World Consulting.',
  url: 'https://dev-tools.helloworldfirm.com',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  provider: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com',
  },
  author: {
    '@type': 'Person',
    name: 'Jonathan Reed',
    url: 'https://jonathanrreed.com',
  },
  hasPart: [
    {
      '@type': 'WebApplication',
      name: 'API Snippet Generator',
      description: 'Draft OpenAPI-driven snippets for any stack on the fly.',
      url: 'https://dev-tools.helloworldfirm.com/api-snippet',
    },
    {
      '@type': 'WebApplication',
      name: 'Mermaid Editor',
      description: 'Sketch sequence diagrams, flows, and architecture quickly.',
      url: 'https://dev-tools.helloworldfirm.com/mermaid',
    },
    {
      '@type': 'WebApplication',
      name: 'SQLite Playground',
      description: 'Run SQL experiments with instant preview and persistence.',
      url: 'https://dev-tools.helloworldfirm.com/sqlite',
    },
    {
      '@type': 'WebApplication',
      name: 'Regex Lab',
      description: 'Iterate on regex patterns with explainers, tests, and sharing.',
      url: 'https://dev-tools.helloworldfirm.com/tools/regex',
    },
    {
      '@type': 'WebApplication',
      name: 'IDs & Scheduling',
      description: 'Generate ULIDs, UUIDs, and human-friendly CRON helpers.',
      url: 'https://dev-tools.helloworldfirm.com/tools/ids-cron',
    },
    {
      '@type': 'WebApplication',
      name: 'Encoders & QR',
      description: 'Encode payloads, produce QR assets, and inspect metadata.',
      url: 'https://dev-tools.helloworldfirm.com/tools/encode-qr',
    },
    {
      '@type': 'WebApplication',
      name: 'Schema & Types Studio',
      description: 'Convert sources between JSON Schema, TypeScript, and more.',
      url: 'https://dev-tools.helloworldfirm.com/studio/schema',
    },
    {
      '@type': 'WebApplication',
      name: 'Security & Tokens',
      description: 'Inspect JWTs, secrets, and verify signatures confidently.',
      url: 'https://dev-tools.helloworldfirm.com/studio/security',
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <NavigationProgressProvider>
            <NavigationProgressBar />
            <AppSidebarProvider>
              <InitialLoadOverlay />
              <div className="flex bg-background max-w-7xl mx-auto w-full">
                <AppSidebar />
                <SidebarInset className="flex flex-1 flex-col">
                  <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <SidebarTrigger className="border border-border/60 bg-card/60" />
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">Simple-Dev-Tools</span>
                        <span className="text-sm text-muted-foreground">Hello.World Consulting</span>
                      </div>
                    </div>
                    <ThemeToggle />
                  </header>
                  <div className="flex flex-col">
                    <main className="px-6 py-6">
                      {children}
                    </main>
                    <Footer />
                  </div>
                </SidebarInset>
              </div>
            </AppSidebarProvider>
          </NavigationProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
