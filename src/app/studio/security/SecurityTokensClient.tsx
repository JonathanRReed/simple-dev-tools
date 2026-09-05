"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Eye, EyeOff, Loader2 } from "lucide-react";

import {
  base64ToBytes as libBase64ToBytes,
  bytesToArrayBuffer as libBytesToArrayBuffer,
  bytesToBase64url as libBytesToBase64url,
  te as libTe,
} from "@/lib/base64";
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

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
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
  return bytesToArrayBuffer(base64ToBytes(clean));
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
  const sig = bytesToArrayBuffer(base64urlToBytes(s));
  const key = await importPublicKeyForAlg("RS256", publicKeyText);
  const ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sig, data);
  return { ok } as { ok: boolean } & Record<string, string>;
}

async function verifyES256(jwt: string, publicKeyText: string) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT must have 3 parts" };
  const [h, p, s] = parts;
  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = bytesToArrayBuffer(base64urlToBytes(s));
  const key = await importPublicKeyForAlg("ES256", publicKeyText);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, key, sig, data);
  return { ok } as { ok: boolean } & Record<string, string>;
}

// --- JWT signing helpers ---
type JwtSignAlg = "HS256" | "RS256" | "ES256";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function importRsaPkcs8PrivateKey(pem: string): Promise<CryptoKey> {
  const clean = stripPem(pem);
  const keyData = libBytesToArrayBuffer(libBase64ToBytes(clean));
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
}

async function importEcPkcs8PrivateKey(pem: string): Promise<CryptoKey> {
  const clean = stripPem(pem);
  const keyData = libBytesToArrayBuffer(libBase64ToBytes(clean));
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function importRsaJwkPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
}

async function importEcJwkPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function importPrivateKeyForAlg(alg: JwtSignAlg, keyText: string): Promise<CryptoKey> {
  // Try JSON first
  try {
    const jwk = JSON.parse(keyText) as JsonWebKey;
    if (typeof jwk === "object" && jwk) {
      if (alg === "RS256") return importRsaJwkPrivateKey(jwk);
      if (alg === "ES256") return importEcJwkPrivateKey(jwk);
    }
  } catch {}
  // Fallback to PEM (PKCS#8)
  if (/BEGIN PRIVATE KEY/.test(keyText)) {
    if (alg === "RS256") return importRsaPkcs8PrivateKey(keyText);
    if (alg === "ES256") return importEcPkcs8PrivateKey(keyText);
  }
  throw new Error("Provide a valid private key as JWK JSON or PKCS#8 PEM (-----BEGIN PRIVATE KEY-----)");
}

async function signHS256(secret: string, data: string) {
  if (secret.length === 0) throw new Error("HMAC secret is required");
  const key = await crypto.subtle.importKey(
    "raw",
    libTe.encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, libTe.encode(data));
  const bytes = new Uint8Array(sig);
  return { b64url: libBytesToBase64url(bytes), size: bytes.byteLength };
}

