"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeftRight, Download, RotateCcw } from "lucide-react";

import type { ToolShortcut } from "@/components/KeyboardShortcuts";
import ToolShell from "@/components/tool/ToolShell";
import { readShareParams } from "@/lib/share";
import { downloadFile } from "@/lib/download";
import { useHotkey } from "@/hooks/use-hotkey";
import {
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  te,
} from "@/lib/base64";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

const QR_MIN = 128;
const QR_MAX = 1024;
const QR_DEFAULT = 256;

const QR_MARGIN_MIN = 0;
const QR_MARGIN_MAX = 8;
const QR_MARGIN_DEFAULT = 2;

/** Parse + clamp the quiet-zone margin; falls back to the default on NaN. */
function clampQrMargin(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return QR_MARGIN_DEFAULT;
  return Math.min(QR_MARGIN_MAX, Math.max(QR_MARGIN_MIN, n));
}

// Approximate max byte-mode capacities per ECC level (version 40 QR, binary
// mode). Used as a friendly pre-emptive guard before the library throws.
const QR_BYTE_CAPACITY: Record<"L" | "M" | "Q" | "H", number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};

/** Returns the trimmed text as a valid http(s) URL, or null. */
function asHttpUrl(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* not a URL */
  }
  return null;
}

/** Parse + clamp a QR size; falls back to the default on NaN. */
function clampQrSize(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return QR_DEFAULT;
  return Math.min(QR_MAX, Math.max(QR_MIN, n));
}

