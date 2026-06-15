"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeftRight, Download, RotateCcw } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

const te = new TextEncoder();
const td = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(text: string): string {
  return bytesToBase64(te.encode(text));
}

function fromBase64(b64: string): string {
  return td.decode(base64ToBytes(b64));
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url: string): string {
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "====".slice(pad);
  return s;
}

const QR_MIN = 128;
const QR_MAX = 1024;
const QR_DEFAULT = 256;

/** Parse + clamp a QR size; falls back to the default on NaN. */
function clampQrSize(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return QR_DEFAULT;
  return Math.min(QR_MAX, Math.max(QR_MIN, n));
}

function counts(s: string): string {
  const bytes = te.encode(s).length;
  return `${s.length.toLocaleString()} chars · ${bytes.toLocaleString()} bytes`;
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
        setB64Error(
          e?.message ||
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
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");

  const generateQR = useCallback(async () => {
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
          margin: 2,
          scale: 4,
        });
        setQrPngDataUrl(url);
        setQrSvg("");
      } else {
        const svg = await QRCode.toString(qrText, {
          errorCorrectionLevel: qrEcc,
          type: "svg",
          width: size,
          margin: 2,
        } as any);
        setQrSvg(svg);
        setQrPngDataUrl("");
      }
    } catch (e: any) {
      setQrPngDataUrl("");
      setQrSvg("");
      setQrError(e?.message || "QR generation error");
    }
  }, [qrText, qrSizeInput, qrEcc, qrFormat]);

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
  }

  function downloadPng() {
    if (!qrPngDataUrl) return;
    const a = document.createElement("a");
    a.href = qrPngDataUrl;
    a.download = "qr.png";
    a.click();
  }

  function downloadSvg() {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const eyebrow = useMemo(
    () => (tab === "url" ? "ENCODER / URL" : tab === "base64" ? "ENCODER / BASE64" : "ENCODER / QR"),
    [tab]
  );

  return (
    <ToolShell eyebrow={eyebrow}>
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
              <Field label="Text" htmlFor="qr-text" hint={counts(qrText)}>
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
              <div className="flex min-h-[260px] items-center justify-center bg-background/60 p-4">
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
              </div>
            </ResultPanel>
          </div>
        </TabsContent>
      </Tabs>
    </ToolShell>
  );
}
