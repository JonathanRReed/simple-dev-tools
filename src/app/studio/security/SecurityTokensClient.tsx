"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Loader2 } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ResultPanel } from "@/components/ui/result-panel";

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

// Pure: format a unix-seconds timestamp as a relative delta vs now, e.g.
// "expired 3h ago" / "in 12m". Granularity steps through s/m/h/d. No deps.
function relTime(unixSeconds: number): string | null {
  if (!Number.isFinite(unixSeconds)) return null;
  const deltaSec = Math.round(unixSeconds - Date.now() / 1000);
  const past = deltaSec < 0;
  const abs = Math.abs(deltaSec);
  let value: number;
  let unit: string;
  if (abs < 60) {
    value = abs;
    unit = "s";
  } else if (abs < 3600) {
    value = Math.floor(abs / 60);
    unit = "m";
  } else if (abs < 86400) {
    value = Math.floor(abs / 3600);
    unit = "h";
  } else {
    value = Math.floor(abs / 86400);
    unit = "d";
  }
  return past ? `${value}${unit} ago` : `in ${value}${unit}`;
}

type VerifyState =
  | { checked: false }
  | { checked: true; ok: boolean; expected?: string; actual?: string; note?: string };

// Known-valid HS256 token (jwt.io sample). It is signed with the secret below;
// supplying both as defaults makes the first-load "Verify" succeed.
const DEFAULT_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const DEFAULT_SECRET = "your-256-bit-secret";

