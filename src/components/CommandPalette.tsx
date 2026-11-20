"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Keyboard, LayoutGrid } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import ThemeSwatch from "@/components/ThemeSwatch";
import { ToolTile } from "@/components/ToolIcon";
import { useQuickTools } from "@/hooks/use-recent-tools";
import { useSingleKeyShortcuts } from "@/hooks/use-single-key-shortcuts";
import { detect } from "@/lib/detect";
import { handoffUrl } from "@/lib/handoff";
import { appThemes } from "@/lib/themes";
import { getToolPage, toolCatalog, toolGroups, trustPages, type ToolMeta } from "@/lib/site";

// Keyword aliases so typing "data", "feedback", etc. finds the right page.
const PAGE_KEYWORDS: Record<string, string[]> = {
  "/about/": ["team", "author", "who", "maintainer"],
  "/contact/": ["email", "support", "feedback", "bug"],
  "/privacy/": ["data", "local", "tracking", "cookies"],
};

function ToolItem({ tool, prefix, onOpen }: { tool: ToolMeta; prefix?: string; onOpen: (href: string) => void }) {
  return (
    <CommandItem
      value={prefix ? `${prefix} ${tool.title}` : tool.title}
      keywords={prefix ? undefined : [...tool.tags, tool.family]}
      onSelect={() => onOpen(tool.href)}
    >
      <ToolTile icon={tool.icon} hue={tool.hue} className="size-7 rounded-md" />
      <span>{tool.title}</span>
    </CommandItem>
  );
}

export interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * The ⌘K dialog itself: search over tools, pages and themes, plus the same
 * "paste anything" detection as the home slot.
 *
 * It lives in its own module so the search library, the dialog and the
 * detector load after the page is interactive instead of in every page's
 * first bundle. CommandMenuProvider owns the open state and the shortcuts.
 */
export default function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  // The untouched clipboard text when something was pasted. A single-line
  // input flattens newlines, which would break YAML, CSV and Markdown.
  const [pasted, setPasted] = React.useState<string | null>(null);
  const { setTheme } = useTheme();
  const { pinnedTools, recentTools } = useQuickTools();
  const [shortcutsOn, setShortcutsOn] = useSingleKeyShortcuts();

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      window.location.assign(href);
    },
    [setOpen]
  );

  // Reset the query each time the palette opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setPasted(null);
    }
  }, [open]);

  // Content pasted or typed into the palette gets the same treatment as the
  // home slot: say what it is and offer the tool that opens it.
  const content = pasted ?? query;
  const detections = React.useMemo(() => {
    if (content.trim().length < 3) return [];
    return detect(content).matches.flatMap((match) => {
      const tool = getToolPage(match.href);
      return tool ? [{ match, tool }] : [];
    });
  }, [content]);

  const showQuickGroups = query.trim() === "";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tools, or paste something to open it"
        aria-label="Search tools, pages, and themes"
        value={query}
        onValueChange={(next) => {
          setQuery(next);
          setPasted(null);
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          if (!text.includes("\n")) return;
          event.preventDefault();
          setPasted(text);
          setQuery(text.replace(/\s+/g, " ").trim().slice(0, 240));
        }}
      />
      <CommandList>
        {detections.length === 0 ? <CommandEmpty>Nothing matches that.</CommandEmpty> : null}

        {detections.length > 0 ? (
          <CommandGroup heading="Open what you pasted" forceMount>
            {detections.map(({ match, tool }) => (
              <CommandItem
                key={match.kind}
                value={`open pasted ${match.kind}`}
                forceMount
                onSelect={() => go(handoffUrl(match.href, match.params))}
              >
                <ToolTile icon={tool.icon} hue={tool.hue} className="size-7 rounded-md" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {match.what}
                    {match.detail ? (
                      <span className="readout ml-2 text-xs text-muted-foreground">{match.detail}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">Open in {tool.title}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {showQuickGroups && pinnedTools.length > 0 ? (
          <CommandGroup heading="Pinned">
            {pinnedTools.map((tool) => (
              <ToolItem key={`pin-${tool.href}`} tool={tool} prefix="pinned" onOpen={go} />
            ))}
          </CommandGroup>
        ) : null}

        {showQuickGroups && recentTools.length > 0 ? (
          <CommandGroup heading="Recent">
            {recentTools.map((tool) => (
              <ToolItem key={`recent-${tool.href}`} tool={tool} prefix="recent" onOpen={go} />
            ))}
          </CommandGroup>
        ) : null}

        {toolGroups.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {toolCatalog
              .filter((tool) => tool.family === group.title)
              .map((tool) => (
                <ToolItem key={tool.href} tool={tool} onOpen={go} />
              ))}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Pages">
          <CommandItem value="All tools home" keywords={["start", "catalog", "overview"]} onSelect={() => go("/")}>
            <LayoutGrid className="mx-1.5" />
            <span>All tools</span>
          </CommandItem>
          {trustPages.map((page) => (
            <CommandItem
              key={page.href}
              value={page.title}
              keywords={PAGE_KEYWORDS[page.href] ?? []}
              onSelect={() => go(page.href)}
            >
              <span className="pl-9">{page.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          {appThemes.map((theme) => (
            <CommandItem
              key={theme.id}
              value={`theme ${theme.label}`}
              onSelect={() => {
                setTheme(theme.id);
                setOpen(false);
              }}
            >
              <ThemeSwatch colors={theme.swatches} />
              <span>{theme.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem
            value="single key shortcuts keyboard"
            keywords={["accessibility", "hotkeys", "disable", "enable"]}
            onSelect={() => setShortcutsOn(!shortcutsOn)}
          >
            <Keyboard className="mx-1.5" />
            <span>{shortcutsOn ? "Turn off single-key shortcuts" : "Turn on single-key shortcuts"}</span>
            <CommandShortcut>{shortcutsOn ? "On" : "Off"}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <kbd>↑</kbd>
          <kbd>↓</kbd> Move
        </span>
        <span className="flex items-center gap-1.5">
          <kbd>↵</kbd> Open
        </span>
        {shortcutsOn ? (
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd>[</kbd>
            <kbd>]</kbd> Previous and next tool
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1.5">
          <kbd>esc</kbd> Close
        </span>
      </div>
    </CommandDialog>
  );
}
