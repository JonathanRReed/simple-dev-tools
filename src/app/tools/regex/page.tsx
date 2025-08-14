"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
];

function buildFlags(state: FlagsState): string {
  return FLAG_LIST.map(f => (state[f.key] ? f.key : "")).join("");
}

export default function RegexLab() {
  return (
    <React.Suspense fallback={<div className="p-8 text-gray-300">Loading…</div>}>
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

function RegexLabInner() {
  const [pattern, setPattern] = useState<string>(DEFAULT_PATTERN);
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [replacement, setReplacement] = useState<string>("$&");
  const [flags, setFlags] = useState<FlagsState>({ g: true, i: false, m: false, s: false, u: false, y: false });
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, []);

  const matches = useMemo(() => {
    if (!re) return [] as { match: string; index: number; groups: (string | undefined)[] }[];
    const list: { match: string; index: number; groups: (string | undefined)[] }[] = [];
    if (re.global || re.sticky) {
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, re.flags); // copy to avoid lastIndex side-effects
      while ((m = r.exec(text)) !== null) {
        list.push({ match: m[0], index: m.index, groups: Array.from(m).slice(1) });
        if (m[0] === "") r.lastIndex++; // avoid infinite loops on zero-length matches
      }
    } else {
      const m = re.exec(text);
      if (m) list.push({ match: m[0], index: m.index, groups: Array.from(m).slice(1) });
    }
    return list;
  }, [re, text]);

  const replaced = useMemo(() => {
    if (!re) return "";
    try {
      return text.replace(re, replacement);
    } catch {
      return "";
    }
  }, [re, text, replacement]);

  const handleSample = (s: (typeof SAMPLES)[number]) => {
    setPattern(s.pattern);
    setText(s.test);
    setReplacement(s.replace ?? "$&");
    const newFlags: FlagsState = { g: false, i: false, m: false, s: false, u: false, y: false };
    (s.flags ?? "").split("").forEach((k) => {
      if (k && (newFlags as any)[k] !== undefined) (newFlags as any)[k] = true;
    });
    setFlags(newFlags);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-[#181926]/80 rounded-3xl shadow-2xl px-8 py-10 max-w-5xl w-full flex flex-col gap-6 relative border border-[#a78bfa]" style={{backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)'}}>
        <h2 className="text-3xl font-bold text-[#a78bfa] text-center drop-shadow">Regex Lab</h2>
        <p className="text-bodyText text-center">Live test patterns with flags, groups, and replacement preview.</p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-gray-300">Pattern</label>
          <input
            className="flex-1 rounded-xl px-4 py-2 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern (without / /)"
          />
          <div className="flex items-center gap-2">
            {FLAG_LIST.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1 text-gray-300 border border-[#a78bfa33] rounded-lg px-2 py-1">
                <input
                  type="checkbox"
                  className="accent-[#a78bfa]"
                  checked={flags[key]}
                  onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <button
            onClick={handleCopyLink}
            className="ml-auto text-sm bg-[#a78bfa]/20 hover:bg-[#a78bfa]/30 border border-[#a78bfa66] text-[#e9d5ff] rounded-lg px-3 py-1"
            title="Copy shareable link"
          >
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2">Test String</label>
            <textarea
              className="w-full min-h-[140px] rounded-xl px-4 py-3 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-3">
              <label className="block text-gray-300 mb-2">Replacement</label>
              <input
                className="w-full rounded-xl px-4 py-2 bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="$&, $1, $<name> etc."
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[#a78bfa] font-semibold">Matches</h3>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const s = SAMPLES.find((x) => x.label === e.target.value);
                    if (s) handleSample(s);
                  }}
                  defaultValue=""
                  className="rounded-lg bg-[#23243a]/70 border border-[#a78bfa66] text-gray-200 px-3 py-1"
                >
                  <option value="" disabled>
                    Choose sample…
                  </option>
                  {SAMPLES.map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <a
                  className="text-sm text-[#a78bfa] hover:underline"
                  href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  MDN RegExp Guide
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-[#a78bfa99] bg-[#23243a]/80 p-3 max-h-[220px] overflow-auto">
              {!re && error && <div className="text-red-400 text-sm">{error}</div>}
              {re && matches.length === 0 && <div className="text-gray-400 text-sm">No matches.</div>}
              {re && matches.length > 0 && (
                <table className="w-full text-sm text-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1">Index</th>
                      <th className="text-left px-2 py-1">Match</th>
                      <th className="text-left px-2 py-1">Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className="even:bg-[#a78bfa11]">
                        <td className="px-2 py-1 align-top">{m.index}</td>
                        <td className="px-2 py-1 align-top whitespace-pre-wrap break-words">{m.match}</td>
                        <td className="px-2 py-1 align-top">
                          {m.groups.length ? (
                            <ul className="list-disc pl-5">
                              {m.groups.map((g, j) => (
                                <li key={j} className="break-words">
                                  <span className="text-gray-300">Group {j + 1}:</span> {g ?? "<empty>"}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400">(none)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-[#a78bfa] font-semibold mb-2">Replace Preview</h3>
              <div className="rounded-xl border border-[#a78bfa99] bg-[#23243a]/80 p-3 whitespace-pre-wrap break-words max-h-[180px] overflow-auto">
                {replaced}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#a78bfa66] bg-[#23243a]/60 p-4">
          <details>
            <summary className="cursor-pointer text-[#a78bfa] font-semibold">Regex Cheat Sheet</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-200">
              <div>
                <div className="font-medium text-gray-300 mb-1">Basics</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><code>.</code> any char (except newline unless <code>s</code>)</li>
                  <li><code>^</code> start, <code>$</code> end</li>
                  <li><code>\d</code> digit, <code>\w</code> word, <code>\s</code> space</li>
                  <li><code>\b</code> word boundary</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-gray-300 mb-1">Quantifiers</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><code>*</code> 0+, <code>+</code> 1+, <code>?</code> 0/1, <code>{`{n}`}</code>, <code>{`{n,}`}</code>, <code>{`{n,m}`}</code></li>
                  <li>Lazy: append <code>?</code> e.g. <code>.*?</code></li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-gray-300 mb-1">Groups & Alternation</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><code>(...)</code> capture, <code>(?:...)</code> non-capture</li>
                  <li><code>(?&lt;name&gt;...)</code> named capture, backref <code>\k&lt;name&gt;</code></li>
                  <li><code>a|b</code> alternation</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-gray-300 mb-1">Flags</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><code>g</code> global, <code>i</code> ignoreCase, <code>m</code> multiline</li>
                  <li><code>s</code> dotAll, <code>u</code> unicode, <code>y</code> sticky</li>
                </ul>
              </div>
            </div>
          </details>
        </div>

        <div className="text-xs text-gray-400 mt-2">
          <p>
            Flags: <code>g</code> global, <code>i</code> ignoreCase, <code>m</code> multiline,
            <code> s</code> dotAll, <code>u</code> unicode, <code>y</code> sticky
          </p>
          <p>
            Useful links: {" "}
            <a className="text-[#a78bfa] hover:underline" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp" target="_blank" rel="noreferrer noopener">MDN RegExp</a>{" • "}
            <a className="text-[#a78bfa] hover:underline" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace" target="_blank" rel="noreferrer noopener">MDN String.replace</a>
          </p>
        </div>
      </div>
    </div>
  );
}