export default function SecurityTokensClient() {
  const [tab, setTab] = useState<"jwt" | "hash" | "hmac">("jwt");

  // JWT state
  const [jwt, setJwt] = useState<string>(DEFAULT_JWT);
  const [secret, setSecret] = useState<string>(DEFAULT_SECRET);
  const [publicKey, setPublicKey] = useState<string>("");
  const [verifyState, setVerifyState] = useState<VerifyState>({ checked: false });
  const [verifying, setVerifying] = useState(false);

  // Auto-decode header/payload live as the token changes.
  const decoded = useMemo(() => {
    const trimmed = jwt.trim();
    if (!trimmed) {
      return { header: null as any, payload: null as any, error: null as string | null };
    }
    const parts = trimmed.split(".");
    if (parts.length !== 3) {
      return {
        header: null as any,
        payload: null as any,
        error: "JWT must have 3 parts (header.payload.signature)",
      };
    }
    const hd = decodePart(parts[0]);
    const pd = decodePart(parts[1]);
    let error: string | null = null;
    if (!hd.ok) error = `Header error: ${hd.error}`;
    if (!pd.ok) error = error ? `${error}; Payload error: ${pd.error}` : `Payload error: ${pd.error}`;
    return {
      header: hd.ok ? hd.value : null,
      payload: pd.ok ? pd.value : null,
      error,
    };
  }, [jwt]);

  const header = decoded.header;
  const payload = decoded.payload;
  const jwtError = decoded.error;

  // Monotonic generation counter: bumped whenever inputs change, so an async
  // verification started against an older input can detect it is stale and bail.
  const verifyGen = useRef(0);

  // Invalidate any prior verification result whenever inputs change so a stale
  // "Verified" can never be shown against a mutated token/secret/key.
  useEffect(() => {
    verifyGen.current += 1;
    setVerifyState({ checked: false });
  }, [jwt, secret, publicKey]);

  async function onVerify() {
    const gen = verifyGen.current;
    const apply = (next: VerifyState) => {
      // Drop the result if inputs changed while crypto was running.
      if (gen === verifyGen.current) setVerifyState(next);
    };
    setVerifyState({ checked: false });
    setVerifying(true);
    try {
      const token = jwt.trim();
      const parts = token.split(".");
      if (parts.length !== 3) {
        apply({ checked: true, ok: false, note: "Malformed JWT" });
        return;
      }
      const hd = decodePart(parts[0]);
      if (!hd.ok) {
        apply({ checked: true, ok: false, note: "Invalid header" });
        return;
      }
      const alg = (hd.value?.alg as string) || "";
      if (alg === "HS256") {
        // Web Crypto rejects a zero-length HMAC key; surface a friendly hint
        // instead of the raw "Zero-length key is not supported" error and keep
        // verification failing closed.
        if (secret.length === 0) {
          apply({ checked: true, ok: false, note: "HS256 secret is required" });
          return;
        }
        const res = await verifyHS256(token, secret);
        apply({ checked: true, ok: res.ok, expected: res.expected, actual: res.actual });
      } else if (alg === "RS256") {
        try {
          const res: any = await verifyRS256(token, publicKey);
          apply({ checked: true, ok: !!res.ok, note: "Checked with RSASSA-PKCS1-v1_5 / SHA-256" });
        } catch (e: any) {
          apply({ checked: true, ok: false, note: e?.message || "RS256 verify failed" });
        }
      } else if (alg === "ES256") {
        try {
          const res: any = await verifyES256(token, publicKey);
          apply({ checked: true, ok: !!res.ok, note: "Checked with ECDSA P-256 / SHA-256" });
        } catch (e: any) {
          apply({ checked: true, ok: false, note: e?.message || "ES256 verify failed" });
        }
      } else {
        apply({ checked: true, ok: false, note: `Unsupported alg: ${alg || "(missing)"}` });
      }
    } catch (e: any) {
      apply({ checked: true, ok: false, note: e?.message || "Verify error" });
    } finally {
      // Always clear the loading flag — even when inputs changed mid-flight and
      // the (stale) result was dropped — so Verify can't get stuck disabled.
      setVerifying(false);
    }
  }

  function onResetJwt() {
    setJwt("");
    setSecret("");
    setPublicKey("");
    setVerifyState({ checked: false });
  }

  function onSampleJwt() {
    setJwt(DEFAULT_JWT);
    setSecret(DEFAULT_SECRET);
    setPublicKey("");
    setVerifyState({ checked: false });
  }

  // Hash state
  const [hashInput, setHashInput] = useState<string>("Hello, world!");
  const [hashAlg, setHashAlg] = useState<"SHA-256" | "SHA-512">("SHA-256");
  const [hashOut, setHashOut] = useState<{ hex: string; b64url: string } | null>(null);

  // Clear stale output when the input or algorithm changes.
  useEffect(() => {
    setHashOut(null);
  }, [hashInput, hashAlg]);

  async function onHash() {
    const res = await sha(hashAlg, hashInput);
    setHashOut(res);
  }

  function onClearHash() {
    setHashInput("");
    setHashOut(null);
  }

  // Load a canonical sample and compute it. State updates are async, so we
  // compute against the literal sample value rather than the (stale) state.
  async function onSampleHash() {
    const sample = "Hello, world!";
    setHashInput(sample);
    const res = await sha(hashAlg, sample);
    setHashOut(res);
  }

  // HMAC state
  const [hmacInput, setHmacInput] = useState<string>("message");
  const [hmacSecret, setHmacSecret] = useState<string>("secret");
  const [hmacAlg, setHmacAlg] = useState<"SHA-256" | "SHA-512">("SHA-256");
  const [hmacOut, setHmacOut] = useState<{ hex: string; b64url: string } | null>(null);
  const [hmacError, setHmacError] = useState<string | null>(null);

  // Clear stale output when the message, secret, or algorithm changes.
  useEffect(() => {
    setHmacOut(null);
    setHmacError(null);
  }, [hmacInput, hmacSecret, hmacAlg]);

  async function onHmac() {
    // Web Crypto's importKey rejects with "Zero-length key is not supported" for
    // an empty secret. Guard it (and any other failure) so the click produces a
    // friendly error instead of an unhandled promise rejection / silent no-op.
    setHmacError(null);
    try {
      if (hmacSecret.length === 0) {
        setHmacOut(null);
        setHmacError("Enter a secret to compute an HMAC.");
        return;
      }
      const res = await hmac(hmacAlg, hmacSecret, hmacInput);
      setHmacOut(res);
    } catch (e: any) {
      setHmacOut(null);
      setHmacError(e?.message || "Failed to compute HMAC.");
    }
  }

  function onClearHmac() {
    setHmacInput("");
    setHmacSecret("");
    setHmacOut(null);
    setHmacError(null);
  }

  // Load a canonical sample and compute it. Compute against the literal sample
  // values since the corresponding state updates are async. Secret is loaded
  // into the field for demonstration only and never persisted.
  async function onSampleHmac() {
    const sampleMessage = "message";
    const sampleSecret = "secret";
    setHmacInput(sampleMessage);
    setHmacSecret(sampleSecret);
    setHmacError(null);
    try {
      const res = await hmac(hmacAlg, sampleSecret, sampleMessage);
      setHmacOut(res);
    } catch (e: any) {
      setHmacOut(null);
      setHmacError(e?.message || "Failed to compute HMAC.");
    }
  }

  function tsToLocal(ts?: number): string | null {
    if (ts == null || !Number.isFinite(ts)) return null;
    try {
      const d = new Date(ts * 1000);
      return `${d.toLocaleString()} (${d.toISOString()})`;
    } catch {
      return null;
    }
  }

  const taClass =
    "flex w-full rounded-none border-2 border-input bg-background px-3 py-2 font-mono text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";
  const selectClass =
    "h-9 rounded-none border-2 border-input bg-background px-3 py-1 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:border-ring";

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <Alert variant="warning">
        All operations run locally in your browser. Do not paste production secrets or private
        keys.
      </Alert>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="jwt">JWT</TabsTrigger>
          <TabsTrigger value="hash">Hash</TabsTrigger>
          <TabsTrigger value="hmac">HMAC</TabsTrigger>
        </TabsList>

        {/* JWT */}
        <TabsContent value="jwt">
          <ToolShell
            eyebrow="JWT decode / verify"
            toolbar={
              <>
                <Button variant="default" size="sm" onClick={onVerify} disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Verifying…
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={onSampleJwt}>
                  Sample
                </Button>
                <Button variant="outline" size="sm" onClick={onResetJwt}>
                  <Eraser className="size-4" aria-hidden="true" /> Reset
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Field
                  label="JWT token"
                  htmlFor="jwt-token"
                  hint="Decoding happens live as you type; signature verification is an explicit action."
                >
                  <textarea
                    id="jwt-token"
                    className={`${taClass} min-h-[160px] break-all`}
                    value={jwt}
                    onChange={(e) => setJwt(e.target.value)}
                    placeholder="Paste JWT (header.payload.signature)"
                  />
                </Field>

                <Field label="Secret (HS256)" htmlFor="jwt-secret">
                  <Input
                    id="jwt-secret"
                    className="font-mono"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Shared secret for HS256"
                  />
                </Field>

                <Field
                  label="Public key (RS256 / ES256)"
                  htmlFor="jwt-pubkey"
                  hint="SPKI PEM (-----BEGIN PUBLIC KEY-----) or JWK JSON (kty, n, e / crv, x, y)."
                >
                  <textarea
                    id="jwt-pubkey"
                    className={`${taClass} min-h-[120px] break-all`}
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="-----BEGIN PUBLIC KEY-----... or JWK JSON"
                  />
                </Field>

                {jwtError ? <Alert variant="error">{jwtError}</Alert> : null}

                {verifyState.checked ? (
                  verifyState.ok ? (
                    <Alert variant="success">
                      <span className="font-semibold">Verified</span>
                      {verifyState.note ? (
                        <div className="mt-1 text-xs opacity-90">{verifyState.note}</div>
                      ) : null}
                    </Alert>
                  ) : (
                    <Alert variant="error">
                      <span className="font-semibold">Invalid signature</span>
                      {/* expected/actual only exist for HS256 */}
                      {verifyState.expected != null && verifyState.actual != null ? (
                        <div className="mt-1 break-all font-mono text-xs">
                          expected: {verifyState.expected}
                          <br />
                          actual: {verifyState.actual}
                        </div>
                      ) : null}
                      {verifyState.note ? (
                        <div className="mt-1 text-xs opacity-90">{verifyState.note}</div>
                      ) : null}
                    </Alert>
                  )
                ) : null}
              </div>

              <div className="flex flex-col gap-4">
                <ResultPanel
                  title="Header"
                  copyValue={() => (header ? JSON.stringify(header, null, 2) : "")}
                  mono
                  bodyClassName="min-h-[120px]"
                >
                  {header ? JSON.stringify(header, null, 2) : "(awaiting valid token)"}
                </ResultPanel>

                <ResultPanel
                  title="Payload"
                  copyValue={() => (payload ? JSON.stringify(payload, null, 2) : "")}
                  mono
                  bodyClassName="min-h-[160px]"
                >
                  {payload ? JSON.stringify(payload, null, 2) : "(awaiting valid token)"}
                </ResultPanel>

                {payload ? (
                  <div className="border-2 border-border bg-card p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="brutal-label">Claims</span>
                      {(() => {
                        // Derive status purely from the already-decoded claims.
                        const nowSec = Date.now() / 1000;
                        const expired =
                          typeof payload.exp === "number" && nowSec > payload.exp;
                        const notYet =
                          typeof payload.nbf === "number" && nowSec < payload.nbf;
                        // Time-only status: derived solely from exp/nbf, NOT
                        // signature verification. Use a neutral color/label so a
                        // forged/unsigned token can't read as "good" — green is
                        // reserved for a verified signature.
                        const { label, cls } = expired
                          ? { label: "EXPIRED", cls: "text-destructive" }
                          : notYet
                            ? { label: "NOT YET VALID", cls: "text-rp-gold" }
                            : { label: "WITHIN VALIDITY WINDOW", cls: "text-muted-foreground" };
                        return (
                          <span
                            className={`border-2 border-border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${cls}`}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <ul className="list-disc space-y-1 pl-5 font-mono">
                      {typeof payload.exp === "number" ? (
                        <li>
                          exp: {payload.exp} {"->"} {tsToLocal(payload.exp) || "(invalid)"}
                          {relTime(payload.exp) ? (
                            <span className="ml-2 text-muted-foreground">
                              {Date.now() / 1000 > payload.exp ? "expired " : ""}
                              {relTime(payload.exp)}
                            </span>
                          ) : null}
                        </li>
                      ) : null}
                      {typeof payload.iat === "number" ? (
                        <li>
                          iat: {payload.iat} {"->"} {tsToLocal(payload.iat) || "(invalid)"}
                          {relTime(payload.iat) ? (
                            <span className="ml-2 text-muted-foreground">
                              {relTime(payload.iat)}
                            </span>
                          ) : null}
                        </li>
                      ) : null}
                      {typeof payload.nbf === "number" ? (
                        <li>
                          nbf: {payload.nbf} {"->"} {tsToLocal(payload.nbf) || "(invalid)"}
                          {relTime(payload.nbf) ? (
                            <span className="ml-2 text-muted-foreground">
                              {relTime(payload.nbf)}
                            </span>
                          ) : null}
                          {Date.now() / 1000 < payload.nbf ? (
                            <span className="ml-2 text-rp-gold">(not yet valid)</span>
                          ) : null}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  For RS256/ES256, paste the signer&apos;s public key (SPKI PEM or JWK) above, then
                  Verify. HS256 uses the shared secret instead.
                </p>
              </div>
            </div>
          </ToolShell>
        </TabsContent>

        {/* Hash */}
        <TabsContent value="hash">
          <ToolShell
            eyebrow="Digest"
            toolbar={
              <>
                <Button variant="default" size="sm" onClick={onHash}>
                  Compute
                </Button>
                <Button variant="outline" size="sm" onClick={onSampleHash}>
                  Sample
                </Button>
                <Button variant="outline" size="sm" onClick={onClearHash}>
                  <Eraser className="size-4" aria-hidden="true" /> Clear
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Field label="Input" htmlFor="hash-input">
                  <textarea
                    id="hash-input"
                    className={`${taClass} min-h-[160px]`}
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Text to hash"
                  />
                </Field>
                <Field label="Algorithm" htmlFor="hash-alg">
                  <select
                    id="hash-alg"
                    className={selectClass}
                    value={hashAlg}
                    onChange={(e) => setHashAlg(e.target.value as typeof hashAlg)}
                  >
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-512">SHA-512</option>
                  </select>
                </Field>
              </div>

              <div className="flex flex-col gap-4">
                {hashOut ? (
                  <>
                    <ResultPanel title="Hex" copyValue={hashOut.hex} mono>
                      {hashOut.hex}
                    </ResultPanel>
                    <ResultPanel title="Base64url" copyValue={hashOut.b64url} mono>
                      {hashOut.b64url}
                    </ResultPanel>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Compute a digest to see hex and base64url output.
                  </p>
                )}
              </div>
            </div>
          </ToolShell>
        </TabsContent>

        {/* HMAC */}
        <TabsContent value="hmac">
          <ToolShell
            eyebrow="HMAC"
            toolbar={
              <>
                <Button variant="default" size="sm" onClick={onHmac}>
                  Compute
                </Button>
                <Button variant="outline" size="sm" onClick={onSampleHmac}>
                  Sample
                </Button>
                <Button variant="outline" size="sm" onClick={onClearHmac}>
                  <Eraser className="size-4" aria-hidden="true" /> Clear
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Field label="Message" htmlFor="hmac-input">
                  <textarea
                    id="hmac-input"
                    className={`${taClass} min-h-[160px]`}
                    value={hmacInput}
                    onChange={(e) => setHmacInput(e.target.value)}
                    placeholder="Message"
                  />
                </Field>
                <Field label="Secret" htmlFor="hmac-secret">
                  <Input
                    id="hmac-secret"
                    className="font-mono"
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                  />
                </Field>
                <Field label="Algorithm" htmlFor="hmac-alg">
                  <select
                    id="hmac-alg"
                    className={selectClass}
                    value={hmacAlg}
                    onChange={(e) => setHmacAlg(e.target.value as typeof hmacAlg)}
                  >
                    <option value="SHA-256">HMAC-SHA-256</option>
                    <option value="SHA-512">HMAC-SHA-512</option>
                  </select>
                </Field>

                {hmacError ? <Alert variant="error">{hmacError}</Alert> : null}
              </div>

              <div className="flex flex-col gap-4">
                {hmacOut ? (
                  <>
                    <ResultPanel title="Hex" copyValue={hmacOut.hex} mono>
                      {hmacOut.hex}
                    </ResultPanel>
                    <ResultPanel title="Base64url" copyValue={hmacOut.b64url} mono>
                      {hmacOut.b64url}
                    </ResultPanel>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Compute an HMAC to see hex and base64url output.
                  </p>
                )}
              </div>
            </div>
          </ToolShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
