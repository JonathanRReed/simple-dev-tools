'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, Home, Pin, PinOff } from 'lucide-react';

import {
  Sidebar as PrimitiveSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import BrandMark from '@/components/BrandMark';
import { getToolIcon } from '@/components/ToolIcon';
import { useRecentTools } from '@/hooks/use-recent-tools';
import { siteConfig, toolGroups, toolPages, type ToolPageInfo } from '@/lib/site';
import { cn } from '@/lib/utils';

const normalize = (href: string) => (href === '/' ? '/' : href.replace(/\/$/, ''));
const toolByHref = new Map(toolPages.map((t) => [normalize(t.href), t] as const));

const navSections = [
  {
    label: 'Overview',
    items: [{ title: 'Home', href: '/', icon: Home }],
  },
  ...toolGroups.map((group) => ({
    label: group.title === 'Developer accelerators' ? 'Tools' : group.title,
    items: group.tools.map((tool) => ({
      title: tool.title,
      href: tool.href,
      icon: getToolIcon(tool.icon),
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

const activeRowClass = cn(
  'min-h-9 rounded-none font-mono text-xs uppercase tracking-wide transition-colors',
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  'data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-primary-foreground'
);

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { recent, pinned, togglePin, isPinned } = useRecentTools();

  // Close the offcanvas sidebar after navigating on mobile so the destination
  // page isn't left hidden under the overlay.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    const h = normalize(href);
    const p = normalize(pathname);
    if (h === '/') return p === '/';
    return p === h || p.startsWith(`${h}/`);
  };

  const pinnedTools = pinned
    .map((h) => toolByHref.get(h))
    .filter((t): t is ToolPageInfo => Boolean(t));
  const recentTools = recent
    .map((h) => toolByHref.get(h))
    .filter((t): t is ToolPageInfo => Boolean(t) && !pinned.includes(normalize(t!.href)));

  const renderQuickRow = (tool: ToolPageInfo) => {
    const Icon = getToolIcon(tool.icon);
    return (
      <SidebarMenuItem key={tool.href}>
        <SidebarMenuButton asChild isActive={isActive(tool.href)} tooltip={tool.title} className={activeRowClass}>
          <a href={tool.href} aria-current={isActive(tool.href) ? 'page' : undefined} className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:sr-only">{tool.title}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <PrimitiveSidebar collapsible="icon" className="border-r-2 border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b-2 border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
        {/* A full document load reapplies the route-specific CSP. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:gap-0"
        >
          <BrandMark className="size-9 shrink-0 group-data-[collapsible=icon]:size-8" />
          <div className="flex min-w-0 flex-col text-left group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-base font-bold tracking-tight">
              {siteConfig.shortName}
            </span>
            <span className="brutal-label truncate">{siteConfig.provider.name}</span>
          </div>
        </a>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <ScrollArea className="h-full min-h-0 flex-1 pr-2 group-data-[collapsible=icon]:pr-0">
          {pinnedTools.length > 0 ? (
            <SidebarGroup className="pb-1 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="brutal-label">
                <Pin className="mr-1.5 h-3 w-3" /> Pinned
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{pinnedTools.map(renderQuickRow)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {recentTools.length > 0 ? (
            <SidebarGroup className="pb-1 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="brutal-label">
                <Clock className="mr-1.5 h-3 w-3" /> Recent
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{recentTools.map(renderQuickRow)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {navSections.map((section) => (
            <SidebarGroup key={section.label} className="pb-1">
              <SidebarGroupLabel className="brutal-label">{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const pinnable = toolByHref.has(normalize(item.href));
                    const pinnedNow = isPinned(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={activeRowClass}
                        >
                          <a
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className="flex items-center gap-3 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="group-data-[collapsible=icon]:sr-only">{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                        {pinnable ? (
                          <SidebarMenuAction
                            onClick={() => togglePin(item.href)}
                            aria-label={pinnedNow ? `Unpin ${item.title}` : `Pin ${item.title}`}
                            title={pinnedNow ? 'Unpin' : 'Pin'}
                            className="rounded-none group-data-[collapsible=icon]:hidden"
                          >
                            {pinnedNow ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </SidebarMenuAction>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t-2 border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:hidden">
        <a
          href={siteConfig.provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 border-2 border-sidebar-border bg-sidebar-accent/40 p-2.5 transition-colors hover:border-primary"
        >
          <BrandMark className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{siteConfig.provider.name}</span>
            <span className="brutal-label truncate">helloworldfirm.com</span>
          </div>
        </a>
      </SidebarFooter>
    </PrimitiveSidebar>
  );
}
