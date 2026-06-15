"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { useCommandMenu } from "@/components/CommandMenu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { siteConfig, toolPages, trustPages } from "@/lib/site";

const normalize = (href: string) => (href === "/" ? "/" : href.replace(/\/$/, ""));

function useActiveTitle(): string | null {
  const pathname = usePathname();
  if (!pathname) return null;
  const key = normalize(pathname);
  if (key === "/") return null;
  const all = [...toolPages, ...trustPages];
  const match = all.find((p) => key === normalize(p.href) || key.startsWith(`${normalize(p.href)}/`));
  return match?.title ?? null;
}

export default function AppHeader() {
  const activeTitle = useActiveTitle();
  const { setOpen } = useCommandMenu();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b-2 border-border bg-background px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="size-9 shrink-0 rounded-none border-2 border-border" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
          <span className="shrink-0 uppercase tracking-wider text-muted-foreground">
            {siteConfig.shortName}
          </span>
          {activeTitle ? (
            <>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              <span className="truncate font-semibold text-foreground">{activeTitle}</span>
            </>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex h-9 items-center gap-2 border-2 border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Open command menu"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden border border-border bg-background px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
