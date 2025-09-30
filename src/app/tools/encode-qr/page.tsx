"use client";
import React, { useMemo, useState } from "react";
import QRCode from "qrcode";

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

export default function EncodeQR() {
  const [tab, setTab] = useState<"url" | "base64" | "qr">("url");

  // URL encode/decode
  const [urlInput, setUrlInput] = useState<string>("https://example.com/?q=hello world&x=1+2");
  const [urlOutput, setUrlOutput] = useState<string>("");
  const [urlError, setUrlError] = useState<string>("");

  function onUrlEncode() {
    try {
      setUrlError("");
      setUrlOutput(encodeURIComponent(urlInput));
    } catch (e: any) {
      setUrlError(e?.message || "Encode error");
    }
  }
  function onUrlDecode() {
    try {
      setUrlError("");
      setUrlOutput(decodeURIComponent(urlInput));
    } catch (e: any) {
      setUrlError(e?.message || "Decode error");
    }
  }

  // Base64
  const [b64Input, setB64Input] = useState<string>("Hello, 世界 🌐");
  const [b64UrlSafe, setB64UrlSafe] = useState<boolean>(false);
  const [b64Output, setB64Output] = useState<string>("");
  const [b64Error, setB64Error] = useState<string>("");

  function onB64Encode() {
    try {
      setB64Error("");
      let b64 = toBase64(b64Input);
      if (b64UrlSafe) b64 = toBase64Url(b64);
      setB64Output(b64);
    } catch (e: any) {
      setB64Error(e?.message || "Encode error");
    }
  }
  function onB64Decode() {
    try {
      setB64Error("");
      let src = b64Input;
      if (b64UrlSafe) src = fromBase64Url(src);
      const text = fromBase64(src);
      setB64Output(text);
    } catch (e: any) {
      setB64Error(e?.message || "Decode error (ensure valid Base64 and toggle URL-safe appropriately)");
    }
  }

  // QR
  const [qrText, setQrText] = useState<string>("https://example.com");
  const [qrSize, setQrSize] = useState<number>(256);
  const [qrEcc, setQrEcc] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrFormat, setQrFormat] = useState<"png" | "svg">("png");
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrError, setQrError] = useState<string>("");

  async function onGenerateQR() {
    try {
      setQrError("");
      if (qrFormat === "png") {
        const url = await QRCode.toDataURL(qrText, {
          errorCorrectionLevel: qrEcc,
          width: qrSize,
          margin: 2,
          scale: 4,
        });
        setQrPngDataUrl(url);
        setQrSvg("");
      } else {
        const svg = await QRCode.toString(qrText, {
          errorCorrectionLevel: qrEcc,
          type: "svg",
          width: qrSize,
          margin: 2,
        } as any);
        setQrSvg(svg);
        setQrPngDataUrl("");
      }
    } catch (e: any) {
      setQrError(e?.message || "QR generation error");
    }
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
      <div
        className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 md:px-8 py-8 max-w-5xl w-full flex flex-col gap-6 border border-rp-highlight-high"
        style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      >
        <h2 className="text-3xl font-bold text-rp-iris text-center drop-shadow">Encoders & QR</h2>
        <p className="text-rp-subtle text-center">URL and Base64 encode/decode plus a QR generator (PNG/SVG) — all client-side.</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { k: "url", label: "URL" },
            { k: "base64", label: "Base64" },
            { k: "qr", label: "QR" },
          ].map((t) => (
            <button
              key={t.k}
              className={`px-4 py-2 rounded-xl border ${
                tab === (t.k as any)
                  ? "border-rp-iris text-rp-text bg-rp-overlay/80"
                  : "border-rp-highlight-high text-rp-subtle bg-rp-surface/50"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* URL */}
        {tab === "url" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Input</h3>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onUrlEncode}>
                  Encode
                </button>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onUrlDecode}>
                  Decode
                </button>
              </div>
              {urlError && <div className="mt-2 text-red-400 text-sm">{urlError}</div>}
            </div>
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Output</h3>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-base border border-rp-highlight-low text-rp-text"
                value={urlOutput}
                onChange={(e) => setUrlOutput(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Base64 */}
        {tab === "base64" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Input</h3>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={b64Input}
                onChange={(e) => setB64Input(e.target.value)}
                placeholder="Text to encode or Base64 to decode"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="text-rp-subtle text-sm flex items-center gap-2">
                  <input type="checkbox" checked={b64UrlSafe} onChange={(e) => setB64UrlSafe(e.target.checked)} /> URL-safe
                </label>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onB64Encode}>
                  Encode
                </button>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onB64Decode}>
                  Decode
                </button>
              </div>
              {b64Error && <div className="mt-2 text-red-400 text-sm">{b64Error}</div>}
            </div>
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Output</h3>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-base border border-rp-highlight-low text-rp-text"
                value={b64Output}
                onChange={(e) => setB64Output(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* QR */}
        {tab === "qr" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Text</h3>
              <textarea
                className="w-full min-h-[120px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-rp-subtle text-sm">Size (px)</label>
                  <input
                    type="number"
                    min={128}
                    max={1024}
                    className="w-full rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value || "256", 10))}
                  />
                </div>
                <div>
                  <label className="text-rp-subtle text-sm">Error Correction</label>
                  <select
                    className="w-full rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                    value={qrEcc}
                    onChange={(e) => setQrEcc(e.target.value as any)}
                  >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-rp-subtle text-sm">Format</label>
                  <select
                    className="w-full rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                    value={qrFormat}
                    onChange={(e) => setQrFormat(e.target.value as any)}
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onGenerateQR}>
                    Generate
                  </button>
                  {qrFormat === "png" && qrPngDataUrl && (
                    <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={downloadPng}>
                      Download PNG
                    </button>
                  )}
                  {qrFormat === "svg" && qrSvg && (
                    <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={downloadSvg}>
                      Download SVG
                    </button>
                  )}
                </div>
              </div>
              {qrError && <div className="mt-2 text-red-400 text-sm">{qrError}</div>}
            </div>
            <div className="flex items-center justify-center min-h-[260px] rounded-xl border border-rp-highlight-low bg-rp-base p-4">
              {qrFormat === "png" && qrPngDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrPngDataUrl} alt="QR code" className="shadow-lg rounded" />
              )}
              {qrFormat === "svg" && qrSvg && (
                <div className="max-w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              )}
              {!qrPngDataUrl && !qrSvg && (
                <div className="text-rp-muted text-sm">Generate a QR to preview it here.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
