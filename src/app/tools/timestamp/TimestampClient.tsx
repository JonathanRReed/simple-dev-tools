"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock, RotateCcw, Sparkles } from "lucide-react";

import type { ToolShortcut } from "@/components/KeyboardShortcuts";
import ToolShell from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { copyToClipboard } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";
import { ResultPanel } from "@/components/ui/result-panel";
import { readShareParams } from "@/lib/share";
import { useHotkey } from "@/hooks/use-hotkey";
import { parseMoment, type TimestampUnit, type Detection } from "@/lib/timestamp";
import { useStoredState } from "@/hooks/use-stored-state";

/** localStorage key for the last input string. Settings/input only — never
 *  secrets. Guarded for static export (typeof window + try/catch). */
const STORAGE_KEY = "sdt:timestamp:input";

/** A fixed, unambiguous example used by the "Sample" button. */
const SAMPLE_INPUT = "2024-03-14T15:09:26.535Z";

// Intl formatters are expensive to construct; build the relative-time one
// once per page (lazily, so SSR and non-Intl runtimes never touch it).
let cachedRelativeTimeFormatter: Intl.RelativeTimeFormat | null = null;
function relativeTimeFormatter(): Intl.RelativeTimeFormat {
  cachedRelativeTimeFormatter ??= new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return cachedRelativeTimeFormatter;
}

/** Resolve the browser's IANA zone label, guarded for odd runtimes. */
function resolvedZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch {
    return "local";
  }
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "year", ms: 31_536_000_000 },
  { unit: "month", ms: 2_592_000_000 },
  { unit: "day", ms: 86_400_000 },
  { unit: "hour", ms: 3_600_000 },
  { unit: "minute", ms: 60_000 },
  { unit: "second", ms: 1_000 },
];

/** When a rounded value reaches the next-larger unit's count, promote to it so
 *  we never render "in 24 hours" / "in 30 days" / "in 12 months". */
const PROMOTION_THRESHOLD: Partial<
  Record<Intl.RelativeTimeFormatUnit, number>
> = {
  hour: 24,
  day: 30,
  month: 12,
};

/**
 * Pure relative-time helper: "3 hours ago" / "in 2 days", with
 * second/minute/hour/day/month/year granularity. `now` is injected so the
 * result stays deterministic for a given render.
 */
function relativeTime(target: number, now: number): string {
  const diff = target - now; // positive => future
  const abs = Math.abs(diff);
  if (abs < 1_000) return "just now";

  for (let i = 0; i < RELATIVE_UNITS.length; i++) {
    const { unit, ms } = RELATIVE_UNITS[i];
    if (abs >= ms) {
      let value = Math.round(diff / ms);
      let chosenUnit = unit;
      // If rounding pushed us to (or past) the next-larger unit's count, promote
      // so we read "in 1 day" instead of "in 24 hours", etc.
      const threshold = PROMOTION_THRESHOLD[unit];
      if (i > 0 && threshold !== undefined && Math.abs(value) >= threshold) {
        const larger = RELATIVE_UNITS[i - 1];
        value = Math.round(diff / larger.ms);
        chosenUnit = larger.unit;
      }
      try {
        return relativeTimeFormatter().format(value, chosenUnit);
      } catch {
        // Fallback if Intl.RelativeTimeFormat is unavailable.
        const n = Math.abs(value);
        const label = `${n} ${chosenUnit}${n === 1 ? "" : "s"}`;
        return diff < 0 ? `${label} ago` : `in ${label}`;
      }
    }
  }
  return "just now";
}

/** Fallback zones when Intl.supportedValuesOf is unavailable. */
const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function supportedZones(): string[] {
  try {
    const fn = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => string[];
      }
    ).supportedValuesOf;
    if (typeof fn === "function") {
      const zones = fn("timeZone");
      if (Array.isArray(zones) && zones.length > 0) return ["UTC", ...zones.filter(zone => zone !== "UTC")];
    }
  } catch {
    /* fall through */
  }
  return FALLBACK_ZONES;
}

