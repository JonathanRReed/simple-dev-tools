'use client';

import * as React from 'react';

import { ToolTile, hueDotClass } from '@/components/ToolIcon';
import { useCommandMenu } from '@/components/CommandMenu';
import { Switch } from '@/components/ui/switch';
import { useRecentTools } from '@/hooks/use-recent-tools';
import { isTypingTarget, useSingleKeyShortcuts } from '@/hooks/use-single-key-shortcuts';
import { getToolByKey, normalizeHref, toolCatalog, toolGroups } from '@/lib/site';
import { cn } from '@/lib/utils';

/** How long a key stays visibly pressed before the tool opens. */
const PRESS_MS = 130;

/**
 * The home rack: every tool as a keycap, laid out as the left-hand block of a
 * keyboard (1–5, Q–T, A–G). Pressing the matching key on a real keyboard
 * presses the cap on screen and opens the tool. Caps are grouped by family
 * hue, and a lit LED marks tools opened recently.
 */
export default function KeyRack() {
  const { recent, clearRecent, hydrated } = useRecentTools();
  const { open: paletteOpen } = useCommandMenu();
  const [shortcutsOn, setShortcutsOn] = useSingleKeyShortcuts();
  const [pressed, setPressed] = React.useState<string | null>(null);
  const switchId = React.useId();

  const recentSet = React.useMemo(() => new Set(recent), [recent]);

  React.useEffect(() => {
    if (!shortcutsOn) return;
    let timer: number | undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (paletteOpen || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key.length !== 1) return;
      const tool = getToolByKey(event.key);
      if (!tool) return;
      event.preventDefault();
      setPressed(tool.href);
      timer = window.setTimeout(() => window.location.assign(tool.href), PRESS_MS);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [shortcutsOn, paletteOpen]);

  // Coming back with the browser's Back button restores this page from the
  // back/forward cache with the key still held down. Release it.
  React.useEffect(() => {
    const release = () => setPressed(null);
    window.addEventListener('pageshow', release);
    return () => window.removeEventListener('pageshow', release);
  }, []);

  const hasRecent = hydrated && recent.length > 0;

  return (
    <section aria-labelledby="rack-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id="rack-title" className="font-display text-xl text-foreground">
            All {toolCatalog.length} tools
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Tool families">
            {toolGroups.map((group) => (
              <li key={group.title} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2 rounded-full', hueDotClass(group.hue))} />
                {group.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {hasRecent ? (
            <span className="flex items-center gap-2">
              <span className="led" aria-hidden="true" />
              Opened recently
              <button
                type="button"
                onClick={clearRecent}
                className="rounded-sm font-semibold text-foreground underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-primary"
              >
                Clear
              </button>
            </span>
          ) : null}
          <span className="hidden items-center gap-2 [@media(hover:hover)]:flex">
            <label htmlFor={switchId}>Key shortcuts</label>
            <Switch id={switchId} checked={shortcutsOn} onCheckedChange={setShortcutsOn} />
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {toolCatalog.map((tool, index) => {
          const isRecent = hydrated && recentSet.has(normalizeHref(tool.href));
          return (
            <li
              key={tool.href}
              className="motion-safe:animate-[key-seat_420ms_var(--ease-press)_both]"
              style={{ animationDelay: `${index * 22}ms` }}
            >
              <a
                href={tool.href}
                data-pressed={pressed === tool.href ? 'true' : undefined}
                className="key key-tall flex h-full min-h-[8.25rem] flex-col gap-2 rounded-xl p-3 text-left text-secondary-foreground sm:min-h-[9rem] sm:p-3.5"
              >
                <span className="flex items-start justify-between gap-2">
                  <ToolTile icon={tool.icon} hue={tool.hue} className="bg-background" />
                  <span className="flex items-center gap-2">
                    {isRecent ? (
                      <span className="led" role="img" aria-label="Opened recently" />
                    ) : null}
                    {tool.legend && shortcutsOn ? (
                      <span
                        aria-hidden="true"
                        className="readout hidden text-xs font-semibold opacity-70 [@media(hover:hover)]:inline"
                      >
                        {tool.legend}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="text-[0.95rem] font-semibold leading-tight">{tool.title}</span>
                <span className="line-clamp-3 text-xs leading-snug opacity-75">
                  {tool.description}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
