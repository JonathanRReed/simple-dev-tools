"use client";
import React, { useMemo, useState } from "react";

import ToolPage from "@/components/layout/ToolPage";

// --- Helpers: encoding/decoding ---
const te = new TextEncoder();
const td = new TextDecoder();

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64urlToBytes(b64url: string): Uint8Array {
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) s += "==="; // shouldn't happen
  return base64ToBytes(s);
}

function bytesToBase64url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// --- PEM/JWK helpers for RS/ES ---
function stripPem(pem: string): string {
  return pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = stripPem(pem);
  const bytes = base64ToBytes(clean);
  // Ensure we return a concrete ArrayBuffer (not ArrayBufferLike)
  const out = new ArrayBuffer(bytes.length);
  new Uint8Array(out).set(bytes);
  return out;
}

async function importRsaSpkiPublicKey(spkiPem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(spkiPem);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["verify"]
  );
}

async function importEcSpkiPublicKey(spkiPem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(spkiPem);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

async function importRsaJwkPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["verify"]
  );
}

async function importEcJwkPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

async function importPublicKeyForAlg(alg: string, keyText: string): Promise<CryptoKey> {
  // Try JSON first
  try {
    const jwk = JSON.parse(keyText);
    if (typeof jwk === "object" && jwk) {
      if (alg === "RS256") return importRsaJwkPublicKey(jwk);
      if (alg === "ES256") return importEcJwkPublicKey(jwk);
    }
  } catch {}
  // Fallback to PEM (SPKI)
  if (/BEGIN PUBLIC KEY/.test(keyText)) {
    if (alg === "RS256") return importRsaSpkiPublicKey(keyText);
    if (alg === "ES256") return importEcSpkiPublicKey(keyText);
  }
  throw new Error("Provide a valid public key as JWK JSON or SPKI PEM (-----BEGIN PUBLIC KEY-----)");
}

// --- Crypto helpers ---
async function sha(alg: "SHA-256" | "SHA-512", data: string) {
  const buf = await crypto.subtle.digest(alg, te.encode(data));
  const bytes = new Uint8Array(buf);
  return { hex: toHex(bytes), b64url: bytesToBase64url(bytes) };
}

async function hmac(
  alg: "SHA-256" | "SHA-512",
  secret: string,
  data: string
) {
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: { name: alg } },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(data));
  const bytes = new Uint8Array(sig);
  return { hex: toHex(bytes), b64url: bytesToBase64url(bytes) };
}

async function verifyHS256(jwt: string, secret: string) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT must have 3 parts" };
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const mac = await hmac("SHA-256", secret, data);
  return { ok: mac.b64url === s, expected: mac.b64url, actual: s };
}

async function verifyRS256(jwt: string, publicKeyText: string) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT must have 3 parts" };
  const [h, p, s] = parts;
  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = base64urlToBytes(s);
  const key = await importPublicKeyForAlg("RS256", publicKeyText);
  const ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sig, data);
  return { ok } as { ok: boolean } & Record<string, string>;
}

async function verifyES256(jwt: string, publicKeyText: string) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT must have 3 parts" };
  const [h, p, s] = parts;
  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = base64urlToBytes(s);
  const key = await importPublicKeyForAlg("ES256", publicKeyText);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, key, sig, data);
  return { ok } as { ok: boolean } & Record<string, string>;
}

// --- JWT helpers ---
function decodePart(part: string) {
  try {
    const bytes = base64urlToBytes(part);
    const json = td.decode(bytes);
    return { ok: true as const, value: JSON.parse(json) };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "Invalid base64url/JSON" };
  }
}

