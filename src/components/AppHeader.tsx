"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { useCommandMenu } from "@/components/CommandMenu";
import { useModKey } from "@/hooks/use-mod-key";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { normalizeHref, toolPages, trustPages } from "@/lib/site";

function useActiveTitle(): string | null {
  const pathname = usePathname();
  if (!pathname) return null;
  const key = normalizeHref(pathname);
  if (key === "/") return null;
  const all = [...toolPages, ...trustPages];
  const match = all.find((p) => key === normalizeHref(p.href) || key.startsWith(`${normalizeHref(p.href)}/`));
  return match?.title ?? null;
}

export default function AppHeader() {
  const activeTitle = useActiveTitle();
  const { setOpen } = useCommandMenu();
  const mod = useModKey();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-bench/85 px-3 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="size-9 shrink-0" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          {/* A full document load reapplies the route-specific CSP. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="shrink-0 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            All tools
          </a>
          {activeTitle ? (
            <>
              <span className="text-[var(--line-strong)]" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-foreground" aria-current="page">
                {activeTitle}
              </span>
            </>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="well inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:w-56"
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden flex-1 text-left sm:inline">Search or paste</span>
          <kbd className="hidden sm:inline-block">{mod === "⌘" ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
