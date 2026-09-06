"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { FileDrop } from "@/components/FileDrop";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStoredState, useDebounced } from "@/hooks/use-stored-state";

type Mode = "text" | "file";
type Algorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

const ALGORITHMS: Algorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
const STORAGE_KEY = "sdt:hash:text";
const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

const EMPTY_DIGESTS: Record<Algorithm, string> = {
  "SHA-1": "",
  "SHA-256": "",
  "SHA-384": "",
  "SHA-512": "",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function byteSize(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return text.length;
}

function bufToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashAll(data: ArrayBuffer): Promise<Record<Algorithm, string>> {
  const results = { ...EMPTY_DIGESTS };
  await Promise.all(
    ALGORITHMS.map(async (alg) => {
      const buffer = await crypto.subtle.digest(alg, data);
      results[alg] = bufToHex(buffer);
    })
  );
  return results;
}

export default function HashClient() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useStoredState(STORAGE_KEY, "");
  const debouncedText = useDebounced(text, 250);

  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [digests, setDigests] = useState<Record<Algorithm, string>>(EMPTY_DIGESTS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upperCase, setUpperCase] = useState(false);
  const [expected, setExpected] = useState("");

  const genRef = useRef(0);
  const isCryptoAvailable = typeof crypto !== "undefined" && crypto.subtle != null;

  const runHash = useCallback(
    async (data: ArrayBuffer | null) => {
      if (!isCryptoAvailable) {
        setError("Web Crypto is not available in this context.");
        return;
      }

      setError(null);

      if (data == null) {
        setDigests(EMPTY_DIGESTS);
        return;
      }

      const token = ++genRef.current;
      setPending(true);
      try {
        const next = await hashAll(data);
        if (token !== genRef.current) return;
        setDigests(next);
      } catch (e) {
        if (token !== genRef.current) return;
        setError(e instanceof Error ? e.message : "Hash computation failed.");
        setDigests(EMPTY_DIGESTS);
      } finally {
        if (token === genRef.current) setPending(false);
      }
    },
    [isCryptoAvailable]
  );

  useEffect(() => {
    if (mode === "text") {
      const data =
        debouncedText === ""
          ? null
          : new TextEncoder().encode(debouncedText).buffer;
      void runHash(data);
    }
  }, [mode, debouncedText, runHash]);

  useEffect(() => {
    if (mode === "file") {
      void runHash(fileBuffer);
    }
  }, [mode, fileBuffer, runHash]);

  const handleFile = useCallback(
    async (_text: string, file: File) => {
      try {
        setFile(file);
        const buffer = await file.arrayBuffer();
        setFileBuffer(buffer);
        setMode("file");
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the file.");
        setFile(null);
        setFileBuffer(null);
      }
    },
    []
  );

  const handleSample = () => {
    setText(SAMPLE_TEXT);
    setMode("text");
  };

  const handleReset = () => {
    setText("");
    setFile(null);
    setFileBuffer(null);
    setExpected("");
    setUpperCase(false);
    setError(null);
    setMode("text");
  };

  const verify = useMemo(() => {
    const norm = expected.replace(/\s/g, "").toLowerCase();
    const hasExpected = norm.length > 0;
    const matched =
      hasExpected &&
      ALGORITHMS.some((alg) => digests[alg].toLowerCase() === norm);
    return { hasExpected, matched };
  }, [expected, digests]);

  const hasAnyDigest = useMemo(
    () => ALGORITHMS.some((alg) => digests[alg] !== ""),
    [digests]
  );

  const toolbar = (
    <>
      <Button variant="secondary" size="sm" onClick={handleSample}>
        <Sparkles aria-hidden="true" />
        Sample
      </Button>
      <Button variant="outline" size="sm" onClick={handleReset}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
      <div className="flex border-2 border-border">
        <Button
          type="button"
          size="sm"
          variant={!upperCase ? "default" : "ghost"}
          className="rounded-none"
          aria-pressed={!upperCase}
          onClick={() => setUpperCase(false)}
      >
          lowercase
        </Button>
        <Button
          type="button"
          size="sm"
          variant={upperCase ? "default" : "ghost"}
          className="rounded-none border-l-2 border-border"
          aria-pressed={upperCase}
          onClick={() => setUpperCase(true)}
        >
          UPPERCASE
        </Button>
      </div>
    </>
  );

  return (
    <ToolShell eyebrow="Hashing · Verification" toolbar={toolbar}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="file">File</TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <Field
                label="Text"
                htmlFor="hash-text"
                hint={`${formatBytes(byteSize(text))}`}
              >
                <textarea
                  id="hash-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  spellCheck={false}
                  placeholder="Paste or type text to hash…"
                  className="min-h-[280px] w-full resize-y rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
                />
              </Field>
            </TabsContent>

            <TabsContent value="file">
              <FileDrop
                onFileText={handleFile}
                label="Import file"
                skipTextRead
                className="group"
              >
                <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-4 border-2 border-dashed border-border bg-card p-6 text-center">
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="brutal-label">File</span>
                      <span className="max-w-full break-words font-mono text-sm text-foreground">
                        {file.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setFileBuffer(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="brutal-label text-rp-iris">
                        Drop file here
                      </span>
                      <span className="text-sm text-muted-foreground">
                        or choose Import file to browse
                      </span>
                    </>
                  )}
                </div>
              </FileDrop>
            </TabsContent>
          </Tabs>

          {error ? (
            <Alert variant="error">{error}</Alert>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <ResultPanel title="Digests" bodyClassName="space-y-2">
            <div className="sr-only" role="status" aria-live="polite">
              {pending
                ? "Computing digests"
                : hasAnyDigest
                ? "All four digests are ready"
                : "No digests computed"}
            </div>

            {ALGORITHMS.map((alg) => {
              const hex = digests[alg];
              if (!hex) return null;
              const display = upperCase ? hex.toUpperCase() : hex;
              return (
                <div
                  key={alg}
                  className="flex items-center gap-2 border-2 border-border bg-card p-2"
                >
                  <span className="brutal-label w-20 shrink-0">{alg}</span>
                  <span className="min-w-0 grow break-all font-mono text-sm text-foreground">
                    {display}
                  </span>
                  <CopyButton value={display} label="Copy" size="sm" />
                </div>
              );
            })}

            {!hasAnyDigest ? (
              <span className="text-sm text-muted-foreground">
                Enter text or drop a file to compute digests.
              </span>
            ) : null}
          </ResultPanel>

          <Field
            label="Expected digest"
            htmlFor="hash-expected"
            hint="Spaces are ignored. Match is case-insensitive."
            action={
              <>
                {verify.hasExpected ? (
                  verify.matched ? (
                    <Badge className="border-rp-foam bg-rp-foam/10 text-foreground">
                      Match
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No match</Badge>
                  )
                ) : null}
                <span className="sr-only" role="status" aria-live="polite">
                  {verify.hasExpected
                    ? verify.matched
                      ? "The expected digest matches a computed hash."
                      : "The expected digest does not match any computed hash."
                    : "No expected digest to verify."}
                </span>
              </>
            }
          >
            <Input
              id="hash-expected"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Paste an expected hex digest"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
        </div>
      </div>
    </ToolShell>
  );
}