/** Format a moment in a specific IANA zone, guarded against bad zone ids. */
function formatInZone(date: Date, timeZone: string): string {
  try {
    return date.toLocaleString(undefined, {
      timeZone,
      hour12: false,
      dateStyle: "medium",
      timeStyle: "long",
    });
  } catch {
    return "Unavailable";
  }
}

const DETECTION_LABEL: Record<Detection, string> = {
  seconds: "Unix · seconds",
  milliseconds: "Unix · milliseconds",
  string: "Date string",
};

export default function TimestampClient() {
  const [input, setInput, clearInput] = useStoredState(STORAGE_KEY, "");
  const [storedUnit, setUnit, clearUnit] = useStoredState("sdt:timestamp:unit", "auto");
  const unit: TimestampUnit = storedUnit === "seconds" || storedUnit === "milliseconds" ? storedUnit : "auto";
  // A monotonically-updated clock so relative time stays fresh while idle.
  const [now, setNow] = useState<number>(() => Date.now());

  const zones = useMemo(() => supportedZones(), []);
  const localZone = useMemo(() => resolvedZone(), []);
  const [zone, setZone] = useState<string>("UTC");
  const [zoneManuallyChanged, setZoneManuallyChanged] = useState(false);

  // Hydrate the last input + default the converter zone to the local one.
  // URL hash share state takes precedence over localStorage (hydrated by useStoredState).
  useEffect(() => {
    const params = readShareParams();
    if (params) {
      if (["auto", "seconds", "milliseconds"].includes(params.unit)) setUnit(params.unit);
      if (typeof params.v === "string") setInput(params.v);
      if (
        typeof params.tz === "string" &&
        params.tz !== "" &&
        zones.includes(params.tz)
      ) {
        setZone(params.tz);
        setZoneManuallyChanged(true);
        return;
      }
    }
    const lz = resolvedZone();
    if (lz && lz !== "local" && zones.includes(lz)) setZone(lz);
  }, [setInput, setUnit, zones]);

  // The timezone list is ~420 entries from Intl.supportedValuesOf. Build the
  // <option> elements once: they are otherwise reconciled on every tick below.
  const zoneOptions = useMemo(
    () => zones.map((z) => (<option key={z} value={z}>{z}</option>)),
    [zones]
  );

  // Tick once a second so "x seconds/minutes ago" advances on its own — but
  // only while there is something whose relative time is on screen. Previously
  // this ran unconditionally, re-rendering the whole tool once a second even
  // with an empty input and nothing displayed.
  const needsTick = input.trim().length > 0;
  useEffect(() => {
    if (!needsTick) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [needsTick]);

  const parsed = useMemo(() => parseMoment(input, unit), [input, unit]);
  const hasInput = input.trim().length > 0;
  const showError = hasInput && !parsed.ok;

  const fields = useMemo(() => {
    if (!parsed.ok) return null;
    const ms = parsed.date.getTime();
    return {
      detected: parsed.detected,
      seconds: String(ms / 1000),
      milliseconds: String(ms),
      iso: parsed.date.toISOString(),
      utc: parsed.date.toUTCString(),
      local: parsed.date.toLocaleString(undefined, { hour12: false }),
      relative: relativeTime(ms, now),
      inZone: formatInZone(parsed.date, zone),
    };
  }, [parsed, now, zone]);

  const setNowMoment = () => {
    setUnit("seconds");
    setInput(String(Math.floor(Date.now() / 1000)));
  };

  const loadSample = () => {
    setUnit("auto");
    setInput(SAMPLE_INPUT);
  };

  const reset = () => {
    clearInput();
    clearUnit();
  };

  const handleZoneChange = (next: string) => {
    setZone(next);
    setZoneManuallyChanged(true);
  };

  const shareParams = () => {
    const value = input.trim();
    if (!value) return null;
    const params: Record<string, string> = { v: value, unit };
    if (zoneManuallyChanged) params.tz = zone;
    return params;
  };

  const shortcuts: ToolShortcut[] = useMemo(
    () => [{ keys: "⌘ ↵", description: "Copy converted result" }],
    []
  );

  useHotkey(
    "mod+enter",
    (event) => {
      if (fields?.iso) {
        event.preventDefault();
        void copyToClipboard(fields.iso);
      }
    },
    { allowInInput: true }
  );

  const toolbar = (
    <>
      <Button variant="default" size="sm" onClick={setNowMoment}>
        <Clock aria-hidden="true" />
        Now
      </Button>
      <Button variant="secondary" size="sm" onClick={loadSample}>
        <Sparkles aria-hidden="true" />
        Sample
      </Button>
      <Button variant="outline" size="sm" onClick={reset} disabled={!hasInput}>
        <RotateCcw aria-hidden="true" />
        Reset
      </Button>
    </>
  );

  return (
    <ToolShell
      eyebrow="Timestamp · local"
      toolbar={toolbar}
      shareParams={shareParams}
      shortcuts={shortcuts}
    >
      <div className="flex flex-col gap-6">
        <Field label="Input unit" htmlFor="timestamp-unit">
          <select id="timestamp-unit" value={unit} onChange={event => setUnit(event.target.value)} className="h-10 w-full border-2 border-input bg-background px-3 text-sm">
            <option value="auto">Auto-detect / date string</option>
            <option value="seconds">Unix seconds</option>
            <option value="milliseconds">Unix milliseconds</option>
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Choose a unit for dates near 1970, where the numeric value is ambiguous.</p>
        </Field>
        <Field
          label="Moment"
          htmlFor="timestamp-input"
          hint={
            <span id="timestamp-hint">
              Unix epoch (seconds or ms) or any parseable date string: ISO 8601,
              RFC 2822, etc.
            </span>
          }
          action={
            fields ? (
              <Badge variant="outline">{DETECTION_LABEL[fields.detected]}</Badge>
            ) : null
          }
        >
          <Input
            id="timestamp-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1700000000  ·  2024-03-14T15:09:26Z  ·  Mar 14 2024"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="font-mono"
            aria-invalid={showError}
            aria-describedby={
              showError ? "timestamp-hint timestamp-error" : "timestamp-hint"
            }
          />
        </Field>

        {showError ? (
          <Alert variant="error" id="timestamp-error">
            Could not parse <span className="font-mono">{input.trim()}</span> as a
            Unix epoch or date. Try a 10/13-digit epoch or an ISO 8601 string.
          </Alert>
        ) : null}

        {fields ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultPanel title="Unix · seconds" copyValue={fields.seconds}>
              <span className="font-mono text-sm break-all">{fields.seconds}</span>
            </ResultPanel>
            <ResultPanel title="Unix · milliseconds" copyValue={fields.milliseconds}>
              <span className="font-mono text-sm break-all">
                {fields.milliseconds}
              </span>
            </ResultPanel>
            <ResultPanel title="ISO 8601 · UTC" copyValue={fields.iso}>
              <span className="font-mono text-sm break-all">{fields.iso}</span>
            </ResultPanel>
            <ResultPanel title="UTC string" copyValue={fields.utc}>
              <span className="font-mono text-sm break-all">{fields.utc}</span>
            </ResultPanel>
            <ResultPanel
              title={`Local · ${localZone}`}
              copyValue={fields.local}
            >
              <span className="font-mono text-sm break-all">{fields.local}</span>
            </ResultPanel>
            <ResultPanel title="Relative" copyValue={fields.relative}>
              <span className="font-mono text-sm break-all">
                {fields.relative}
              </span>
            </ResultPanel>
          </div>
        ) : !hasInput ? (
          <Alert variant="info">
            Enter a moment above, or hit <span className="font-mono">Now</span> /{" "}
            <span className="font-mono">Sample</span> to see every representation.
          </Alert>
        ) : null}

        {fields ? (
          <div className="flex flex-col gap-3 border-t-2 border-border pt-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timestamp-zone">Convert to time zone</Label>
              <select
                id="timestamp-zone"
                value={zone}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="flex h-9 w-full rounded-none border-2 border-input bg-background px-3 py-1 font-mono text-sm transition-colors focus-visible:border-ring focus-visible:outline-none"
              >
                {zoneOptions}
              </select>
            </div>
            <ResultPanel title={`In ${zone}`} copyValue={fields.inZone}>
              <span className="font-mono text-sm break-all">{fields.inZone}</span>
            </ResultPanel>
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
