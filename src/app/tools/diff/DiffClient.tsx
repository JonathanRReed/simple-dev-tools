'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  diffWords,
  diffLines,
  createTwoFilesPatch,
  type ChangeObject,
  type DiffWordsOptionsNonabortable,
  type DiffLinesOptionsNonabortable,
  type CreatePatchOptionsNonabortable,
} from 'diff';
import {
  RotateCcw,
  Sparkles,
  Columns,
  AlignJustify,
  Type,
  FileText,
} from 'lucide-react';

import ToolShell from '@/components/tool/ToolShell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { ResultPanel } from '@/components/ui/result-panel';
import VirtualList from '@/components/tool/VirtualList';
import { FileDrop } from '@/components/FileDrop';
import { useDebounced } from '@/hooks/use-stored-state';
import { downloadFile } from '@/lib/download';
import { readShareParams } from '@/lib/share';
import { cn } from '@/lib/utils';

type ViewMode = 'side' | 'unified';
type DiffLevel = 'word' | 'line';

const SAMPLE_A = `The quick brown fox
jumps over the lazy dog.
Pack my box with
five dozen liquor jugs.`;

const SAMPLE_B = `The quick brown fox
jumps over the lazy cat.
Pack my box with
five dozen beer jugs.`;

function countLines(text: string): number {
  if (text === '') return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function countChars(text: string): number {
  return text.length;
}

function splitLines(text: string): string[] {
  if (text === '') return [''];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function buildWordOptions(
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): DiffWordsOptionsNonabortable {
  return { ignoreWhitespace, ignoreCase } as unknown as DiffWordsOptionsNonabortable;
}

function buildLineOptions(
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): DiffLinesOptionsNonabortable {
  return { ignoreWhitespace, ignoreCase } as unknown as DiffLinesOptionsNonabortable;
}

function buildPatchOptions(
  ignoreWhitespace: boolean,
  ignoreCase: boolean
): CreatePatchOptionsNonabortable {
  return { ignoreWhitespace, ignoreCase } as unknown as CreatePatchOptionsNonabortable;
}

export default function DiffClient() {
  const [original, setOriginal] = useState('');
  const [changed, setChanged] = useState('');
  const [mode, setMode] = useState<ViewMode>('unified');
  const [level, setLevel] = useState<DiffLevel>('word');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  // Debounce the inputs so large pastes don't re-diff on every keystroke.
  const debouncedOriginal = useDebounced(original, 300);
  const debouncedChanged = useDebounced(changed, 300);

  useEffect(() => {
    const params = readShareParams();
    if (!params) return;
    if (typeof params.a === 'string') setOriginal(params.a);
    if (typeof params.b === 'string') setChanged(params.b);
    if (params.m === 'side' || params.m === 'unified') setMode(params.m);
    if (params.l === 'word' || params.l === 'line') setLevel(params.l);
    if (params.iw === '1' || params.iw === '0') setIgnoreWhitespace(params.iw === '1');
    if (params.ic === '1' || params.ic === '0') setIgnoreCase(params.ic === '1');
  }, []);

  const bothEmpty = debouncedOriginal === '' && debouncedChanged === '';
  const hasInput = !bothEmpty;

  // Guard rail: Myers diff is O(ND) and can hang the tab on very large,
  // dissimilar inputs. Refuse beyond this size with a clear message.
  const MAX_DIFF_LENGTH = 500_000;
  const tooLarge =
    debouncedOriginal.length > MAX_DIFF_LENGTH || debouncedChanged.length > MAX_DIFF_LENGTH;

  // Compute only the active granularity. The word diff is the expensive one;
  // line diffs are also needed for the stats line.
  const lineChanges = useMemo<ChangeObject<string>[]>(() => {
    if (bothEmpty || tooLarge) return [];
    return diffLines(
      debouncedOriginal,
      debouncedChanged,
      buildLineOptions(ignoreWhitespace, ignoreCase)
    );
  }, [debouncedOriginal, debouncedChanged, ignoreWhitespace, ignoreCase, bothEmpty, tooLarge]);

  const wordChanges = useMemo<ChangeObject<string>[]>(() => {
    if (level !== 'word' || bothEmpty || tooLarge) return [];
    return diffWords(
      debouncedOriginal,
      debouncedChanged,
      buildWordOptions(ignoreWhitespace, ignoreCase)
    );
  }, [level, debouncedOriginal, debouncedChanged, ignoreWhitespace, ignoreCase, bothEmpty, tooLarge]);

  const changes = level === 'word' ? wordChanges : lineChanges;

  const stats = useMemo(() => {
    const added = lineChanges
      .filter((c) => c.added)
      .reduce((sum, c) => sum + c.count, 0);
    const removed = lineChanges
      .filter((c) => c.removed)
      .reduce((sum, c) => sum + c.count, 0);
    const unchanged = lineChanges
      .filter((c) => !c.added && !c.removed)
      .reduce((sum, c) => sum + c.count, 0);
    return { added, removed, unchanged };
  }, [lineChanges]);

  // Built on demand rather than per keystroke. createTwoFilesPatch runs a third
  // full line diff internally, and its only consumers are the copy and download
  // actions below, so computing it eagerly tripled the diff work for output
  // most sessions never ask for.
  const canPatch = !bothEmpty && !tooLarge;
  const buildPatch = useCallback((): string => {
    if (!canPatch) return '';
    return (
      createTwoFilesPatch(
        'original.txt',
        'changed.txt',
        debouncedOriginal,
        debouncedChanged,
        undefined,
        undefined,
        buildPatchOptions(ignoreWhitespace, ignoreCase)
      ) ?? ''
    );
  }, [canPatch, debouncedOriginal, debouncedChanged, ignoreWhitespace, ignoreCase]);

  const handleSample = () => {
    setOriginal(SAMPLE_A);
    setChanged(SAMPLE_B);
    setMode('unified');
    setLevel('word');
    setIgnoreWhitespace(false);
    setIgnoreCase(false);
  };

  const handleReset = () => {
    setOriginal('');
    setChanged('');
    setMode('unified');
    setLevel('word');
    setIgnoreWhitespace(false);
    setIgnoreCase(false);
  };

  const handleDownload = (ext: 'diff' | 'patch') => {
    const patch = buildPatch();
    if (!patch) return;
    downloadFile(patch, `changes.${ext}`, 'text/x-diff;charset=utf-8');
  };

  const shareParams = () => {
    if (original === '' && changed === '') return null;
    return {
      a: original,
      b: changed,
      m: mode,
      l: level,
      iw: ignoreWhitespace ? '1' : '0',
      ic: ignoreCase ? '1' : '0',
    };
  };

  const toolbar = (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={handleSample}>
        <Sparkles className="size-4" aria-hidden="true" />
        Sample
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleReset}>
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell
      eyebrow="Text Diff"
      toolbar={toolbar}
      shareParams={shareParams}
      shortcuts={[{ keys: '—', description: 'Diffs automatically as you type' }]}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field
            label="Original"
            htmlFor="diff-original"
            action={
              <span className="font-mono text-xs text-muted-foreground">
                {countChars(original)} chars · {countLines(original)} lines
              </span>
            }
          >
            <FileDrop
              onFileText={(text) => setOriginal(text)}
              accept="text/*,.txt,.md,.diff,.patch,.json,.yaml,.yml,.csv,.xml,.css,.js,.ts,.tsx"
              label="Import original"
              className="group"
            >
              <textarea
                id="diff-original"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="Paste the original text…"
                spellCheck={false}
                className="min-h-[220px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
              />
            </FileDrop>
          </Field>

          <Field
            label="Changed"
            htmlFor="diff-changed"
            action={
              <span className="font-mono text-xs text-muted-foreground">
                {countChars(changed)} chars · {countLines(changed)} lines
              </span>
            }
          >
            <FileDrop
              onFileText={(text) => setChanged(text)}
              accept="text/*,.txt,.md,.diff,.patch,.json,.yaml,.yml,.csv,.xml,.css,.js,.ts,.tsx"
              label="Import changed"
              className="group"
            >
              <textarea
                id="diff-changed"
                value={changed}
                onChange={(e) => setChanged(e.target.value)}
                placeholder="Paste the changed text…"
                spellCheck={false}
                className="min-h-[220px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
              />
            </FileDrop>
          </Field>
        </div>

        <div className="flex flex-col gap-4 border-2 border-border bg-card p-3 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-2">
            <span className="brutal-label">View</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="View mode">
              <Button
                type="button"
                size="sm"
                variant={mode === 'side' ? 'default' : 'outline'}
                onClick={() => setMode('side')}
                aria-pressed={mode === 'side'}
              >
                <Columns className="size-4" aria-hidden="true" />
                Side by side
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'unified' ? 'default' : 'outline'}
                onClick={() => setMode('unified')}
                aria-pressed={mode === 'unified'}
              >
                <AlignJustify className="size-4" aria-hidden="true" />
                Unified
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="brutal-label">Granularity</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Diff granularity">
              <Button
                type="button"
                size="sm"
                variant={level === 'word' ? 'default' : 'outline'}
                onClick={() => setLevel('word')}
                aria-pressed={level === 'word'}
              >
                <Type className="size-4" aria-hidden="true" />
                Word
              </Button>
              <Button
                type="button"
                size="sm"
                variant={level === 'line' ? 'default' : 'outline'}
                onClick={() => setLevel('line')}
                aria-pressed={level === 'line'}
              >
                <FileText className="size-4" aria-hidden="true" />
                Line
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="brutal-label">Options</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="diff-ignore-whitespace"
                  checked={ignoreWhitespace}
                  onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                  className="h-4 w-4 rounded-none border-2 border-input bg-background"
                />
                <Label htmlFor="diff-ignore-whitespace">Ignore whitespace</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="diff-ignore-case"
                  checked={ignoreCase}
                  onChange={(e) => setIgnoreCase(e.target.checked)}
                  className="h-4 w-4 rounded-none border-2 border-input bg-background"
                />
                <Label htmlFor="diff-ignore-case">Ignore case</Label>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 border-2 border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          <Badge variant="outline">
            {hasInput ? `${stats.added} added` : '—'}
          </Badge>
          <Badge variant="outline">
            {hasInput ? `${stats.removed} removed` : '—'}
          </Badge>
          <Badge variant="outline">
            {hasInput ? `${stats.unchanged} unchanged` : '—'}
          </Badge>
          <span className="ml-auto">
            {level === 'word' ? 'Word-level' : 'Line-level'} · {mode === 'side' ? 'side by side' : 'unified'}
          </span>
        </div>

        {tooLarge ? (
          <Alert variant="warning">
            Inputs over {Math.round(MAX_DIFF_LENGTH / 1000)} KB are too large for in-browser
            diffing. Trim the texts (or diff the relevant sections) and try again.
          </Alert>
        ) : bothEmpty ? (
          <Alert variant="info">
            Paste text in both columns, or load the sample, to see the diff.
          </Alert>
        ) : (
          <ResultPanel
            title="Diff"
            scroll={mode === 'unified' && level === 'word'}
            bodyClassName={mode === 'unified' && level === 'word' ? undefined : 'p-0'}
            actions={
              <>
                <CopyButton
                  value={buildPatch}
                  label="Copy unified"
                  disabled={!canPatch}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('diff')}
                  disabled={!canPatch}
                >
                  .diff
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('patch')}
                  disabled={!canPatch}
                >
                  .patch
                </Button>
              </>
            }
          >
            {mode === 'unified' ? (
              level === 'line' ? (
                <LineUnified changes={lineChanges} />
              ) : (
                <WordUnified changes={wordChanges} />
              )
            ) : (
              <SideBySide changes={changes} level={level} />
            )}
          </ResultPanel>
        )}
      </div>
    </ToolShell>
  );
}

