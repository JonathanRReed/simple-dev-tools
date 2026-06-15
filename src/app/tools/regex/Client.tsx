"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const FLAG_LIST = [
  { key: "g", label: "g" },
  { key: "i", label: "i" },
  { key: "m", label: "m" },
  { key: "s", label: "s" },
  { key: "u", label: "u" },
  { key: "y", label: "y" },
] as const;

type FlagsState = Record<(typeof FLAG_LIST)[number]["key"], boolean>;

const DEFAULT_TEXT = `The quick brown fox jumps over the lazy dog.\nTHE QUICK BROWN FOX. fox-123.`;
const DEFAULT_PATTERN = "fox";

const SAMPLES: { label: string; pattern: string; flags?: string; test: string; replace?: string }[] = [
  {
    label: "Email",
    pattern: String.raw`[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}`,
    flags: "gi",
    test: "Contact us: hello@example.com or support@foo.co.uk",
  },
  {
    label: "UUID v4",
    pattern: String.raw`[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}`,
    flags: "gi",
    test: "ids: 123e4567-e89b-12d3-a456-426614174000 abcdef00-0000-4000-8000-000000000000",
  },
  {
    label: "URL (basic)",
    pattern: String.raw`https?:\/\/[\w.-]+(?:\:[0-9]+)?(?:\/[\w\-.~:/?#[\]@!$&'()*+,;=%]*)?`,
    flags: "gi",
    test: "See https://example.com and http://localhost:3000/test?q=1",
  },
  {
    label: "IPv4",
    pattern: String.raw`\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b`,
    flags: "g",
    test: "Valid: 192.168.0.1, 8.8.8.8; Invalid: 999.1.1.1",
  },
  {
    label: "Hex Color",
    pattern: String.raw`#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b`,
    flags: "g",
    test: "Colors: #fff, #1e293b, #GGG",
  },
  {
    label: "Date (named groups)",
    pattern: String.raw`(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})`,
    flags: "g",
    test: "Releases: 2024-01-15 and 2025-12-31.",
    replace: "$<day>/$<month>/$<year>",
  },
];

function buildFlags(state: FlagsState): string {
  return FLAG_LIST.map(f => (state[f.key] ? f.key : "")).join("");
}

export default function RegexLab() {
  return (
    <React.Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <RegexLabInner />
    </React.Suspense>
  );
}

function safeRegExp(pattern: string, flags: string): { re: RegExp | null; error: string | null } {
  try {
    return { re: new RegExp(pattern, flags), error: null };
  } catch (e: any) {
    return { re: null, error: e?.message || "Invalid pattern" };
  }
}

function parseFlags(str: string): FlagsState {
  const base: FlagsState = { g: false, i: false, m: false, s: false, u: false, y: false };
  (str ?? "").split("").forEach((k) => {
    if ((base as any)[k] !== undefined) (base as any)[k] = true;
  });
  return base;
}

interface MatchInfo {
  match: string;
  index: number;
  length: number;
  groups: (string | undefined)[];
  named: Record<string, string | undefined>;
}

interface Segment {
  text: string;
  matched: boolean;
}

