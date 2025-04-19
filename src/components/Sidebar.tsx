"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'API Snippet Generator', href: '/api-snippet' },
  { name: 'Mermaid Editor', href: '/mermaid' },
  { name: 'SQLite Playground', href: '/sqlite' },
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
        stroke="#3399ff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px #3399ff)' }}
      />
    </svg>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  return (
    <nav
      className={`fixed top-0 left-0 h-full z-40 flex flex-col items-center bg-[#0a0f29]/70 backdrop-blur-xl border-r border-[#3399ff] shadow-xl pt-6 pb-12 glassmorphic transition-all duration-300
        ${open ? 'min-w-[200px] max-w-[320px] px-6' : 'w-14 px-0'}
      `}
      style={{ boxShadow: '0 4px 32px 0 #3399ff33, 0 1.5px 8px 0 #ff4dc433' }}
    >
      {/* Logo and Site Title (only when open) */}
      <div className={`flex items-center gap-2 mb-4 ${open ? 'self-start' : 'justify-center w-full'}`}>
        <Image src="/logo.avif" alt="Logo" width={40} height={40} className="rounded-full" unoptimized />
        {open && (
          <span className="text-2xl font-bold text-white tracking-tight select-none">Simple-Dev-Tools</span>
        )}
      </div>
      <div className={`flex flex-col gap-4 mt-2 w-full ${open ? '' : 'items-center'}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl bg-[#1a1e2e]/70 border border-[#3399ff33] shadow-md ${open ? 'px-4 py-3 text-lg w-full text-left' : 'w-10 h-10 flex items-center justify-center p-0 text-xl'} text-[#E0E0E0] hover:text-[#ff4dc4] hover:border-[#ff4dc4] transition-colors font-semibold menu`}
          >
            {open ? item.name : item.name[0]}
          </Link>
        ))}
      </div>
      {/* Toggle button: absolutely positioned, vertically centered, right edge */}
      <button
        className="absolute top-1/2 right-[-20px] -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg border border-[#3399ff] bg-[#000]/60 backdrop-blur text-[#3399ff] hover:text-[#ff4dc4] hover:border-[#ff4dc4] transition-colors shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle Sidebar"
        style={{ zIndex: 50 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={open ? "M8.5 5l7 7-7 7" : "M19 9H5c-.55 0-1 .45-1 1s.45 1 1 1h14c.55 0 1-.45 1-1s-.45-1-1-1zM5 15h14c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1 .45-1 1s.45 1 1 1z"} stroke="#3399ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
