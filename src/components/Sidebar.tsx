'use client';

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
  X,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import BrandMark from '@/components/BrandMark';
import { siteConfig, toolGroups, type ToolIcon } from '@/lib/site';
import { cn } from '@/lib/utils';

const iconMap = {
  braces: Braces,
  calendarClock: CalendarClock,
  code: Code2,
  database: Database,
  qr: QrCode,
  searchCode: SearchCode,
  shield: ShieldCheck,
  workflow: Workflow,
} satisfies Record<ToolIcon, typeof Code2>;

const navSections = [
  {
    label: 'Overview',
    items: [
      { title: 'Home', href: '/', icon: Home, description: 'Product overview' },
    ],
  },
  ...toolGroups.map((group) => ({
    label: group.title === 'Developer accelerators' ? 'Tools' : group.title,
    items: group.tools.map((tool) => ({
      title: tool.title,
      href: tool.href,
      icon: iconMap[tool.icon],
    })),
  })),
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
    const normalizedHref = href === '/' ? href : href.replace(/\/$/, '');
    const normalizedPathname = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    if (normalizedHref === '/') return normalizedPathname === '/';
    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
  };

  return (
    <PrimitiveSidebar
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
        <div className="flex items-start justify-between gap-3 group-data-[collapsible=icon]:justify-center">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full"
          >
            <BrandMark className="size-10 group-data-[collapsible=icon]:size-8" />
            <div className="hidden min-w-0 flex-col text-left md:flex group-data-[collapsible=icon]:hidden">
              <span className="truncate text-lg font-semibold tracking-tight">{siteConfig.shortName}</span>
              <span className="truncate text-xs text-muted-foreground">by {siteConfig.provider.name}</span>
            </div>
          </Link>
          <SidebarCloseButton />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <ScrollArea className="h-[calc(100vh-220px)] pr-2 group-data-[collapsible=icon]:pr-0">
          {navSections.map((section) => (
            <SidebarGroup key={section.label} className="pb-2">
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={cn(
                            'min-h-10 text-sm transition-colors duration-200 data-[state=open]:bg-primary/15',
                            'hover:bg-primary/10 hover:text-primary',
                            active && 'bg-primary/20 text-primary shadow-[inset_0_0_0_1px_rgba(196,167,231,0.35)]'
                          )}
                        >
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className="flex items-center gap-3 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="group-data-[collapsible=icon]:sr-only">
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
            <BrandMark className="size-7" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{siteConfig.provider.name}</span>
              <Link
                href={siteConfig.provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center text-xs text-primary hover:underline"
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

function SidebarCloseButton() {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Close sidebar"
      title="Close sidebar"
      onClick={() => {
        if (isMobile) {
          setOpenMobile(false);
          return;
        }
        setOpen(false);
      }}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground transition-colors duration-200',
        'hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'group-data-[collapsible=icon]:hidden'
      )}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