export default function SecurityTokens() {
  const [tab, setTab] = useState<"jwt" | "hash" | "hmac">("jwt");

  // JWT state
  const [jwt, setJwt] = useState<string>(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsY2UifQ." +
      "YvJx3K2I0tQK9qgVQ5f2I8l9KiQW2IlZKqH5OnZcBCQ"
  );
  const [secret, setSecret] = useState<string>("secret");
  const [publicKey, setPublicKey] = useState<string>("");
  const [jwtError, setJwtError] = useState<string | null>(null);
  const [header, setHeader] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [verifyState, setVerifyState] = useState<
    | { checked: false }
    | { checked: true; ok: boolean; expected?: string; actual?: string; note?: string }
  >({ checked: false });

  function onDecode() {
    setVerifyState({ checked: false });
    setJwtError(null);
    const parts = jwt.trim().split(".");
    if (parts.length !== 3) {
      setJwtError("JWT must have 3 parts (header.payload.signature)");
      setHeader(null);
      setPayload(null);
      return;
    }
    const [h, p] = parts;
    const hd = decodePart(h);
    const pd = decodePart(p);
    if (!hd.ok) setJwtError(`Header error: ${hd.error}`);
    if (!pd.ok) setJwtError((prev) => (prev ? `${prev}; Payload error: ${pd.error}` : `Payload error: ${pd.error}`));
    setHeader(hd.ok ? hd.value : null);
    setPayload(pd.ok ? pd.value : null);
  }

  async function onVerify() {
    setVerifyState({ checked: false });
    try {
      const token = jwt.trim();
      const parts = token.split(".");
      if (parts.length !== 3) {
        setVerifyState({ checked: true, ok: false, expected: "", actual: "", note: "Malformed JWT" });
        return;
      }
      const hd = decodePart(parts[0]);
      if (!hd.ok) {
        setVerifyState({ checked: true, ok: false, note: "Invalid header" });
        return;
      }
      const alg = (hd.value?.alg as string) || "";
      if (alg === "HS256") {
        const res = await verifyHS256(token, secret);
        setVerifyState({ checked: true, ok: res.ok, expected: res.expected, actual: res.actual });
      } else if (alg === "RS256") {
        try {
          const res: any = await verifyRS256(token, publicKey);
          setVerifyState({ checked: true, ok: !!res.ok, note: "Checked with RSASSA-PKCS1-v1_5/SHA-256" });
        } catch (e: any) {
          setVerifyState({ checked: true, ok: false, note: e?.message || "RS256 verify failed" });
        }
      } else if (alg === "ES256") {
        try {
          const res: any = await verifyES256(token, publicKey);
          setVerifyState({ checked: true, ok: !!res.ok, note: "Checked with ECDSA P-256/SHA-256" });
        } catch (e: any) {
          setVerifyState({ checked: true, ok: false, note: e?.message || "ES256 verify failed" });
        }
      } else {
        setVerifyState({ checked: true, ok: false, note: `Unsupported alg: ${alg || "(missing)"}` });
      }
    } catch (e: any) {
      setVerifyState({ checked: true, ok: false, expected: "", actual: "", note: e?.message || "Verify error" });
    }
  }

  // Hash state
  const [hashInput, setHashInput] = useState<string>("Hello, world!");
  const [hashAlg, setHashAlg] = useState<"SHA-256" | "SHA-512">("SHA-256");
  const [hashOut, setHashOut] = useState<{ hex: string; b64url: string } | null>(null);

  async function onHash() {
    const res = await sha(hashAlg, hashInput);
    setHashOut(res);
  }

  // HMAC state
  const [hmacInput, setHmacInput] = useState<string>("message");
  const [hmacSecret, setHmacSecret] = useState<string>("secret");
  const [hmacAlg, setHmacAlg] = useState<"SHA-256" | "SHA-512">("SHA-256");
  const [hmacOut, setHmacOut] = useState<{ hex: string; b64url: string } | null>(null);

  async function onHmac() {
    const res = await hmac(hmacAlg, hmacSecret, hmacInput);
    setHmacOut(res);
  }

  function tsToLocal(ts?: number): string | null {
    if (!ts || !Number.isFinite(ts)) return null;
    try {
      const d = new Date(ts * 1000);
      return `${d.toLocaleString()} (${d.toISOString()})`;
    } catch {
      return null;
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <ToolPage contentClassName="mx-auto max-w-6xl">
      <div
        className="bg-[#181926]/80 rounded-3xl shadow-2xl px-6 md:px-8 py-8 flex flex-col gap-6 border border-[#a78bfa]"
        style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-[#a78bfa] drop-shadow">Security & Tokens</h1>
          <p className="text-sm text-bodyText max-w-3xl">Decode and verify JWTs (HS256/RS256/ES256), compute hashes, and generate HMACs using Web Crypto — no secrets leave the browser.</p>
        </div>

        <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 text-yellow-200 text-sm p-3">
          All operations run locally in your browser. Do not paste production secrets or private keys.
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { k: "jwt", label: "JWT" },
            { k: "hash", label: "Hash" },
            { k: "hmac", label: "HMAC" },
          ].map((t) => (
            <button
              key={t.k}
              className={`px-4 py-2 rounded-xl border ${
                tab === (t.k as any)
                  ? "border-[#a78bfa] text-white bg-[#23243a]/80"
                  : "border-[#a78bfa33] text-gray-300 bg-[#23243a]/50"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* JWT */}
        {tab === "jwt" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-rp-iris font-semibold mb-2">JWT</h2>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Paste JWT (header.payload.signature)"
              />
              <div className="mt-2 flex gap-2 flex-wrap">
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onDecode}>
                  Decode
                </button>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onVerify}>
                  Verify (auto by alg)
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="text-rp-subtle text-sm">Secret (HS256)</label>
                  <input
                    className="w-full rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Shared secret for HS256"
                  />
                </div>
                <div>
                  <label className="text-rp-subtle text-sm">Public Key (PEM SPKI or JWK JSON) for RS256/ES256</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="-----BEGIN PUBLIC KEY-----... or JWK JSON (kty, n, e / crv, x, y)"
                  />
                </div>
              </div>
              {jwtError && <div className="mt-2 text-rp-love text-sm">{jwtError}</div>}
              {"checked" in verifyState && verifyState.checked && (
                <div className={`mt-3 rounded-xl border p-3 bg-rp-overlay/70 ${verifyState.ok ? "border-rp-foam" : "border-rp-love"}`}>
                  <div className={verifyState.ok ? "text-rp-foam" : "text-rp-love"}>
                    {verifyState.ok ? "Signature Verified ✓" : "Invalid Signature"}
                  </div>
                  {!verifyState.ok && (
                    <div className="text-xs text-rp-muted mt-1 break-all">
                      expected: {verifyState.expected}
                      <br />
                      actual: {verifyState.actual}
                    </div>
                  )}
                  {verifyState.note && (
                    <div className="text-xs text-rp-muted mt-1">{verifyState.note}</div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-rp-subtle font-semibold">Header</h3>
                  <button
                    className="text-xs text-rp-iris hover:text-rp-rose"
                    onClick={() => header && copy(JSON.stringify(header, null, 2))}
                  >
                    Copy
                  </button>
                </div>
                <pre className="w-full min-h-[120px] rounded-xl px-4 py-3 bg-rp-base border border-rp-highlight-low text-rp-text whitespace-pre-wrap break-words">
                  {header ? JSON.stringify(header, null, 2) : "(decode to view)"}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-rp-subtle font-semibold">Payload</h3>
                  <button
                    className="text-xs text-rp-iris hover:text-rp-rose"
                    onClick={() => payload && copy(JSON.stringify(payload, null, 2))}
                  >
                    Copy
                  </button>
                </div>
                <pre className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-base border border-rp-highlight-low text-rp-text whitespace-pre-wrap break-words">
                  {payload ? JSON.stringify(payload, null, 2) : "(decode to view)"}
                </pre>
                {payload && (
                  <div className="mt-2 text-xs text-rp-subtle rounded-xl border border-rp-highlight-high bg-rp-overlay/60 p-3">
                    <div className="mb-1 text-rp-muted">Claims</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {payload.exp && (
                        <li>
                          exp: {payload.exp} → {tsToLocal(payload.exp) || "(invalid)"}
                          {typeof payload.exp === "number" && Date.now() / 1000 > payload.exp ? (
                            <span className="ml-2 text-rp-love">(expired)</span>
                          ) : null}
                        </li>
                      )}
                      {payload.iat && <li>iat: {payload.iat} → {tsToLocal(payload.iat) || "(invalid)"}</li>}
                      {payload.nbf && (
                        <li>
                          nbf: {payload.nbf} → {tsToLocal(payload.nbf) || "(invalid)"}
                          {typeof payload.nbf === "number" && Date.now() / 1000 < payload.nbf ? (
                            <span className="ml-2 text-rp-gold">(not yet valid)</span>
                          ) : null}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hash */}
        {tab === "hash" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-rp-iris font-semibold mb-2">Hash</h2>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                placeholder="Text to hash"
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="text-rp-subtle text-sm">Algorithm</label>
                <select
                  className="rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                  value={hashAlg}
                  onChange={(e) => setHashAlg(e.target.value as any)}
                >
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-512">SHA-512</option>
                </select>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onHash}>
                  Compute
                </button>
              </div>
              {hashOut && (
                <div className="mt-3 rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-3 text-sm">
                  <div className="text-rp-subtle">Hex</div>
                  <div className="font-mono break-all text-rp-text">{hashOut.hex}</div>
                  <div className="text-rp-subtle mt-2">Base64url</div>
                  <div className="font-mono break-all text-rp-text">{hashOut.b64url}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HMAC */}
        {tab === "hmac" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-rp-iris font-semibold mb-2">HMAC</h2>
              <textarea
                className="w-full min-h-[160px] rounded-xl px-4 py-3 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                value={hmacInput}
                onChange={(e) => setHmacInput(e.target.value)}
                placeholder="Message"
              />
              <div className="mt-2">
                <label className="text-rp-subtle text-sm">Secret</label>
                <input
                  className="w-full rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-iris"
                  value={hmacSecret}
                  onChange={(e) => setHmacSecret(e.target.value)}
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-rp-subtle text-sm">Algorithm</label>
                <select
                  className="rounded-xl px-3 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                  value={hmacAlg}
                  onChange={(e) => setHmacAlg(e.target.value as any)}
                >
                  <option value="SHA-256">HMAC-SHA-256</option>
                  <option value="SHA-512">HMAC-SHA-512</option>
                </select>
                <button className="px-4 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80" onClick={onHmac}>
                  Compute
                </button>
              </div>
              {hmacOut && (
                <div className="mt-3 rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-3 text-sm">
                  <div className="text-rp-subtle">Hex</div>
                  <div className="font-mono break-all text-rp-text">{hmacOut.hex}</div>
                  <div className="text-rp-subtle mt-2">Base64url</div>
                  <div className="font-mono break-all text-rp-text">{hmacOut.b64url}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
