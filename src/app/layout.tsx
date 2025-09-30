import './globals.css';
import type { ReactNode } from 'react';

import Footer from '@/components/Footer';
import AppSidebar, { AppSidebarProvider } from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export const metadata = {
  title: 'Simple-Dev-Tools',
  description: 'Simple dev tools by Hello.World Consulting',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <AppSidebarProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
