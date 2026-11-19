'use client';

import * as React from 'react';
import { CornerDownLeft, X } from 'lucide-react';

import TrustBadge from '@/components/TrustBadge';
import { ToolTile } from '@/components/ToolIcon';
import { useDebounced } from '@/hooks/use-stored-state';
import { isTypingTarget } from '@/hooks/use-single-key-shortcuts';
import { detect, type Detection } from '@/lib/detect';
import { handoffUrl } from '@/lib/handoff';
import { getToolPage, toolCatalog, type ToolMeta } from '@/lib/site';
import { cn } from '@/lib/utils';

/** Small, obviously-fake samples so the slot can be tried without a clipboard. */
const SAMPLES = [
  {
    label: 'a token',
    value:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMn0.3Gm0nX1d7m0x0Jv1qg6vWk7mJYQ9q2o3s9t0oXnq5cE',
  },
  { label: 'a timestamp', value: '1700000000' },
  { label: 'a cron line', value: '*/15 9-17 * * 1-5' },
  { label: 'a color', value: '#e1bb62' },
  { label: 'some JSON', value: '{ "team": "Platform", "active": true, "members": 3 }' },
] as const;

type Row = {
  key: string;
  tool: ToolMeta;
  title: string;
  detail?: string;
  swatch?: string;
  /** Destination, computed on activation so a handoff is only queued when used. */
  open: () => string;
};

function rowsFromDetections(items: Detection[]): Row[] {
  const rows: Row[] = [];
  for (const item of items) {
    const tool = getToolPage(item.href);
    if (!tool) continue;
    rows.push({
      key: item.kind,
      tool,
      title: item.what,
      detail: item.detail,
      swatch: item.swatch,
      open: () => handoffUrl(item.href, item.params),
    });
  }
  return rows;
}

/** Match a short, single-line query against tool names, families and tags. */
function searchTools(query: string): ToolMeta[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || q.length > 40 || q.includes('\n')) return [];
  return toolCatalog
    .filter(
      (tool) =>
        tool.title.toLowerCase().includes(q) ||
        tool.family.toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(q))
    )
    .slice(0, 4);
}

/** Everything the slot can offer for `text`: detections, then tools, then general uses. */
function suggest(text: string): { rows: Row[]; isFallback: boolean } {
  const found = detect(text);
  if (found.matches.length > 0) return { rows: rowsFromDetections(found.matches), isFallback: false };
  const tools = searchTools(text);
  if (tools.length > 0) {
    return {
      rows: tools.map<Row>((tool) => ({
        key: `tool-${tool.href}`,
        tool,
        title: tool.title,
        detail: tool.family,
        open: () => tool.href,
      })),
      isFallback: false,
    };
  }
  return { rows: rowsFromDetections(found.fallbacks), isFallback: found.fallbacks.length > 0 };
}

/**
 * The slot at the top of the home page. Paste or type anything: it works out
 * what the content is (see lib/detect) and offers the tool that opens it,
 * with the content already loaded. Typing a tool's name finds the tool.
 *
 * Detection is local and synchronous. Opening a result hands the content over
 * through sessionStorage, so it never appears in a URL.
 */
export default function PasteSlot() {
  const [value, setValue] = React.useState('');
  const debounced = useDebounced(value, 120);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const resultsId = React.useId();

  // The list on screen follows a debounced copy so typing stays cheap.
  const { rows, isFallback } = React.useMemo(() => suggest(debounced), [debounced]);

  const settled = debounced === value;
  const hasValue = value.trim() !== '';

  const openRow = React.useCallback((row: Row) => {
    window.location.assign(row.open());
  }, []);

  // ⌘V anywhere on the page lands in the slot, so there is no need to aim.
  React.useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      setValue(text);
      inputRef.current?.focus();
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const lineCount = Math.min(8, Math.max(2, value.split('\n').length));

  return (
    <section className="panel" aria-labelledby="paste-slot-title">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <h2 id="paste-slot-title" className="text-sm font-semibold text-foreground">
          Paste anything
        </h2>
        <TrustBadge />
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                // Enter can arrive before the debounce settles ("regex" then
                // Enter, typed quickly), so answer for what is in the box now.
                const current = settled ? rows : suggest(value).rows;
                if (current.length > 0) {
                  event.preventDefault();
                  openRow(current[0]);
                }
              } else if (event.key === 'Escape' && hasValue) {
                event.preventDefault();
                setValue('');
              }
            }}
            rows={lineCount}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Paste content or type a tool name"
            aria-controls={resultsId}
            placeholder="A token, some JSON, a timestamp, a cron line, a color, a URL…"
            className="block w-full resize-none px-3.5 py-3 pr-10 text-sm leading-relaxed placeholder:font-sans placeholder:tracking-normal"
          />
          {hasValue ? (
            <button
              type="button"
              onClick={() => {
                setValue('');
                inputRef.current?.focus();
              }}
              aria-label="Clear"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div id={resultsId} role="group" aria-label="Suggestions" aria-live="polite" className="min-h-[4.25rem]">
          {!hasValue ? (
            <div className="flex flex-col gap-2.5">
              <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
                It works out what you pasted and opens the right tool with it loaded. Typing a
                tool&rsquo;s name works too.
              </p>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-muted-foreground">
                <span>Try</span>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setValue(sample.value);
                      inputRef.current?.focus();
                    }}
                    className="rounded-md border border-border px-2 py-0.5 font-medium text-foreground transition-colors hover:border-[var(--line-strong)] hover:bg-secondary"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {settled ? 'Nothing matches that yet. Keep typing, or paste the whole thing.' : ' '}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {isFallback ? (
                <p className="text-sm text-muted-foreground">
                  That reads as plain text. You can still use it:
                </p>
              ) : null}
              <ul className="flex flex-col gap-1.5">
                {rows.map((row, index) => (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => openRow(row)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors',
                        index === 0
                          ? 'border-[var(--line-strong)] bg-secondary/60 hover:bg-secondary'
                          : 'border-transparent hover:bg-secondary/60'
                      )}
                    >
                      <ToolTile icon={row.tool.icon} hue={row.tool.hue} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-sm font-semibold text-foreground">{row.title}</span>
                          {row.swatch ? (
                            <span
                              aria-hidden="true"
                              className="size-3.5 shrink-0 rounded-sm border border-[var(--line-strong)]"
                              style={{ backgroundColor: row.swatch }}
                            />
                          ) : null}
                          {row.detail ? (
                            <span className="readout truncate text-xs text-muted-foreground">{row.detail}</span>
                          ) : null}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {row.title === row.tool.title ? row.tool.description : `Open in ${row.tool.title}`}
                        </span>
                      </span>
                      {index === 0 ? (
                        <kbd className="hidden shrink-0 sm:inline-flex sm:items-center" aria-label="Press Enter">
                          <CornerDownLeft className="my-1 size-3" aria-hidden="true" />
                        </kbd>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
