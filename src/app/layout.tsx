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
    default: 'Simple Dev Tools | Developer accelerators by Jonathan R Reed',
    template: '%s | Simple Dev Tools by Jonathan R Reed',
  },
  description:
    'Simple Dev Tools is a set of developer accelerators by Jonathan R Reed that streamline debugging, formatting and everyday coding workflows.',
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
    title: 'Simple Dev Tools | Developer accelerators by Jonathan R Reed',
    description:
      'Simple Dev Tools is a set of developer accelerators by Jonathan R Reed that streamline debugging, formatting and everyday coding workflows.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simple Dev Tools | Developer accelerators by Jonathan R Reed',
    description:
      'Simple Dev Tools is a set of developer accelerators by Jonathan R Reed that streamline debugging, formatting and everyday coding workflows.',
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

const softwareOffer = {
  '@type': 'Offer',
  price: '0',
  priceCurrency: 'USD',
  availability: 'https://schema.org/InStock',
};

const authorProfile = {
  '@type': 'Person',
  name: 'Jonathan Reed',
  alternateName: 'Jonathan R Reed',
  url: 'https://jonathanrreed.com',
};

const providerProfile = {
  '@type': 'Organization',
  name: 'Hello.World Consulting',
  url: 'https://helloworldfirm.com',
};

const createApp = (
  name: string,
  description: string,
  path: string,
  image = 'https://dev-tools.helloworldfirm.com/logo.avif'
) => ({
  '@type': 'SoftwareApplication',
  name,
  description,
  url: `https://dev-tools.helloworldfirm.com${path}`,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript',
  offers: {
    ...softwareOffer,
    url: `https://dev-tools.helloworldfirm.com${path}`,
  },
  image,
  author: authorProfile,
  provider: providerProfile,
});

const jsonLd = {
  '@context': 'https://schema.org',
  ...createApp(
    'Simple Dev Tools',
    'Developer accelerators, encoders, regex lab, schema studio, security utilities by Hello.World Consulting.',
    ''
  ),
  hasPart: [
    createApp(
      'API Snippet Generator',
      'Draft OpenAPI-driven snippets for any stack on the fly.',
      '/api-snippet'
    ),
    createApp(
      'Mermaid Editor',
      'Sketch sequence diagrams, flows, and architecture quickly.',
      '/mermaid'
    ),
    createApp(
      'SQLite Playground',
      'Run SQL experiments with instant preview and persistence.',
      '/sqlite'
    ),
    createApp(
      'Regex Lab',
      'Iterate on regex patterns with explainers, tests, and sharing.',
      '/tools/regex'
    ),
    createApp(
      'IDs & Scheduling',
      'Generate ULIDs, UUIDs, and human-friendly CRON helpers.',
      '/tools/ids-cron'
    ),
    createApp(
      'Encoders & QR',
      'Encode payloads, produce QR assets, and inspect metadata.',
      '/tools/encode-qr'
    ),
    createApp(
      'Schema & Types Studio',
      'Convert sources between JSON Schema, TypeScript, and more.',
      '/studio/schema'
    ),
    createApp(
      'Security & Tokens',
      'Inspect JWTs, secrets, and verify signatures confidently.',
      '/studio/security'
    ),
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  if (typeof window === "undefined") return;
  var ascii = "\\n    ___  ________  ________     \\n   |\\\\  \\\\|\\\\   __  \\\\|\\\\   __  \\\\    \\n   \\\\ \\\\  \\\\ \\\\  \\\\|\\\\  \\\\ \\\\  \\\\|\\\\  \\\\   \\n __ \\\\ \\\\  \\\\ \\\\   _  _\\\\ \\\\   _  _\\\\  \\n|\\\\  \\\\\\\\_\\\\  \\\\ \\\\  \\\\\\\\  \\\\\\\\ \\\\  \\\\\\\\  \\\\| \\n\\\\ \\\\________\\\\ \\\\__\\\\\\\\ _\\\\\\\\ \\\\__\\\\\\\\ _\\\\\\n \\\\|________|\\\\|__|\\\\|__|\\\\|__|\\\\|__|\\n";
  console.log(ascii);
  console.log("Hey there. Interested in code?");
  console.log("Check out my GitHub: https://github.com/JonathanRReed");
  console.log("Most of my sites repos are open source.");
})();
`,
          }}
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
