'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Braces,
  CalendarClock,
  Code2,
  Database,
  Home,
  QrCode,
  SearchCode,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Sidebar as PrimitiveSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

const navSections = [
  {
    label: 'Overview',
    items: [
      { title: 'Home', href: '/', icon: Home, description: 'Product overview' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'API Snippet Generator', href: '/api-snippet', icon: Code2 },
      { title: 'Mermaid Editor', href: '/mermaid', icon: Workflow },
      { title: 'SQLite Playground', href: '/sqlite', icon: Database },
      { title: 'Regex Lab', href: '/tools/regex', icon: SearchCode },
      { title: 'IDs & Scheduling', href: '/tools/ids-cron', icon: CalendarClock },
      { title: 'Encoders & QR', href: '/tools/encode-qr', icon: QrCode },
    ],
  },
  {
    label: 'Studios',
    items: [
      { title: 'Schema & Types Studio', href: '/studio/schema', icon: Braces },
      { title: 'Security & Tokens', href: '/studio/security', icon: ShieldCheck },
    ],
  },
] as const;

export function AppSidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      {children}
      <SidebarRail />
    </SidebarProvider>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <PrimitiveSidebar
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
        <Link
          href="/"
          className="flex items-center gap-3 transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full"
        >
          <Image
            src="/logo.avif"
            alt="Logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full logo-img-strict group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            unoptimized
          />
          <div className="hidden flex-col text-left md:flex group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-semibold tracking-tight">Simple-Dev-Tools</span>
            <span className="text-xs text-muted-foreground">by Hello.World Consulting</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <ScrollArea className="h-[calc(100vh-220px)] pr-2 group-data-[collapsible=icon]:pr-0">
          {navSections.map((section) => (
            <SidebarGroup key={section.label} className="pb-2">
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.title}
                        className="text-sm"
                      >
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="group-data-[collapsible=icon]:sr-only">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
              <SidebarSeparator className="last:hidden" />
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="px-4 py-6 group-data-[collapsible=icon]:hidden">
        <div className="flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">A product of</p>
          <div className="flex items-center gap-2">
            <Image src="/logo.avif" alt="Hello.World Consulting" width={28} height={28} className="rounded-full logo-img-strict" unoptimized />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Hello.World Consulting</span>
              <Link
                href="https://helloworldfirm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                helloworldfirm.com
              </Link>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-border/50 text-[11px]">
            Made by Jonathan Reed
          </Badge>
        </div>
      </SidebarFooter>
    </PrimitiveSidebar>
  );
}
