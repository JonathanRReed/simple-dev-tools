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
import { toHex } from "@/lib/base64";
import { readHandoff } from "@/lib/handoff";

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
  return toHex(new Uint8Array(buffer));
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
  const [rawDigests, setDigests] = useState<Record<Algorithm, string>>(EMPTY_DIGESTS);
  const [resultSource, setResultSource] = useState<string | ArrayBuffer | null>(null);
  const source = mode === "text" ? text : fileBuffer;
  const pending = source !== null && source !== "" && resultSource !== source;
  const digests = resultSource === source ? rawDigests : EMPTY_DIGESTS;
  const [error, setError] = useState<string | null>(null);
  const [upperCase, setUpperCase] = useState(false);
  const [expected, setExpected] = useState("");

  // Text or an expected digest pasted into the home slot arrives as a one-shot
  // handoff. It never travels in a URL, so there is still no share link here.
  useEffect(() => {
    const handed = readHandoff();
    if (!handed) return;
    if (typeof handed.text === "string") {
      setMode("text");
      setText(handed.text);
    }
    if (typeof handed.expected === "string") setExpected(handed.expected);
  }, [setText]);

  const genRef = useRef(0);
  const fileReadRef = useRef(0);
  const invalidateHash = useCallback(() => { genRef.current++; }, []);
  const isCryptoAvailable = typeof crypto !== "undefined" && crypto.subtle != null;

  const runHash = useCallback(
    async (data: ArrayBuffer | null, identity: string | ArrayBuffer | null) => {
      const token = ++genRef.current;
      if (!isCryptoAvailable) {
        setError("Web Crypto is not available in this context.");
        setResultSource(identity);
        return;
      }

      setError(null);

      if (data == null) {
        setDigests(EMPTY_DIGESTS);
        setResultSource(identity);
        return;
      }

      try {
        const next = await hashAll(data);
        if (token !== genRef.current) return;
        setDigests(next);
      } catch (e) {
        if (token !== genRef.current) return;
        setError(e instanceof Error ? e.message : "Hash computation failed.");
        setDigests(EMPTY_DIGESTS);
      } finally {
        if (token === genRef.current) setResultSource(identity);
      }
    },
    [isCryptoAvailable]
  );

  useEffect(() => {
    if (mode !== "text") return;
    const data = debouncedText === "" ? null : new TextEncoder().encode(debouncedText).buffer;
    void runHash(data, debouncedText);
    return invalidateHash;
  }, [mode, debouncedText, runHash, invalidateHash]);

  useEffect(() => {
    if (mode !== "file") return;
    void runHash(fileBuffer, fileBuffer);
    return invalidateHash;
  }, [mode, fileBuffer, runHash, invalidateHash]);

  const handleFile = useCallback(
    async (_text: string, file: File) => {
      const token = ++fileReadRef.current;
      try {
        setFileBuffer(null);
        setFile(file);
        const buffer = await file.arrayBuffer();
        if (token !== fileReadRef.current) return;
        setFileBuffer(buffer);
        setMode("file");
        setError(null);
      } catch (e) {
        if (token !== fileReadRef.current) return;
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
    genRef.current++;
    fileReadRef.current++;
    setDigests(EMPTY_DIGESTS);
    setResultSource(null);
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
      <div className="flex border border-border rounded-lg">
        <Button
          type="button"
          size="sm"
          variant={!upperCase ? "default" : "ghost"}
          className=""
          aria-pressed={!upperCase}
          onClick={() => setUpperCase(false)}
      >
          lowercase
        </Button>
        <Button
          type="button"
          size="sm"
          variant={upperCase ? "default" : "ghost"}
          className="border-l border-border"
          aria-pressed={upperCase}
          onClick={() => setUpperCase(true)}
        >
          UPPERCASE
        </Button>
      </div>
    </>
  );

  return (
    <ToolShell toolbar={toolbar}>
      <div className="flex flex-col gap-5">
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
                  className="min-h-[150px] w-full resize-y border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none rounded-lg"
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
                <div className="well relative flex min-h-[150px] flex-col items-center justify-center gap-3 border-dashed p-6 text-center">
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="ui-label">File</span>
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
                      <span className="text-sm font-semibold text-foreground">
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
          <ResultPanel title="Digests" bodyClassName="divide-y divide-border py-1">
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
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2"
                >
                  <span className="ui-label order-1 w-16 shrink-0">{alg}</span>
                  <span className="order-3 min-w-0 basis-full break-all font-mono text-[0.8125rem] leading-relaxed text-foreground sm:order-2 sm:grow sm:basis-0">
                    {display}
                  </span>
                  <CopyButton value={display} label="Copy" size="sm" className="order-2 ml-auto sm:order-3 sm:ml-0" />
                </div>
              );
            })}

            {!hasAnyDigest ? (
              <span className="block py-2 text-sm text-muted-foreground">
                {pending ? "Computing digests…" : "Enter text or drop a file to compute digests."}
              </span>
            ) : null}
          </ResultPanel>

          <Field
            label="Expected digest"
            htmlFor="hash-expected"
            hint="Spaces are ignored. Match is case-insensitive."
            action={
              <>
                {verify.hasExpected && hasAnyDigest && !pending ? (
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
                    ? pending || !hasAnyDigest
                      ? "Waiting for digests before verification."
                      : verify.matched
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
