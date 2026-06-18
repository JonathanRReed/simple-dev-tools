"use client";
import React, { useEffect, useMemo, useState } from "react";
import cronstrue from "cronstrue";
import { ulid } from "ulid";
import { CronExpressionParser } from "cron-parser";
import { RefreshCw } from "lucide-react";

import ToolShell from "@/components/tool/ToolShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ResultPanel } from "@/components/ui/result-panel";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Crockford's Base32 used by ULID (no I, L, O, U)
const CROCK32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCK32_MAP: Record<string, number> = Object.fromEntries(
  CROCK32.split("").map((c, i) => [c, i])
);

// Maximum value representable by a ULID's 48-bit timestamp.
const MAX_ULID_TIMESTAMP = 0xffffffffffff; // 281474976710655

const ULID_RE = new RegExp(`^[${CROCK32}]{26}$`, "i");
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CryptoLike = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
  randomUUID?: () => string;
};

/**
 * Decode the 48-bit timestamp embedded in a ULID. Validates length, character
 * set (Crockford base32, case-insensitive) and that the decoded timestamp does
 * not overflow 48 bits — instead of silently reporting a wrong result.
 */
function decodeUlidTimestamp(u: string): number {
  const value = u.trim();
  if (value.length !== 26) {
    throw new Error("A ULID must be exactly 26 characters.");
  }
  if (!ULID_RE.test(value)) {
    throw new Error("ULID contains characters outside Crockford base32.");
  }
  const t = value.slice(0, 10).toUpperCase();
  let ms = 0;
  for (const ch of t) {
    const v = CROCK32_MAP[ch];
    if (v === undefined) throw new Error(`Invalid ULID char: ${ch}`);
    ms = ms * 32 + v;
  }
  if (ms > MAX_ULID_TIMESTAMP) {
    throw new Error("ULID timestamp overflows 48 bits.");
  }
  return ms; // milliseconds since epoch
}

function randomUUIDv4() {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (c && "randomUUID" in c && typeof c.randomUUID === "function")
    return c.randomUUID();
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

/** Human-readable variant from the UUID's variant nibble (RFC 4122 §4.1.1). */
function uuidVariant(value: string): string {
  // The variant is the high bits of the first nibble of the 4th group.
  const nibble = parseInt(value.replace(/-/g, "").charAt(16), 16);
  if (Number.isNaN(nibble)) return "Unknown";
  if ((nibble & 0b1000) === 0) return "NCS (reserved)";
  if ((nibble & 0b1100) === 0b1000) return "RFC 4122";
  if ((nibble & 0b1110) === 0b1100) return "Microsoft (reserved)";
  return "Future (reserved)";
}

type GenKind = "uuid" | "ulid";

const LS_EXPR = "sdt:ids-cron:expr";
const LS_TAB = "sdt:ids-cron:tab";
const DEFAULT_CRON = "*/5 * * * *";

/** Resolved IANA timezone label for the browser (e.g. "America/New_York"). */
function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}

