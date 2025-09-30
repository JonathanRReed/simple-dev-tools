"use client";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'API Snippet Generator', href: '/api-snippet' },
  { name: 'Mermaid Editor', href: '/mermaid' },
  { name: 'SQLite Playground', href: '/sqlite' },
  { name: 'Regex Lab', href: '/tools/regex' },
  { name: 'IDs & Scheduling', href: '/tools/ids-cron' },
  { name: 'Encoders & QR', href: '/tools/encode-qr' },
  { name: 'Schema & Types Studio', href: '/studio/schema' },
  { name: 'Security & Tokens', href: '/studio/security' },
];

function ChevronIcon({ left = true }: { left?: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block align-middle"
    >
      <path
        d={left ? "M15.5 19l-7-7 7-7" : "M8.5 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className={`fixed top-0 left-0 h-full z-40 flex flex-col items-center bg-rp-surface/70 backdrop-blur-2xl backdrop-saturate-150 border-r border-rp-highlight-high shadow-[0_8px_32px_rgba(0,0,0,0.35)] pt-6 pb-12 transition-[width,padding] duration-300
        ${open ? 'min-w-[220px] max-w-[320px] px-6' : 'w-14 px-0'}
      `}
    >
      {/* Logo and Site Title (only when open) */}
      <div className={`flex items-center gap-2 mb-4 ${open ? 'self-start' : 'justify-center w-full'}`}>
        <Image src="/logo.avif" alt="Logo" width={40} height={40} className="rounded-full logo-img-strict" unoptimized />
        {open && (
          <span className="text-2xl font-bold text-rp-text tracking-tight select-none">Simple-Dev-Tools</span>
        )}
      </div>
      <div className={`flex flex-col gap-3 mt-2 w-full ${open ? '' : 'items-center'}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.name}
            aria-label={open ? undefined : item.name}
            className={`block border shadow-md ring-1 ring-black/5 transition-colors font-medium ${
              open
                ? isActive(item.href)
                  ? 'rounded-xl px-4 py-3 text-sm w-full text-left bg-rp-overlay/80 border-rp-iris text-rp-iris'
                  : 'rounded-xl px-4 py-3 text-sm w-full text-left bg-rp-surface/60 border-rp-highlight-high text-rp-text hover:text-rp-rose hover:border-rp-rose hover:bg-rp-overlay/60'
                : isActive(item.href)
                  ? 'rounded-full w-11 h-11 flex items-center justify-center p-0 text-[13px] bg-rp-overlay/80 border-rp-iris text-rp-iris'
                  : 'rounded-full w-11 h-11 flex items-center justify-center p-0 text-[13px] bg-rp-overlay/50 border-rp-highlight-high text-rp-text hover:text-rp-rose hover:border-rp-rose'
            }`}
          >
            {open ? item.name : item.name[0]}
          </Link>
        ))}
      </div>
      {/* Toggle button: absolutely positioned, vertically centered, right edge */}
      <button
        className="absolute top-1/2 right-[-16px] -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg border border-rp-iris bg-rp-base/60 backdrop-blur-2xl backdrop-saturate-150 text-rp-iris hover:text-rp-rose hover:border-rp-rose transition-colors shadow-lg"
        onClick={() => setOpen((v: boolean) => !v)}
        aria-label="Toggle Sidebar"
        aria-expanded={open}
        title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{ zIndex: 50 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={open ? "M15.5 19l-7-7 7-7" : "M8.5 5l7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