type UnifiedRow = {
  marker: string;
  colorClass: string;
  line: string;
  label: string;
};

/** Flatten the change chunks into one entry per rendered line. */
function toUnifiedRows(changes: ChangeObject<string>[]): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  for (const c of changes) {
    const marker = c.added ? '+' : c.removed ? '-' : ' ';
    // Semantic color stays in the border/tint; text uses foreground so
    // light themes (dawn/paper) keep WCAG AA contrast.
    const colorClass = c.added
      ? 'border-rp-foam bg-rp-foam/10 text-foreground'
      : c.removed
        ? 'border-rp-love bg-rp-love/10 text-foreground'
        : 'border-border bg-card text-foreground';
    const label = c.added ? 'added: ' : c.removed ? 'removed: ' : '';
    for (const line of splitLines(c.value)) {
      rows.push({ marker, colorClass, line, label });
    }
  }
  return rows;
}

function LineUnified({ changes }: { changes: ChangeObject<string>[] }) {
  const rows = useMemo(() => toUnifiedRows(changes), [changes]);
  return (
    <VirtualList
      items={rows}
      estimateSize={30}
      className="font-mono text-sm"
      ariaLabel="Unified diff"
    >
      {(row) => (
        <div className="pb-1 pr-1">
          <div
            className={cn(
              'grid grid-cols-[1.5rem_1fr] gap-3 border-2 px-2 py-1',
              row.colorClass
            )}
          >
            <span className="select-none text-center font-semibold" aria-hidden="true">
              {row.marker}
            </span>
            <span
              className={cn(
                'whitespace-pre-wrap break-words',
                row.line === '' ? 'text-muted-foreground' : ''
              )}
            >
              <span className="sr-only">{row.label}</span>
              {row.line}
            </span>
          </div>
        </div>
      )}
    </VirtualList>
  );
}

