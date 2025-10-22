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
    default: 'Simple-Dev-Tools',
    template: '%s | Simple-Dev-Tools',
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
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