function RegexLabInner() {
  const [pattern, setPattern] = useState<string>(DEFAULT_PATTERN);
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [replacement, setReplacement] = useState<string>("$&");
  const [flags, setFlags] = useState<FlagsState>({ g: true, i: false, m: false, s: false, u: false, y: false });
  const [sampleValue, setSampleValue] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  const getSP = useCallback((): URLSearchParams => {
    // Fallback in case typings mark searchParams as possibly null
    // In client components it should be available, but guard defensively
    if (searchParams) return new URLSearchParams(searchParams.toString());
    if (typeof window !== "undefined") return new URLSearchParams(window.location.search);
    return new URLSearchParams();
  }, [searchParams]);

  const flagsStr = useMemo(() => buildFlags(flags), [flags]);
  const { re, error } = useMemo(() => safeRegExp(pattern, flagsStr), [pattern, flagsStr]);

  // Effective regex literal /pattern/flags (escape any unescaped forward slashes for display)
  const regexLiteral = useMemo(
    () => `/${pattern.replace(/\//g, "\\/")}/${flagsStr}`,
    [pattern, flagsStr]
  );

  // Hydrate state from query params (?p=pattern&f=flags)
  useEffect(() => {
    const sp = getSP();
    const qp = sp.get("p");
    const qf = sp.get("f");
    if (qp !== null && qp !== pattern) setPattern(qp);
    if (qf !== null) {
      const nextFlags = parseFlags(qf);
      const same = buildFlags(nextFlags) === buildFlags(flags);
      if (!same) setFlags(nextFlags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSP]);

  // Debounce URL updates when pattern/flags change
  useEffect(() => {
    const sp = getSP();
    const currentP = sp.get("p") || "";
    const currentF = sp.get("f") || "";
    const needUpdate = currentP !== pattern || currentF !== flagsStr;
    const t = setTimeout(() => {
      if (!needUpdate) return;
      const params = getSP();
      if (pattern) params.set("p", pattern); else params.delete("p");
      if (flagsStr) params.set("f", flagsStr); else params.delete("f");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, flagsStr, getSP]);

  const getShareUrl = useCallback(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );

  const matches = useMemo<MatchInfo[]>(() => {
    if (!re) return [];
    const list: MatchInfo[] = [];
    const pushMatch = (m: RegExpExecArray) => {
      list.push({
        match: m[0],
        index: m.index,
        length: m[0].length,
        groups: Array.from(m).slice(1),
        named: m.groups ? { ...m.groups } : {},
      });
    };
    if (re.global || re.sticky) {
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, re.flags); // copy to avoid lastIndex side-effects
      while ((m = r.exec(text)) !== null) {
        pushMatch(m);
        if (m[0] === "") r.lastIndex++; // avoid infinite loops on zero-length matches
      }
    } else {
      const m = re.exec(text);
      if (m) pushMatch(m);
    }
    return list;
  }, [re, text]);

  // Build highlight segments from match index + length.
  const segments = useMemo<Segment[]>(() => {
    if (!re || matches.length === 0) return [{ text, matched: false }];
    const segs: Segment[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) {
        segs.push({ text: text.slice(cursor, m.index), matched: false });
      }
      // For zero-length matches there is nothing to highlight; skip the span.
      if (m.length > 0) {
        segs.push({ text: text.slice(m.index, m.index + m.length), matched: true });
      }
      cursor = Math.max(cursor, m.index + m.length);
    }
    if (cursor < text.length) {
      segs.push({ text: text.slice(cursor), matched: false });
    }
    return segs;
  }, [re, matches, text]);

  // Distinguish invalid regex from a genuinely empty replacement result.
  const replaced = useMemo<{ value: string | null; error: string | null }>(() => {
    if (!re) return { value: null, error };
    try {
      return { value: text.replace(re, replacement), error: null };
    } catch (e: any) {
      return { value: null, error: e?.message || "Replacement failed" };
    }
  }, [re, text, replacement, error]);

  // Plain-text export of the matches list for copying.
  const matchesText = useMemo(() => {
    return matches
      .map((m) => {
        const parts: string[] = [`[${m.index}] ${m.match}`];
        m.groups.forEach((g, j) => parts.push(`  $${j + 1}: ${g ?? "<empty>"}`));
        Object.entries(m.named).forEach(([k, v]) => parts.push(`  $<${k}>: ${v ?? "<empty>"}`));
        return parts.join("\n");
      })
      .join("\n");
  }, [matches]);

  const applySample = (s: (typeof SAMPLES)[number]) => {
    setPattern(s.pattern);
    setText(s.test);
    setReplacement(s.replace ?? "$&");
    setFlags(parseFlags(s.flags ?? ""));
  };

  const handleReset = () => {
    setPattern(DEFAULT_PATTERN);
    setText(DEFAULT_TEXT);
    setReplacement("$&");
    setFlags({ g: true, i: false, m: false, s: false, u: false, y: false });
    setSampleValue("");
  };

  const matchCountLabel = `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;

  const toolbar = (
    <>
      <select
        aria-label="Load sample pattern"
        value={sampleValue}
        onChange={(e) => {
          const s = SAMPLES.find((x) => x.label === e.target.value);
          if (s) applySample(s);
          // Reset so the same sample can be re-selected.
          setSampleValue("");
        }}
        className="h-8 rounded-none border-2 border-input bg-background px-2 font-mono text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
      >
        <option value="" disabled>
          Load sample…
        </option>
        {SAMPLES.map((s) => (
          <option key={s.label} value={s.label}>
            {s.label}
          </option>
        ))}
      </select>
      <CopyButton value={getShareUrl} label="Copy Link" />
      <Button type="button" variant="outline" size="sm" onClick={handleReset}>
        <RotateCcw className="size-4" aria-hidden="true" />
        <span>Reset</span>
      </Button>
    </>
  );

  return (
    <ToolShell eyebrow="Regex Lab" toolbar={toolbar} contentClassName="flex flex-col gap-6">
      {/* Pattern + flags */}
      <div className="flex flex-col gap-3">
        <Field
          label="Pattern"
          htmlFor="regex-pattern"
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {FLAG_LIST.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-1 border-2 border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground has-[:checked]:border-primary has-[:checked]:text-foreground"
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--rp-iris)]"
                    checked={flags[key]}
                    onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          }
        >
          <Input
            id="regex-pattern"
            className="font-mono"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern (without / /)"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <span className="brutal-label">Effective</span>
          <code className="border-2 border-border bg-background px-2 py-0.5 font-mono text-sm text-foreground">
            {regexLiteral}
          </code>
          {flagsStr ? (
            <span className="flex flex-wrap items-center gap-1">
              {flagsStr.split("").map((f) => (
                <Badge key={f} variant="outline">
                  {f}
                </Badge>
              ))}
            </span>
          ) : null}
          <Badge variant={matches.length ? "default" : "outline"}>{matchCountLabel}</Badge>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Test String" htmlFor="regex-test">
          <textarea
            id="regex-test"
            className="flex min-h-[160px] w-full rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </Field>
        <Field
          label="Replacement"
          htmlFor="regex-replacement"
          hint="Use $&, $1, $<name> etc."
        >
          <Input
            id="regex-replacement"
            className="font-mono"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="$&, $1, $<name> etc."
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>
      </div>

      {/* Outputs */}
      <Tabs defaultValue="highlight">
        <TabsList>
          <TabsTrigger value="highlight">Highlight</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="replace">Replace</TabsTrigger>
        </TabsList>

        <TabsContent value="highlight">
          <ResultPanel title="Highlighted Test String" scroll>
            {!re && error ? (
              <Alert variant="error">{error}</Alert>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">
                {segments.map((seg, i) =>
                  seg.matched ? (
                    <span
                      key={i}
                      className="rounded-none bg-rp-gold/30 text-foreground ring-1 ring-rp-gold/60"
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </pre>
            )}
          </ResultPanel>
        </TabsContent>

        <TabsContent value="matches">
          <ResultPanel
            title={matchCountLabel}
            copyValue={matchesText}
            scroll
          >
            {!re && error ? (
              <Alert variant="error">{error}</Alert>
            ) : matches.length === 0 ? (
              <p className="font-mono text-sm text-muted-foreground">No matches.</p>
            ) : (
              <table className="w-full font-mono text-sm text-foreground">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-2 py-1 text-left">
                      <Label>Index</Label>
                    </th>
                    <th className="px-2 py-1 text-left">
                      <Label>Match</Label>
                    </th>
                    <th className="px-2 py-1 text-left">
                      <Label>Groups</Label>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => {
                    const hasGroups = m.groups.length > 0 || Object.keys(m.named).length > 0;
                    return (
                      <tr key={i} className="border-b border-border/50 align-top">
                        <td className="px-2 py-1">{m.index}</td>
                        <td className="px-2 py-1 whitespace-pre-wrap break-words">{m.match}</td>
                        <td className="px-2 py-1">
                          {hasGroups ? (
                            <ul className="space-y-0.5">
                              {m.groups.map((g, j) => (
                                <li key={`n-${j}`} className="break-words">
                                  <span className="text-muted-foreground">${j + 1}:</span>{" "}
                                  {g ?? <span className="text-muted-foreground">&lt;empty&gt;</span>}
                                </li>
                              ))}
                              {Object.entries(m.named).map(([name, val]) => (
                                <li key={`name-${name}`} className="break-words">
                                  <span className="text-rp-iris">$&lt;{name}&gt;:</span>{" "}
                                  {val ?? <span className="text-muted-foreground">&lt;empty&gt;</span>}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">(none)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ResultPanel>
        </TabsContent>

        <TabsContent value="replace">
          <ResultPanel
            title="Replace Preview"
            actions={
              <span className="brutal-label hidden sm:inline">{regexLiteral}</span>
            }
            copyValue={replaced.value ?? ""}
            scroll
          >
            {replaced.error ? (
              <Alert variant="error">{replaced.error}</Alert>
            ) : replaced.value === "" ? (
              <p className="font-mono text-sm italic text-muted-foreground">(empty result)</p>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
                {replaced.value}
              </pre>
            )}
          </ResultPanel>
        </TabsContent>
      </Tabs>

      {/* Cheat sheet */}
      <div className="border-2 border-border bg-card p-4">
        <details>
          <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            Regex Cheat Sheet
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-foreground md:grid-cols-2">
            <div>
              <div className="brutal-label mb-1">Basics</div>
              <ul className="list-disc space-y-0.5 pl-5">
                <li><code>.</code> any char (except newline unless <code>s</code>)</li>
                <li><code>^</code> start, <code>$</code> end</li>
                <li><code>\d</code> digit, <code>\w</code> word, <code>\s</code> space</li>
                <li><code>\b</code> word boundary</li>
              </ul>
            </div>
            <div>
              <div className="brutal-label mb-1">Quantifiers</div>
              <ul className="list-disc space-y-0.5 pl-5">
                <li><code>*</code> 0+, <code>+</code> 1+, <code>?</code> 0/1, <code>{`{n}`}</code>, <code>{`{n,}`}</code>, <code>{`{n,m}`}</code></li>
                <li>Lazy: append <code>?</code> e.g. <code>.*?</code></li>
              </ul>
            </div>
            <div>
              <div className="brutal-label mb-1">Groups &amp; Alternation</div>
              <ul className="list-disc space-y-0.5 pl-5">
                <li><code>(...)</code> capture, <code>(?:...)</code> non-capture</li>
                <li><code>(?&lt;name&gt;...)</code> named capture, backref <code>\k&lt;name&gt;</code></li>
                <li><code>a|b</code> alternation</li>
              </ul>
            </div>
            <div>
              <div className="brutal-label mb-1">Flags</div>
              <ul className="list-disc space-y-0.5 pl-5">
                <li><code>g</code> global, <code>i</code> ignoreCase, <code>m</code> multiline</li>
                <li><code>s</code> dotAll, <code>u</code> unicode, <code>y</code> sticky</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          Useful links:{" "}
          <a className="text-rp-iris hover:text-rp-rose" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp" target="_blank" rel="noreferrer noopener">MDN RegExp</a>{" - "}
          <a className="text-rp-iris hover:text-rp-rose" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace" target="_blank" rel="noreferrer noopener">MDN String.replace</a>{" - "}
          <a className="text-rp-iris hover:text-rp-rose" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions" target="_blank" rel="noreferrer noopener">MDN Guide</a>
        </p>
      </div>
    </ToolShell>
  );
}
