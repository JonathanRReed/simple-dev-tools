'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Clock, LayoutGrid, Pin, PinOff } from 'lucide-react';

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
import { getToolIcon, hueTextClass } from '@/components/ToolIcon';
import { useQuickTools, useRecentTools } from '@/hooks/use-recent-tools';
import { getToolPage, normalizeHref, siteConfig, toolGroups, type ToolMeta } from '@/lib/site';
import { cn } from '@/lib/utils';

export function AppSidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      {children}
      <SidebarRail />
    </SidebarProvider>
  );
}

const rowClass = cn(
  'h-9 rounded-md text-sm font-medium text-sidebar-foreground/75 transition-colors',
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  'data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground'
);

const groupLabelClass = 'ui-label h-7 px-2 text-xs';

/** The lit bar that marks the current page, like an indicator beside a switch. */
function ActiveBar() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary group-data-[collapsible=icon]:hidden"
    />
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { togglePin, isPinned } = useRecentTools();
  const { pinnedTools, recentTools } = useQuickTools();

  // Close the offcanvas sidebar after navigating on mobile so the destination
  // page isn't left hidden under the overlay.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    const h = normalizeHref(href);
    const p = normalizeHref(pathname);
    if (h === '/') return p === '/';
    return p === h || p.startsWith(`${h}/`);
  };

  const renderRow = (tool: ToolMeta, { pinnable }: { pinnable: boolean }) => {
    const Icon = getToolIcon(tool.icon);
    const active = isActive(tool.href);
    const pinnedNow = isPinned(tool.href);
    return (
      <SidebarMenuItem key={tool.href}>
        {active ? <ActiveBar /> : null}
        <SidebarMenuButton asChild isActive={active} tooltip={tool.title} className={rowClass}>
          <a
            href={tool.href}
            aria-current={active ? 'page' : undefined}
            className="flex items-center gap-2.5 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
          >
            <Icon className={cn('size-4', active && hueTextClass(tool.hue))} />
            <span className="group-data-[collapsible=icon]:sr-only">{tool.title}</span>
          </a>
        </SidebarMenuButton>
        {pinnable ? (
          <SidebarMenuAction
            onClick={() => togglePin(tool.href)}
            aria-label={pinnedNow ? `Unpin ${tool.title}` : `Pin ${tool.title}`}
            title={pinnedNow ? 'Unpin' : 'Pin'}
            className={cn(
              'top-1.5 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden',
              !pinnedNow &&
                'opacity-0 focus-visible:opacity-100 group-hover/menu-item:opacity-100 max-md:opacity-100'
            )}
          >
            {pinnedNow ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </SidebarMenuAction>
        ) : null}
      </SidebarMenuItem>
    );
  };

  const homeActive = isActive('/');

  return (
    <PrimitiveSidebar collapsible="icon" className="border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-0">
        {/* A full document load reapplies the route-specific CSP. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:gap-0"
        >
          <BrandMark className="size-7" />
          <span className="truncate font-display text-[0.95rem] group-data-[collapsible=icon]:hidden">
            {siteConfig.shortName}
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <ScrollArea className="h-full min-h-0 flex-1 pr-1 group-data-[collapsible=icon]:pr-0">
          <SidebarGroup className="pb-0 pt-3">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {homeActive ? <ActiveBar /> : null}
                  <SidebarMenuButton asChild isActive={homeActive} tooltip="All tools" className={rowClass}>
                    {/* A full document load reapplies the route-specific CSP. */}
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                      href="/"
                      aria-current={homeActive ? 'page' : undefined}
                      className="flex items-center gap-2.5 group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <LayoutGrid className="size-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">All tools</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {pinnedTools.length > 0 ? (
            <SidebarGroup className="pb-0 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className={groupLabelClass}>
                <Pin className="mr-1.5 !size-3" aria-hidden="true" /> Pinned
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{pinnedTools.map((tool) => renderRow(tool, { pinnable: false }))}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {recentTools.length > 0 ? (
            <SidebarGroup className="pb-0 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className={groupLabelClass}>
                <Clock className="mr-1.5 !size-3" aria-hidden="true" /> Recent
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{recentTools.map((tool) => renderRow(tool, { pinnable: false }))}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}

          {toolGroups.map((group) => (
            <SidebarGroup key={group.title} className="pb-0 group-data-[collapsible=icon]:py-1">
              <SidebarGroupLabel className={groupLabelClass}>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.tools.map((entry) => {
                    const tool = getToolPage(entry.href);
                    return tool ? renderRow(tool, { pinnable: true }) : null;
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <div className="h-3" />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:hidden">
        <a
          href={siteConfig.provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/by inline-flex items-center gap-1 rounded-sm text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
        >
          <span>
            Built by <span className="font-semibold">{siteConfig.provider.name}</span>
          </span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </SidebarFooter>
    </PrimitiveSidebar>
  );
}
