import './globals.css';
import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ThemeToggle from '../components/ThemeToggle';

export const metadata = {
  title: 'Simple-Dev-Tools',
  description: 'Simple dev tools by Hello.World Consulting',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        {/* Initial theme: read from localStorage or prefers-color-scheme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var stored = localStorage.getItem('rp-theme');
                  var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'dawn' : 'main');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(_) {
                  document.documentElement.setAttribute('data-theme', 'main');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-rp-base text-rp-text font-sans min-h-screen flex flex-col relative overflow-x-hidden">
        <div className="flex flex-1 min-h-0 relative z-10">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen">
            {children}
          </main>
          <div className="fixed bottom-4 right-4 z-50">
            <ThemeToggle />
          </div>
        </div>
        <Footer />
      </body>
    </html>
  );
}
