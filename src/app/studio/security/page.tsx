"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Loader2 } from "lucide-react";

import ToolPage from "@/components/layout/ToolPage";
import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
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

export default function SecurityTokens() {
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
      if (gen === verifyGen.current) setVerifying(false);
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

  // HMAC state
  const [hmacInput, setHmacInput] = useState<string>("message");
  const [hmacSecret, setHmacSecret] = useState<string>("secret");
  const [hmacAlg, setHmacAlg] = useState<"SHA-256" | "SHA-512">("SHA-256");
  const [hmacOut, setHmacOut] = useState<{ hex: string; b64url: string } | null>(null);

  // Clear stale output when the message, secret, or algorithm changes.
  useEffect(() => {
    setHmacOut(null);
  }, [hmacInput, hmacSecret, hmacAlg]);

  async function onHmac() {
    const res = await hmac(hmacAlg, hmacSecret, hmacInput);
    setHmacOut(res);
  }

  function onClearHmac() {
    setHmacInput("");
    setHmacSecret("");
    setHmacOut(null);
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
    <ToolPage contentClassName="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 text-foreground">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Security &amp; Tokens</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Decode and verify JWTs (HS256/RS256/ES256), compute hashes, and generate HMACs using
            Web Crypto. No secrets leave the browser.
          </p>
        </div>

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
                      <div className="brutal-label mb-2">Claims</div>
                      <ul className="list-disc space-y-1 pl-5 font-mono">
                        {typeof payload.exp === "number" ? (
                          <li>
                            exp: {payload.exp} {"->"} {tsToLocal(payload.exp) || "(invalid)"}
                            {Date.now() / 1000 > payload.exp ? (
                              <span className="ml-2 text-destructive">(expired)</span>
                            ) : null}
                          </li>
                        ) : null}
                        {typeof payload.iat === "number" ? (
                          <li>
                            iat: {payload.iat} {"->"} {tsToLocal(payload.iat) || "(invalid)"}
                          </li>
                        ) : null}
                        {typeof payload.nbf === "number" ? (
                          <li>
                            nbf: {payload.nbf} {"->"} {tsToLocal(payload.nbf) || "(invalid)"}
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
    </ToolPage>
  );
}