async function signJWT(
  alg: JwtSignAlg,
  keyText: string,
  header: Record<string, unknown>,
  payload: Record<string, unknown>
) {
  const headerB64 = libBytesToBase64url(libTe.encode(JSON.stringify(header)));
  const payloadB64 = libBytesToBase64url(libTe.encode(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  let sigB64: string;
  let size: number;
  if (alg === "HS256") {
    const res = await signHS256(keyText, data);
    sigB64 = res.b64url;
    size = res.size;
  } else {
    const key = await importPrivateKeyForAlg(alg, keyText);
    const sigBuf = await crypto.subtle.sign(
      alg === "RS256"
        ? { name: "RSASSA-PKCS1-v1_5" }
        : { name: "ECDSA", hash: { name: "SHA-256" } },
      key,
      libTe.encode(data)
    );
    const sigBytes = new Uint8Array(sigBuf);
    sigB64 = libBytesToBase64url(sigBytes);
    size = sigBytes.byteLength;
  }
  return { jwt: `${data}.${sigB64}`, signatureSize: size };
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
function relTime(unixSeconds: number, nowSeconds: number | null): string | null {
  if (!Number.isFinite(unixSeconds) || nowSeconds === null) return null;
  const deltaSec = Math.round(unixSeconds - nowSeconds);
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
  const [tab, setTab] = useState<"jwt" | "hash" | "hmac" | "sign">("jwt");
  const [currentEpochSeconds, setCurrentEpochSeconds] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setCurrentEpochSeconds(Date.now() / 1000);
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

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

  // --- Sign & build state ---
  function getNowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  const [signHeader, setSignHeader] = useState<string>(() =>
    JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2)
  );
  const [signPayload, setSignPayload] = useState<string>(() => {
    const now = getNowSeconds();
    return JSON.stringify(
      {
        iss: "simple-dev-tools",
        sub: "user-123",
        iat: now,
        exp: now + 3600,
      },
      null,
      2
    );
  });
  const [signAlg, setSignAlg] = useState<JwtSignAlg>("HS256");
  const [signKey, setSignKey] = useState<string>("");
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signMeta, setSignMeta] = useState<{ signatureSize: number } | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const signHeaderObj = useMemo(() => {
    try {
      const v = JSON.parse(signHeader);
      return isPlainObject(v) ? v : null;
    } catch {
      return null;
    }
  }, [signHeader]);

  const signHeaderError = useMemo<string | null>(() => {
    try {
      const v = JSON.parse(signHeader);
      return isPlainObject(v) ? null : "Header must be a JSON object";
    } catch (e: any) {
      return e?.message || "Invalid header JSON";
    }
  }, [signHeader]);

  const signPayloadObj = useMemo(() => {
    try {
      const v = JSON.parse(signPayload);
      return isPlainObject(v) ? v : null;
    } catch {
      return null;
    }
  }, [signPayload]);

  const signPayloadError = useMemo<string | null>(() => {
    try {
      const v = JSON.parse(signPayload);
      return isPlainObject(v) ? null : "Payload must be a JSON object";
    } catch (e: any) {
      return e?.message || "Invalid payload JSON";
    }
  }, [signPayload]);

  // Clear stale output when inputs change.
  useEffect(() => {
    setSignResult(null);
    setSignMeta(null);
    setSignError(null);
  }, [signHeader, signPayload, signAlg, signKey]);

  function handleSignAlgChange(alg: JwtSignAlg) {
    setSignAlg(alg);
    try {
      const parsed = JSON.parse(signHeader);
      if (isPlainObject(parsed)) {
        setSignHeader(JSON.stringify({ ...parsed, alg }, null, 2));
      }
    } catch {}
  }

  function loadSignSample() {
    const now = getNowSeconds();
    setSignAlg("HS256");
    setSignHeader(JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2));
    setSignPayload(
      JSON.stringify(
        {
          iss: "simple-dev-tools",
          sub: "user-123",
          iat: now,
          exp: now + 3600,
        },
        null,
        2
      )
    );
    setSignKey("");
    setSignResult(null);
    setSignMeta(null);
    setSignError(null);
  }

  function onResetSign() {
    loadSignSample();
  }

  function onSampleSign() {
    loadSignSample();
  }

  function setSignClaim(key: "iat" | "exp", offset: number) {
    try {
      const parsed = JSON.parse(signPayload);
      if (isPlainObject(parsed)) {
        const next = { ...parsed, [key]: getNowSeconds() + offset };
        setSignPayload(JSON.stringify(next, null, 2));
        return;
      }
    } catch {}
    setSignError(`Could not set ${key}: payload must be a valid JSON object.`);
  }

  async function onSign() {
    setSignError(null);
    setSignResult(null);
    setSignMeta(null);

    if (!signHeaderObj || !signPayloadObj) {
      setSignError(
        `${!signHeaderObj ? "Header" : "Payload"} JSON is invalid. Fix the highlighted errors before signing.`
      );
      return;
    }

    if (signHeaderObj.alg !== undefined && signHeaderObj.alg !== signAlg) {
      setSignError(
        `Header alg is "${String(signHeaderObj.alg)}" but the selected algorithm is ${signAlg}. They must match.`
      );
      return;
    }

    const header = { ...signHeaderObj, alg: signAlg };
    const payload = signPayloadObj;

    if (signAlg === "HS256" && signKey.length === 0) {
      setSignError("A secret is required for HS256.");
      return;
    }

    setSigning(true);
    try {
      const res = await signJWT(signAlg, signKey, header, payload);
      setSignResult(res.jwt);
      setSignMeta({ signatureSize: res.signatureSize });
    } catch (e: any) {
      setSignError(e?.message || "Failed to sign JWT.");
    } finally {
      setSigning(false);
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
          <TabsTrigger value="sign">Sign & build</TabsTrigger>
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
                    type="password"
                    autoComplete="new-password"
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
                        const nowSec = currentEpochSeconds;
                        const expired =
                          nowSec !== null && typeof payload.exp === "number" && nowSec > payload.exp;
                        const notYet =
                          nowSec !== null && typeof payload.nbf === "number" && nowSec < payload.nbf;
                        // Time-only status: derived solely from exp/nbf, NOT
                        // signature verification. Use a neutral color/label so a
                        // forged/unsigned token can't read as "good" — green is
                        // reserved for a verified signature.
                        const { label, cls } = expired
                          ? { label: "EXPIRED", cls: "text-destructive" }
                          : notYet
                            ? { label: "NOT YET VALID", cls: "text-rp-gold" }
                            : nowSec === null
                              ? { label: "TIME CHECK PENDING", cls: "text-muted-foreground" }
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
                          {relTime(payload.exp, currentEpochSeconds) ? (
                            <span className="ml-2 text-muted-foreground">
                              {currentEpochSeconds !== null && currentEpochSeconds > payload.exp ? "expired " : ""}
                              {relTime(payload.exp, currentEpochSeconds)}
                            </span>
                          ) : null}
                        </li>
                      ) : null}
                      {typeof payload.iat === "number" ? (
                        <li>
                          iat: {payload.iat} {"->"} {tsToLocal(payload.iat) || "(invalid)"}
                          {relTime(payload.iat, currentEpochSeconds) ? (
                            <span className="ml-2 text-muted-foreground">
                              {relTime(payload.iat, currentEpochSeconds)}
                            </span>
                          ) : null}
                        </li>
                      ) : null}
                      {typeof payload.nbf === "number" ? (
                        <li>
                          nbf: {payload.nbf} {"->"} {tsToLocal(payload.nbf) || "(invalid)"}
                          {relTime(payload.nbf, currentEpochSeconds) ? (
                            <span className="ml-2 text-muted-foreground">
                              {relTime(payload.nbf, currentEpochSeconds)}
                            </span>
                          ) : null}
                          {currentEpochSeconds !== null && currentEpochSeconds < payload.nbf ? (
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

        {/* Sign & build */}
        <TabsContent value="sign">
          <ToolShell
            eyebrow="JWT sign / build"
            toolbar={
              <>
                <Button variant="default" size="sm" onClick={onSign} disabled={signing}>
                  {signing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Signing…
                    </>
                  ) : (
                    "Sign"
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={onSampleSign}>
                  Sample
                </Button>
                <Button variant="outline" size="sm" onClick={onResetSign}>
                  <Eraser className="size-4" aria-hidden="true" /> Reset
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Field
                  label="Header (JSON)"
                  htmlFor="sign-header"
                  hint='JSON object. The "alg" field is kept in sync with the algorithm select.'
                  error={signHeaderError}
                >
                  <textarea
                    id="sign-header"
                    className={`${taClass} min-h-[80px] break-all`}
                    value={signHeader}
                    onChange={(e) => setSignHeader(e.target.value)}
                    placeholder='{"alg":"HS256","typ":"JWT"}'
                  />
                </Field>

                <Field
                  label="Payload (JSON)"
                  htmlFor="sign-payload"
                  hint="JSON object. Use the claim helpers below to set iat and exp."
                  error={signPayloadError}
                >
                  <textarea
                    id="sign-payload"
                    className={`${taClass} min-h-[160px] break-all`}
                    value={signPayload}
                    onChange={(e) => setSignPayload(e.target.value)}
                    placeholder='{"sub":"..."}'
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="brutal-label text-[10px]">Claims</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSignClaim("iat", 0)}
                  >
                    iat = now
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSignClaim("exp", 3600)}
                  >
                    exp = now + 1h
                  </Button>
                </div>

                <Field label="Algorithm" htmlFor="sign-alg">
                  <select
                    id="sign-alg"
                    className={selectClass}
                    value={signAlg}
                    onChange={(e) => handleSignAlgChange(e.target.value as JwtSignAlg)}
                  >
                    <option value="HS256">HS256</option>
                    <option value="RS256">RS256</option>
                    <option value="ES256">ES256</option>
                  </select>
                </Field>

                {signAlg === "HS256" ? (
                  <Field
                    label="Secret (HS256)"
                    htmlFor="sign-key"
                    hint="A strong shared secret (at least 256 bits recommended)."
                  >
                    <div className="flex gap-2">
                      <Input
                        id="sign-key"
                        type={showSecret ? "text" : "password"}
                        autoComplete="new-password"
                        className="font-mono"
                        value={signKey}
                        onChange={(e) => setSignKey(e.target.value)}
                        placeholder="Shared secret for HS256"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSecret((s) => !s)}
                        aria-label={showSecret ? "Hide secret" : "Show secret"}
                        title={showSecret ? "Hide secret" : "Show secret"}
                      >
                        {showSecret ? (
                          <EyeOff className="size-4" aria-hidden="true" />
                        ) : (
                          <Eye className="size-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </Field>
                ) : (
                  <Field
                    label={`Private key (${signAlg})`}
                    htmlFor="sign-key"
                    hint="PKCS#8 PEM (-----BEGIN PRIVATE KEY-----) or private JWK JSON."
                  >
                    <textarea
                      id="sign-key"
                      className={`${taClass} min-h-[160px] break-all`}
                      value={signKey}
                      onChange={(e) => setSignKey(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="-----BEGIN PRIVATE KEY-----..."
                    />
                  </Field>
                )}

                {signError ? <Alert variant="error">{signError}</Alert> : null}
              </div>

              <div className="flex flex-col gap-4">
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                  {signResult
                    ? `JWT signed. Signature is ${signMeta?.signatureSize ?? 0} bytes.`
                    : signError
                      ? `Sign error: ${signError}`
                      : ""}
                </div>

                {signResult ? (
                  <>
                    <Alert variant="success">
                      <span className="font-semibold">Signed</span> — JWT ready below.
                    </Alert>
                    <ResultPanel
                      title="Signed JWT"
                      copyValue={signResult}
                      mono
                      bodyClassName="min-h-[120px] break-all"
                    >
                      {signResult}
                    </ResultPanel>
                    <div className="border-2 border-border bg-card p-3 text-xs">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="brutal-label">Signature</span>
                        <span className="font-mono">{signMeta?.signatureSize ?? 0} bytes</span>
                      </div>
                      {signAlg === "HS256" ? (
                        <p className="text-muted-foreground">
                          HS256 secrets should be strong (at least 256 bits) and should never be
                          stored or transmitted alongside the token.
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Build a header and payload, choose a key, then Sign to produce a compact JWT.
                  </p>
                )}
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
                    type="password"
                    autoComplete="new-password"
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