export default function IDsCronTool() {
  const [tab, setTab] = useState<"ids" | "cron">("ids");

  // IDs tab state
  const [uuid, setUuid] = useState<string>("");
  const [ulidValue, setUlidValue] = useState<string>("");

  // Bulk generation state
  const [bulkKind, setBulkKind] = useState<GenKind>("uuid");
  // Stored as a raw string so the field can be cleared while editing; the value
  // is parsed and clamped to 1..50 only at generate time.
  const [bulkCount, setBulkCount] = useState<string>("10");
  const [bulkOutput, setBulkOutput] = useState<string>("");
  // The kind actually generated (so the result title doesn't relabel when the
  // dropdown changes before regenerating).
  const [bulkGenKind, setBulkGenKind] = useState<GenKind>("uuid");

  useEffect(() => {
    setUuid(randomUUIDv4());
    setUlidValue(ulid());
  }, []);

  // Hydrate the last-used cron expression and active tab from localStorage.
  // Guarded for static export; defaults stay if anything is missing/throws.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedExpr = window.localStorage.getItem(LS_EXPR);
      if (savedExpr) setCron(savedExpr);
      const savedTab = window.localStorage.getItem(LS_TAB);
      if (savedTab === "ids" || savedTab === "cron") setTab(savedTab);
    } catch {
      // ignore unavailable/blocked storage
    }
  }, []);

  const uuidInfo = useMemo(() => {
    const value = uuid.trim();
    if (!value) return { ok: false as const, error: "Enter a UUID to inspect." };
    if (!UUID_RE.test(value)) {
      return { ok: false as const, error: "Not a valid UUID (expected 8-4-4-4-12 hex)." };
    }
    const version = parseInt(value.replace(/-/g, "").charAt(12), 16);
    return {
      ok: true as const,
      version: Number.isNaN(version) ? "?" : String(version),
      variant: uuidVariant(value),
    };
  }, [uuid]);

  const ulidInfo = useMemo(() => {
    try {
      if (!ulidValue) return { ok: false as const, error: "Enter a ULID to inspect." };
      const ms = decodeUlidTimestamp(ulidValue);
      const date = new Date(ms);
      const tsPart = ulidValue.slice(0, 10);
      const randPart = ulidValue.slice(10);
      return { ok: true as const, ms, iso: date.toISOString(), tsPart, randPart };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid ULID";
      return { ok: false as const, error: message };
    }
  }, [ulidValue]);

  // Surface the 1..50 clamp before generating: flag NaN/out-of-range input so
  // the field shows why the count will be adjusted.
  const bulkCountNum = Number(bulkCount);
  const bulkCountValid =
    bulkCount.trim() !== "" &&
    Number.isFinite(bulkCountNum) &&
    bulkCountNum >= 1 &&
    bulkCountNum <= 50;

  function generateBulk() {
    const n = Math.max(1, Math.min(50, Math.floor(Number(bulkCount)) || 1));
    const lines: string[] = [];
    for (let i = 0; i < n; i++) {
      lines.push(bulkKind === "uuid" ? randomUUIDv4() : ulid());
    }
    setBulkOutput(lines.join("\n"));
    setBulkGenKind(bulkKind);
  }

  // Cron tab state
  const [cron, setCron] = useState<string>(DEFAULT_CRON);
  const cronDesc = useMemo(() => {
    try {
      return { ok: true as const, text: cronstrue.toString(cron, { use24HourTimeFormat: true }) };
    } catch (e) {
      // cronstrue throws a plain string (e.g. "Error: cron expression is empty"),
      // not an Error instance, so handle string throws and strip the prefix.
      const message =
        typeof e === "string"
          ? e.replace(/^Error:\s*/, "")
          : e instanceof Error
          ? e.message
          : "Invalid cron";
      return { ok: false as const, error: message };
    }
  }, [cron]);

  const cronRuns = useMemo(() => {
    try {
      // Interpret the schedule in UTC so the listed times match both the "(UTC)"
      // label and the timezone-agnostic description above.
      const it = CronExpressionParser.parse(cron, { tz: "UTC" });
      const out: string[] = [];
      // Same occurrences rendered in the browser's local timezone for quick
      // "when does this fire for me" reference.
      const local: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = it.next().toDate();
        out.push(d.toISOString().replace(".000Z", "Z"));
        local.push(d.toLocaleString(undefined, { hour12: false }));
      }
      return { ok: true as const, runs: out, localRuns: local };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid cron";
      return { ok: false as const, error: message };
    }
  }, [cron]);

  // Resolved lazily on first render; falls back to "Local" during SSR/static
  // export (or if Intl is unavailable) so the title never disagrees with the
  // already-local times after hydration.
  const [localZone] = useState<string>(() =>
    typeof window === "undefined" ? "Local" : localTimeZone()
  );

  // Persist the cron expression and active tab (settings only, never secrets).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_EXPR, cron);
    } catch {
      // ignore unavailable/blocked storage
    }
  }, [cron]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_TAB, tab);
    } catch {
      // ignore unavailable/blocked storage
    }
  }, [tab]);

  // The description (cronstrue) and the schedule (cron-parser) are independent
  // parsers; treat the expression as valid only when BOTH agree so the two
  // panels never contradict each other.
  const cronValid = cronDesc.ok && cronRuns.ok;
  const cronError = !cronRuns.ok
    ? (cronRuns as { error: string }).error
    : !cronDesc.ok
    ? (cronDesc as { error: string }).error
    : null;

  const presets = [
    { label: "Every minute", expr: "* * * * *" },
    { label: "Every 5 min", expr: "*/5 * * * *" },
    { label: "Every 15 min", expr: "*/15 * * * *" },
    { label: "Every 30 min", expr: "*/30 * * * *" },
    { label: "Hourly", expr: "0 * * * *" },
    { label: "Daily at 09:00", expr: "0 9 * * *" },
    { label: "Twice daily", expr: "0 0,12 * * *" },
    { label: "Weekdays 09:00", expr: "0 9 * * 1-5" },
    { label: "Mon 09:00", expr: "0 9 * * 1" },
    { label: "Every Sunday", expr: "0 0 * * 0" },
    { label: "First of month", expr: "0 0 1 * *" },
  ];
  const activePreset = presets.find((p) => p.expr === cron.trim());

  return (
    <ToolShell eyebrow="IDs & Scheduling">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ids" | "cron")}>
        <TabsList>
          <TabsTrigger value="ids">IDs</TabsTrigger>
          <TabsTrigger value="cron">Cron</TabsTrigger>
        </TabsList>

        {/* IDs tab */}
        <TabsContent value="ids">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* UUID */}
              <div className="flex flex-col gap-3">
                <Field
                  label="UUID v4"
                  htmlFor="uuid-input"
                  error={uuidInfo.ok ? undefined : uuidInfo.error}
                  action={
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setUuid(randomUUIDv4())}
                      >
                        <RefreshCw className="size-4" aria-hidden="true" /> New
                      </Button>
                      <CopyButton value={() => uuid} disabled={!uuid} />
                    </>
                  }
                >
                  <Input
                    id="uuid-input"
                    className="font-mono"
                    value={uuid}
                    onChange={(e) => setUuid(e.target.value.trim())}
                    aria-invalid={!uuidInfo.ok}
                    spellCheck={false}
                  />
                </Field>
                {uuidInfo.ok ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Version {uuidInfo.version}</Badge>
                    <Badge variant="outline">{uuidInfo.variant}</Badge>
                  </div>
                ) : null}
              </div>

              {/* ULID */}
              <div className="flex flex-col gap-3">
                <Field
                  label="ULID"
                  htmlFor="ulid-input"
                  action={
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setUlidValue(ulid())}
                      >
                        <RefreshCw className="size-4" aria-hidden="true" /> New
                      </Button>
                      <CopyButton value={() => ulidValue} disabled={!ulidValue} />
                    </>
                  }
                >
                  <Input
                    id="ulid-input"
                    className="font-mono"
                    value={ulidValue}
                    onChange={(e) => setUlidValue(e.target.value.trim())}
                    placeholder="01HZX..."
                    aria-invalid={!ulidInfo.ok}
                    spellCheck={false}
                  />
                </Field>
                {ulidInfo.ok ? (
                  <ResultPanel title="ULID parts">
                    <dl className="space-y-1 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <dt className="text-muted-foreground">Timestamp part</dt>
                        <dd className="font-mono">{ulidInfo.tsPart}</dd>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <dt className="text-muted-foreground">Random part</dt>
                        <dd className="break-all font-mono">{ulidInfo.randPart}</dd>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <dt className="text-muted-foreground">Epoch ms</dt>
                        <dd className="font-mono">{ulidInfo.ms}</dd>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <dt className="text-muted-foreground">ISO time</dt>
                        <dd className="font-mono">{ulidInfo.iso}</dd>
                      </div>
                    </dl>
                  </ResultPanel>
                ) : (
                  <Alert variant="error">{ulidInfo.error}</Alert>
                )}
              </div>
            </div>

            {/* Bulk generation */}
            <div className="flex flex-col gap-3 border-t-2 border-border pt-6">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Bulk type" htmlFor="bulk-kind" className="w-40">
                  <select
                    id="bulk-kind"
                    className="flex h-9 w-full rounded-none border-2 border-input bg-background px-3 py-1 font-mono text-sm transition-colors focus-visible:border-ring focus-visible:outline-none"
                    value={bulkKind}
                    onChange={(e) => setBulkKind(e.target.value as GenKind)}
                  >
                    <option value="uuid">UUID v4</option>
                    <option value="ulid">ULID</option>
                  </select>
                </Field>
                <Field
                  label="Count (1-50)"
                  htmlFor="bulk-count"
                  className="w-32"
                  error={bulkCountValid ? undefined : "Clamped to 1-50."}
                >
                  <Input
                    id="bulk-count"
                    type="number"
                    min={1}
                    max={50}
                    className="font-mono"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    aria-invalid={!bulkCountValid}
                  />
                </Field>
                <Button type="button" onClick={generateBulk}>
                  Generate
                </Button>
              </div>
              {bulkOutput ? (
                <ResultPanel
                  title={`${bulkOutput.split("\n").length} ${bulkGenKind.toUpperCase()}`}
                  copyValue={() => bulkOutput}
                  scroll
                  mono
                >
                  {bulkOutput}
                </ResultPanel>
              ) : null}
            </div>
          </div>
        </TabsContent>

        {/* Cron tab */}
        <TabsContent value="cron">
          <div className="flex w-full flex-col gap-4">
            <Field
              label="Cron expression"
              htmlFor="cron-input"
              action={<CopyButton value={() => cron} disabled={!cron} />}
            >
              <Input
                id="cron-input"
                className="font-mono"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="*/5 * * * *"
                aria-invalid={!cronValid}
                spellCheck={false}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <Label>Presets</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Button
                    key={p.expr}
                    type="button"
                    size="sm"
                    variant={activePreset?.expr === p.expr ? "default" : "outline"}
                    aria-pressed={activePreset?.expr === p.expr}
                    onClick={() => setCron(p.expr)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {cronValid && cronDesc.ok && cronRuns.ok ? (
              <>
                <ResultPanel title="Description">
                  <p className="text-sm">{cronDesc.text}</p>
                </ResultPanel>
                <ResultPanel
                  title="Next 5 runs (UTC)"
                  copyValue={() => cronRuns.runs.join("\n")}
                  mono
                >
                  {cronRuns.runs.join("\n")}
                </ResultPanel>
                <ResultPanel
                  title={`Next 5 runs (${localZone})`}
                  copyValue={() => cronRuns.localRuns.join("\n")}
                  mono
                >
                  {cronRuns.localRuns.join("\n")}
                </ResultPanel>
              </>
            ) : (
              <Alert variant="error">{cronError ?? "Invalid cron expression"}</Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </ToolShell>
  );
}
