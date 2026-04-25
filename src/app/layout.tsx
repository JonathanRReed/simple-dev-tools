import './globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import type { ReactNode } from 'react';

import Footer from '@/components/Footer';
import AppSidebar, { AppSidebarProvider } from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import {
  NavigationProgressBar,
  NavigationProgressProvider,
} from '@/components/layout/NavigationProgress';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { siteConfig, toolPages } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Developer tools by ${siteConfig.author.name}`,
    template: `%s | ${siteConfig.name} by ${siteConfig.author.name}`,
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
};

const providerProfile = {
  '@type': 'Organization',
  name: siteConfig.provider.name,
  url: siteConfig.provider.url,
};

const softwareApplications = toolPages.map((toolPage) => ({
  '@type': 'SoftwareApplication',
  name: toolPage.title,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web browser',
  description: toolPage.description,
  url: `${siteConfig.url}${toolPage.href}`,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
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
    mainEntity: softwareApplications.find((app) => app.url === `${siteConfig.url}${toolPage.href}`),
  })),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="noise-overlay bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <NavigationProgressProvider>
            <NavigationProgressBar />
            <AppSidebarProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
              >
                Skip to content
              </a>
              <div className="flex w-full min-w-0 bg-background">
                <AppSidebar />
                <SidebarInset id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col">
                  <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/70 px-6 py-4 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <SidebarTrigger className="size-11 border border-border/60 bg-card/60" />
                      <Image
                        src="/simple_dev_tools_logo_assets/simple-dev-tools-logo-normal-512w.png"
                        alt={siteConfig.name}
                        width={200}
                        height={67}
                        className="h-8 w-auto"
                        unoptimized
                        priority
                      />
                    </div>
                    <ThemeToggle />
                  </header>
                  <div className="flex min-w-0 flex-col overflow-x-hidden">
                    <div className="px-6 py-6">
                      {children}
                    </div>
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
