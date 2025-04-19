import './globals.css';
import type { ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Simple-Dev-Tools',
  description: 'Simple dev tools by Hello.World Consulting',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
      </head>
      <body className="bg-oled text-bodyText font-sans min-h-screen flex flex-col relative overflow-x-hidden">
        <div className="flex flex-1 min-h-0 relative z-10">
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen">{/* main content fills viewport */}
            {children}
          </main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
