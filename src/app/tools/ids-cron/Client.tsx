"use client";
import React, { useEffect, useMemo, useState } from "react";
import cronstrue from "cronstrue";
import { ulid } from "ulid";
import ToolPage from "@/components/layout/ToolPage";

// Crockford's Base32 used by ULID (no I, L, O, U)
const CROCK32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCK32_MAP: Record<string, number> = Object.fromEntries(
  CROCK32.split("").map((c, i) => [c, i])
);

type CryptoLike = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
  randomUUID?: () => string;
};

function decodeUlidTimestamp(u: string) {
  const t = u.slice(0, 10).toUpperCase();
  let ms = 0;
  for (const ch of t) {
    const v = CROCK32_MAP[ch];
    if (v === undefined) throw new Error(`Invalid ULID char: ${ch}`);
    ms = ms * 32 + v;
  }
  return ms; // milliseconds since epoch
}

function randomUUIDv4() {
  const c = (globalThis as any).crypto as CryptoLike | undefined;
  if (c && "randomUUID" in c) return c.randomUUID!();
  if (c && "getRandomValues" in c) {
    // Fallback (RFC4122 v4) using getRandomValues
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    );
  }
  // Non-crypto fallback (not secure). For environments without Web Crypto.
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function IDsCronTool() {
  const [tab, setTab] = useState<"ids" | "cron">("ids");

  // IDs tab state
  const [uuid, setUuid] = useState<string>("");
  const [ulidValue, setUlidValue] = useState<string>("");

  useEffect(() => {
    setUuid(randomUUIDv4());
    setUlidValue(ulid());
  }, []);

  const ulidInfo = useMemo(() => {
    try {
      if (!ulidValue) return { ok: false as const, error: "Enter a ULID to inspect." };
      const ms = decodeUlidTimestamp(ulidValue);
      const date = new Date(ms);
      const tsPart = ulidValue.slice(0, 10);
      const randPart = ulidValue.slice(10);
      return { ok: true as const, ms, iso: date.toISOString(), tsPart, randPart };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Invalid ULID" };
    }
  }, [ulidValue]);

  // Cron tab state
  const [cron, setCron] = useState<string>("*/5 * * * *");
  const cronDesc = useMemo(() => {
    try {
      return { ok: true as const, text: cronstrue.toString(cron, { use24HourTimeFormat: true }) };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Invalid cron" };
    }
  }, [cron]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Optional: toast could be added later
    } catch {}
  }

  const presets = [
    { label: "Every minute", expr: "* * * * *" },
    { label: "Every 5 minutes", expr: "*/5 * * * *" },
    { label: "Hourly", expr: "0 * * * *" },
    { label: "Daily at 09:00", expr: "0 9 * * *" },
    { label: "Mon 09:00", expr: "0 9 * * 1" },
  ];

  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <div
        className="bg-rp-surface/80 rounded-3xl shadow-2xl px-6 md:px-8 py-8 flex flex-col gap-6 border border-rp-highlight-high"
        style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-rp-iris drop-shadow">IDs & Scheduling</h2>
          <p className="text-sm text-rp-subtle max-w-3xl">Generate UUIDv4 and ULID identifiers, then humanize cron expressions using cRonstrue — all running locally.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { k: "ids", label: "IDs" },
            { k: "cron", label: "Cron" },
          ].map((t) => (
            <button
              key={t.k}
              className={`px-4 py-2 rounded-xl border transition-colors ${
                tab === (t.k as any)
                  ? "border-rp-iris text-rp-text bg-rp-overlay/80"
                  : "border-rp-highlight-high text-rp-subtle bg-rp-surface/40"
              }`}
              onClick={() => setTab(t.k as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* IDs tab */}
        {tab === "ids" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* UUID */}
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">UUID v4</h3>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                />
                <button
                  className="px-3 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80"
                  onClick={() => setUuid(randomUUIDv4())}
                >
                  New
                </button>
                <button
                  className="px-3 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80"
                  onClick={() => uuid && copy(uuid)}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* ULID */}
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">ULID</h3>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                  value={ulidValue}
                  onChange={(e) => setUlidValue(e.target.value.trim())}
                  placeholder="01HZX..."
                />
                <button
                  className="px-3 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80"
                  onClick={() => setUlidValue(ulid())}
                >
                  New
                </button>
                <button
                  className="px-3 py-2 rounded-xl border border-rp-iris text-rp-text bg-rp-overlay/80"
                  onClick={() => ulidValue && copy(ulidValue)}
                >
                  Copy
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-rp-highlight-high p-3 bg-rp-overlay/60 text-sm">
                {ulidInfo.ok ? (
                  <div className="space-y-1 text-rp-text">
                    <div>
                      <span className="text-rp-subtle">Timestamp part</span>: <span className="font-mono">{ulidInfo.tsPart}</span>
                    </div>
                    <div>
                      <span className="text-rp-subtle">Random part</span>: <span className="font-mono break-all">{ulidInfo.randPart}</span>
                    </div>
                    <div>
                      <span className="text-rp-subtle">Epoch ms</span>: <span className="font-mono">{ulidInfo.ms}</span>
                    </div>
                    <div>
                      <span className="text-rp-subtle">ISO time</span>: <span className="font-mono">{ulidInfo.iso}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-rp-love">{ulidInfo.error}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cron tab */}
        {tab === "cron" && (
          <div className="w-full grid grid-cols-1 gap-4">
            <div>
              <h3 className="text-rp-iris font-semibold mb-2">Cron Expression</h3>
              <input
                className="w-full rounded-xl px-4 py-2 bg-rp-surface/70 border border-rp-highlight-high text-rp-text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="*/5 * * * *"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.expr}
                    className="px-3 py-1.5 rounded-xl border border-rp-highlight-high text-rp-text bg-rp-overlay/60 text-sm"
                    onClick={() => setCron(p.expr)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-rp-highlight-high bg-rp-overlay/70 p-3">
              {cronDesc.ok ? (
                <div className="text-rp-text">{cronDesc.text}</div>
              ) : (
                <div className="text-rp-love">{cronDesc.error}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