/** Copy text to the clipboard with a non-secure-context fallback. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function counts(s: string): string {
  // Count Unicode code points (not UTF-16 code units) so emoji / astral
  // characters count as one "char".
  const chars = Array.from(s).length;
  const bytes = te.encode(s).length;
  return `${chars.toLocaleString()} chars · ${bytes.toLocaleString()} bytes`;
}

type EncodeMode = "encode" | "decode";

const READONLY_TEXTAREA =
  "w-full min-h-[160px] resize-y bg-background/60 px-4 py-3 font-mono text-sm text-foreground";

export default function EncodeQR() {
  const [tab, setTab] = useState<"url" | "base64" | "qr">("url");

  // ── URL encode/decode ────────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState<string>(
    "https://example.com/?q=hello world&x=1+2"
  );
  const [urlMode, setUrlMode] = useState<EncodeMode>("encode");
  const [urlOutput, setUrlOutput] = useState<string>("");
  const [urlError, setUrlError] = useState<string>("");

  // Auto/debounced URL transform.
  useEffect(() => {
    const id = setTimeout(() => {
      if (urlInput === "") {
        setUrlOutput("");
        setUrlError("");
        return;
      }
      try {
        setUrlError("");
        setUrlOutput(
          urlMode === "encode"
            ? encodeURIComponent(urlInput)
            : decodeURIComponent(urlInput)
        );
      } catch (e: any) {
        setUrlOutput("");
        setUrlError(e?.message || `${urlMode === "encode" ? "Encode" : "Decode"} error`);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [urlInput, urlMode]);

  function resetUrl() {
    setUrlInput("");
    setUrlOutput("");
    setUrlError("");
  }
  function swapUrl() {
    if (!urlOutput) return;
    setUrlInput(urlOutput);
    // After a swap the natural next step is the inverse direction.
    setUrlMode((m) => (m === "encode" ? "decode" : "encode"));
  }

  // ── Base64 ───────────────────────────────────────────────────────────
  const [b64Input, setB64Input] = useState<string>("Hello, world");
  const [b64Mode, setB64Mode] = useState<EncodeMode>("encode");
  const [b64UrlSafe, setB64UrlSafe] = useState<boolean>(false);
  const [b64Output, setB64Output] = useState<string>("");
  const [b64Error, setB64Error] = useState<string>("");

  // Auto/debounced Base64 transform. Re-runs when the URL-safe toggle
  // changes so the output never goes stale.
  useEffect(() => {
    const id = setTimeout(() => {
      if (b64Input === "") {
        setB64Output("");
        setB64Error("");
        return;
      }
      try {
        setB64Error("");
        if (b64Mode === "encode") {
          let b64 = toBase64(b64Input);
          if (b64UrlSafe) b64 = toBase64Url(b64);
          setB64Output(b64);
        } else {
          let src = b64Input;
          if (b64UrlSafe) src = fromBase64Url(src);
          setB64Output(fromBase64(src));
        }
      } catch (e: any) {
        setB64Output("");
        // Distinguish a fatal UTF-8 decode (valid Base64, but not text) from a
        // malformed-Base64 error so the message is actionable.
        setB64Error(
          e instanceof TypeError
            ? "Decoded bytes are not valid UTF-8 text (the data may be binary)."
            : e?.message ||
                "Decode error (ensure valid Base64 and toggle URL-safe appropriately)"
        );
      }
    }, 200);
    return () => clearTimeout(id);
  }, [b64Input, b64Mode, b64UrlSafe]);

  function resetB64() {
    setB64Input("");
    setB64Output("");
    setB64Error("");
  }
  function swapB64() {
    if (!b64Output) return;
    setB64Input(b64Output);
    setB64Mode((m) => (m === "encode" ? "decode" : "encode"));
  }

  // ── QR ───────────────────────────────────────────────────────────────
  const [qrText, setQrText] = useState<string>("https://example.com");
  // Kept as a string so the field allows free typing (e.g. clearing to retype
  // "512"); the effective size is clamped only at generation / on blur.
  const [qrSizeInput, setQrSizeInput] = useState<string>(String(QR_DEFAULT));
  const [qrEcc, setQrEcc] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrFormat, setQrFormat] = useState<"png" | "svg">("png");
  // Quiet-zone margin (modules of whitespace around the symbol).
  const [qrMargin, setQrMargin] = useState<number>(QR_MARGIN_DEFAULT);
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");

  // URL hash share state takes precedence over defaults.
  useEffect(() => {
    const params = readShareParams();
    if (!params) return;
    if (
      params.tab === "url" ||
      params.tab === "base64" ||
      params.tab === "qr"
    ) {
      setTab(params.tab as typeof tab);
    }
    if (typeof params.u === "string") setUrlInput(params.u);
    if (params.um === "encode" || params.um === "decode") setUrlMode(params.um);
    if (typeof params.b === "string") setB64Input(params.b);
    if (params.bm === "encode" || params.bm === "decode") setB64Mode(params.bm);
    if (params.bu === "0" || params.bu === "1") setB64UrlSafe(params.bu === "1");
    if (typeof params.q === "string") setQrText(params.q);
    if (typeof params.qs === "string") setQrSizeInput(params.qs);
    if (params.qe === "L" || params.qe === "M" || params.qe === "Q" || params.qe === "H") setQrEcc(params.qe);
    if (params.qf === "png" || params.qf === "svg") setQrFormat(params.qf);
    if (typeof params.qm === "string") setQrMargin(clampQrMargin(params.qm));
  }, []);

  // Monotonic token: each generateQR call claims the next id, and only the
  // latest call is allowed to commit results, so overlapping async runs can't
  // resolve out of order and leave a stale preview.
  const qrGenRef = useRef(0);

  // Capacity accounting: byte length vs. the approximate max for the ECC level.
  const qrBytes = useMemo(() => te.encode(qrText).length, [qrText]);
  const qrCapacity = QR_BYTE_CAPACITY[qrEcc];
  const qrOverBy = qrBytes - qrCapacity;
  const qrOverCapacity = qrOverBy > 0;
  const qrCapacityHint = `${qrBytes.toLocaleString()} / ${qrCapacity.toLocaleString()} bytes · ${qrEcc}`;

  // Open-URL convenience: a valid http(s) destination for the current text.
  const qrUrl = useMemo(() => asHttpUrl(qrText), [qrText]);

  const generateQR = useCallback(async () => {
    const gen = ++qrGenRef.current;
    // Empty/whitespace guard: the library throws a raw error otherwise.
    if (qrText.trim() === "") {
      setQrPngDataUrl("");
      setQrSvg("");
      setQrError("Enter some text or a URL to generate a QR code.");
      return;
    }
    const size = clampQrSize(qrSizeInput);
    try {
      setQrError("");
      if (qrFormat === "png") {
        const url = await QRCode.toDataURL(qrText, {
          errorCorrectionLevel: qrEcc,
          width: size,
          margin: qrMargin,
        });
        if (gen !== qrGenRef.current) return;
        setQrPngDataUrl(url);
        setQrSvg("");
      } else {
        const svg = await QRCode.toString(qrText, {
          errorCorrectionLevel: qrEcc,
          type: "svg",
          width: size,
          margin: qrMargin,
        } as any);
        if (gen !== qrGenRef.current) return;
        setQrSvg(svg);
        setQrPngDataUrl("");
      }
    } catch (e: any) {
      if (gen !== qrGenRef.current) return;
      setQrPngDataUrl("");
      setQrSvg("");
      setQrError(e?.message || "QR generation error");
    }
  }, [qrText, qrSizeInput, qrEcc, qrFormat, qrMargin]);

  // Debounced auto-generation. Re-running on format change also clears the
  // previous (stale) preview, since only one of png/svg is ever set.
  useEffect(() => {
    const id = setTimeout(() => {
      void generateQR();
    }, 300);
    return () => clearTimeout(id);
  }, [generateQR]);

  function resetQr() {
    setQrText("");
    setQrPngDataUrl("");
    setQrSvg("");
    setQrError("");
    setQrMargin(QR_MARGIN_DEFAULT);
  }

  function downloadPng() {
    if (!qrPngDataUrl) return;
    void fetch(qrPngDataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not read the PNG (${res.status}).`);
        return res.blob();
      })
      .then((blob) => downloadFile(blob, "qr.png"))
      .catch((e: unknown) => setQrError(e instanceof Error ? e.message : "PNG download failed."));
  }

  function downloadSvg() {
    if (!qrSvg) return;
    downloadFile(qrSvg, "qr.svg", "image/svg+xml");
  }

  async function copyCurrentQr(): Promise<boolean> {
    const text = qrFormat === "png" ? qrPngDataUrl : qrSvg;
    if (!text) return false;
    return copyToClipboard(text);
  }

  const MAX_SHARE_VALUE = 2000;

  const shareParams = useCallback(() => {
    const params: Record<string, string> = { tab };
    const add = (key: string, value: string) => {
      if (value && value.length <= MAX_SHARE_VALUE) params[key] = value;
    };
    if (tab === "url") {
      add("u", urlInput);
      params.um = urlMode;
    } else if (tab === "base64") {
      add("b", b64Input);
      params.bm = b64Mode;
      params.bu = b64UrlSafe ? "1" : "0";
    } else {
      add("q", qrText);
      add("qs", qrSizeInput);
      params.qe = qrEcc;
      params.qf = qrFormat;
      params.qm = String(qrMargin);
    }
    // If only the tab survived and the essential input is empty, nothing to share.
    if (Object.keys(params).length <= 1) {
      const inputEmpty =
        tab === "url" ? !urlInput.trim() : tab === "base64" ? !b64Input.trim() : !qrText.trim();
      if (inputEmpty) return null;
    }
    return params;
  }, [
    tab,
    urlInput,
    urlMode,
    b64Input,
    b64Mode,
    b64UrlSafe,
    qrText,
    qrSizeInput,
    qrEcc,
    qrFormat,
    qrMargin,
  ]);

  const shortcuts: ToolShortcut[] = useMemo(
    () =>
      tab === "qr"
        ? [{ keys: "⌘ ↵", description: "Generate or copy QR" }]
        : [],
    [tab]
  );

  useHotkey(
    "mod+enter",
    (event) => {
      if (tab === "qr") {
        event.preventDefault();
        if (qrPngDataUrl || qrSvg) {
          void copyCurrentQr();
        } else {
          void generateQR();
        }
      }
    },
    { allowInInput: true }
  );

  const eyebrow = useMemo(
    () => (tab === "url" ? "ENCODER / URL" : tab === "base64" ? "ENCODER / BASE64" : "ENCODER / QR"),
    [tab]
  );

  return (
    <ToolShell eyebrow={eyebrow} shareParams={shareParams} shortcuts={shortcuts}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="base64">Base64</TabsTrigger>
          <TabsTrigger value="qr">QR</TabsTrigger>
        </TabsList>

        {/* ── URL ────────────────────────────────────────────────────── */}
        <TabsContent value="url">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex border-2 border-border">
              <Button
                type="button"
                size="sm"
                variant={urlMode === "encode" ? "default" : "ghost"}
                className="rounded-none"
                aria-pressed={urlMode === "encode"}
                onClick={() => setUrlMode("encode")}
              >
                Encode
              </Button>
              <Button
                type="button"
                size="sm"
                variant={urlMode === "decode" ? "default" : "ghost"}
                className="rounded-none border-l-2 border-border"
                aria-pressed={urlMode === "decode"}
                onClick={() => setUrlMode("decode")}
              >
                Decode
              </Button>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={swapUrl} disabled={!urlOutput}>
              <ArrowLeftRight aria-hidden="true" /> Swap
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetUrl}>
              <RotateCcw aria-hidden="true" /> Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field
              label="Input"
              htmlFor="url-input"
              hint={counts(urlInput)}
            >
              <textarea
                id="url-input"
                className="w-full min-h-[160px] resize-y px-4 py-3 font-mono text-sm"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Text or URL to encode/decode"
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <ResultPanel
                title="Output"
                copyValue={urlOutput}
                bodyClassName="p-0"
              >
                <Label htmlFor="url-output" className="sr-only">
                  URL output
                </Label>
                <textarea
                  id="url-output"
                  readOnly
                  className={READONLY_TEXTAREA + " border-0"}
                  value={urlOutput}
                  placeholder="Result appears here"
                />
              </ResultPanel>
              <p className="text-xs text-muted-foreground">{counts(urlOutput)}</p>
            </div>
          </div>

          {urlError && (
            <Alert variant="error" className="mt-4">
              {urlError}
            </Alert>
          )}
        </TabsContent>

        {/* ── Base64 ─────────────────────────────────────────────────── */}
        <TabsContent value="base64">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex border-2 border-border">
              <Button
                type="button"
                size="sm"
                variant={b64Mode === "encode" ? "default" : "ghost"}
                className="rounded-none"
                aria-pressed={b64Mode === "encode"}
                onClick={() => setB64Mode("encode")}
              >
                Encode
              </Button>
              <Button
                type="button"
                size="sm"
                variant={b64Mode === "decode" ? "default" : "ghost"}
                className="rounded-none border-l-2 border-border"
                aria-pressed={b64Mode === "decode"}
                onClick={() => setB64Mode("decode")}
              >
                Decode
              </Button>
            </div>
            <label className="flex items-center gap-2 border-2 border-border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <input
                type="checkbox"
                checked={b64UrlSafe}
                onChange={(e) => setB64UrlSafe(e.target.checked)}
              />
              URL-safe
            </label>
            <Button type="button" size="sm" variant="outline" onClick={swapB64} disabled={!b64Output}>
              <ArrowLeftRight aria-hidden="true" /> Swap
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetB64}>
              <RotateCcw aria-hidden="true" /> Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Input" htmlFor="b64-input" hint={counts(b64Input)}>
              <textarea
                id="b64-input"
                className="w-full min-h-[160px] resize-y px-4 py-3 font-mono text-sm"
                value={b64Input}
                onChange={(e) => setB64Input(e.target.value)}
                placeholder="Text to encode or Base64 to decode"
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <ResultPanel
                title="Output"
                copyValue={b64Output}
                bodyClassName="p-0"
              >
                <Label htmlFor="b64-output" className="sr-only">
                  Base64 output
                </Label>
                <textarea
                  id="b64-output"
                  readOnly
                  className={READONLY_TEXTAREA + " border-0"}
                  value={b64Output}
                  placeholder="Result appears here"
                />
              </ResultPanel>
              <p className="text-xs text-muted-foreground">{counts(b64Output)}</p>
            </div>
          </div>

          {b64Error && (
            <Alert variant="error" className="mt-4">
              {b64Error}
            </Alert>
          )}
        </TabsContent>

        {/* ── QR ─────────────────────────────────────────────────────── */}
        <TabsContent value="qr">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
            <div className="flex flex-col gap-4">
              <Field
                label="Text"
                htmlFor="qr-text"
                hint={qrOverCapacity ? undefined : qrCapacityHint}
                error={qrOverCapacity ? qrCapacityHint : undefined}
              >
                <textarea
                  id="qr-text"
                  className="w-full min-h-[120px] resize-y px-4 py-3 font-mono text-sm"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="Text or URL to encode into a QR code"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Size (px)" htmlFor="qr-size" hint={`${QR_MIN}–${QR_MAX}`}>
                  <Input
                    id="qr-size"
                    type="number"
                    min={QR_MIN}
                    max={QR_MAX}
                    value={qrSizeInput}
                    onChange={(e) => setQrSizeInput(e.target.value)}
                    onBlur={(e) => setQrSizeInput(String(clampQrSize(e.target.value)))}
                  />
                </Field>

                <Field
                  label="Quiet zone"
                  htmlFor="qr-margin"
                  hint={`${QR_MARGIN_MIN}–${QR_MARGIN_MAX} modules`}
                >
                  <Input
                    id="qr-margin"
                    type="number"
                    min={QR_MARGIN_MIN}
                    max={QR_MARGIN_MAX}
                    value={qrMargin}
                    onChange={(e) => setQrMargin(clampQrMargin(e.target.value))}
                  />
                </Field>

                <Field label="Error correction" htmlFor="qr-ecc">
                  <select
                    id="qr-ecc"
                    className="h-9 w-full px-3 py-1 font-mono text-sm"
                    value={qrEcc}
                    onChange={(e) => setQrEcc(e.target.value as typeof qrEcc)}
                  >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </Field>

                <Field label="Format" htmlFor="qr-format">
                  <select
                    id="qr-format"
                    className="h-9 w-full px-3 py-1 font-mono text-sm"
                    value={qrFormat}
                    onChange={(e) => setQrFormat(e.target.value as typeof qrFormat)}
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                </Field>

                <div className="flex items-end gap-2">
                  {qrFormat === "png" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={downloadPng}
                      disabled={!qrPngDataUrl}
                    >
                      <Download aria-hidden="true" /> PNG
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={downloadSvg}
                      disabled={!qrSvg}
                    >
                      <Download aria-hidden="true" /> SVG
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="icon" aria-label="Reset" onClick={resetQr}>
                    <RotateCcw aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {qrError && <Alert variant="error">{qrError}</Alert>}
            </div>

            <ResultPanel title="Preview" bodyClassName="p-0">
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-background/60 p-4">
                {qrFormat === "png" && qrPngDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrPngDataUrl} alt="Generated QR code" className="max-w-full" />
                )}
                {qrFormat === "svg" && qrSvg && (
                  <div
                    className="max-w-full"
                    role="img"
                    aria-label="Generated QR code"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                )}
                {!qrPngDataUrl && !qrSvg && !qrError && (
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    QR preview appears here
                  </p>
                )}
                {qrUrl && (qrPngDataUrl || qrSvg) && (
                  <Button asChild variant="link" size="sm">
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={qrUrl}
                    >
                      Open ↗
                    </a>
                  </Button>
                )}
              </div>
            </ResultPanel>
          </div>
        </TabsContent>
      </Tabs>
    </ToolShell>
  );
}