function WordUnified({ changes }: { changes: ChangeObject<string>[] }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
      {changes.map((c, i) => {
        // Semantic color stays in the border/tint; text uses foreground so
        // light themes keep WCAG AA contrast.
        const colorClass = c.added
          ? 'border-2 border-rp-foam bg-rp-foam/20 text-foreground'
          : c.removed
            ? 'border-2 border-rp-love bg-rp-love/20 text-foreground'
            : '';
        return (
          <span
            key={i}
            className={cn('px-0.5', colorClass)}
          >
            <span className="sr-only">{c.added ? 'added: ' : c.removed ? 'removed: ' : ''}</span>
            {c.value}
          </span>
        );
      })}
    </pre>
  );
}

type SideBySideRow =
  | { kind: 'common'; value: string }
  | { kind: 'change'; left?: string; right?: string };

function toSideBySideRows(changes: ChangeObject<string>[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  // Accumulate ALL consecutive removals on the left and additions on the
  // right, flushing only when the diff changes direction or hits common
  // ground. Pairing one-for-one would misalign runs like [removed A,
  // removed B, added C] into "A vs ∅, B vs C" instead of "AB vs C".
  let leftParts: string[] = [];
  let rightParts: string[] = [];

  const flush = () => {
    if (leftParts.length > 0 || rightParts.length > 0) {
      rows.push({
        kind: 'change',
        left: leftParts.length > 0 ? leftParts.join('') : undefined,
        right: rightParts.length > 0 ? rightParts.join('') : undefined,
      });
      leftParts = [];
      rightParts = [];
    }
  };

  for (const c of changes) {
    if (!c.added && !c.removed) {
      flush();
      rows.push({ kind: 'common', value: c.value });
    } else if (c.removed) {
      if (rightParts.length > 0) flush();
      leftParts.push(c.value);
    } else if (c.added) {
      rightParts.push(c.value);
    }
  }
  flush();
  return rows;
}

function SideBySide({
  changes,
  level,
}: {
  changes: ChangeObject<string>[];
  level: DiffLevel;
}) {
  const rows = useMemo(() => toSideBySideRows(changes), [changes]);

  // Each row is a single flex element holding both halves, rather than cells in
  // one tall 2-column grid. Both halves still stretch to the row's height, so
  // the columns stay aligned, and a row is now a unit the windowing can measure
  // and mount on its own.
  return (
    <div className="border-2 border-border bg-card" role="group" aria-label="Side by side diff">
      <div className="flex border-b-2 border-border bg-rp-highlight-low font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="w-1/2 border-r-2 border-border px-2 py-1">Original</div>
        <div className="w-1/2 px-2 py-1">Changed</div>
      </div>
      <VirtualList items={rows} estimateSize={30} ariaLabel="Side by side diff rows">
        {(row) => {
          if (row.kind === 'common') {
            return (
              <div className="flex items-stretch">
                <div className="min-h-[1.5rem] w-1/2 whitespace-pre-wrap break-words border-b-2 border-r-2 border-border px-2 py-1 font-mono text-sm text-foreground">
                  {row.value}
                </div>
                <div className="min-h-[1.5rem] w-1/2 whitespace-pre-wrap break-words border-b-2 border-border px-2 py-1 font-mono text-sm text-foreground">
                  {row.value}
                </div>
              </div>
            );
          }

          const hasLeft = row.left != null;
          const hasRight = row.right != null;

          return (
            <div className="flex items-stretch">
              <div
                className={cn(
                  'min-h-[1.5rem] w-1/2 whitespace-pre-wrap break-words border-b-2 px-2 py-1 font-mono text-sm',
                  hasLeft
                    ? 'border-rp-love border-r-2 bg-rp-love/10 text-foreground'
                    : 'border-r-2 border-border text-muted-foreground'
                )}
              >
                <span className="sr-only">{hasLeft ? 'removed: ' : ''}</span>
                {hasLeft ? row.left : level === 'word' ? '\u00A0' : ''}
              </div>
              <div
                className={cn(
                  'min-h-[1.5rem] w-1/2 whitespace-pre-wrap break-words border-b-2 px-2 py-1 font-mono text-sm',
                  hasRight
                    ? 'border-rp-foam bg-rp-foam/10 text-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                <span className="sr-only">{hasRight ? 'added: ' : ''}</span>
                {hasRight ? row.right : level === 'word' ? '\u00A0' : ''}
              </div>
            </div>
          );
        }}
      </VirtualList>
    </div>
  );
}
