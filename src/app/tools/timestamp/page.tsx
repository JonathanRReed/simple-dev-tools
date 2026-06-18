import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import TimestampClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Timestamp Converter",
  description:
    "Convert Unix epochs, ISO 8601, and time zones, with relative time. Auto-detects seconds vs. milliseconds and runs entirely in your browser.",
  alternates: {
    canonical: "/tools/timestamp/",
  },
};

export default function TimestampPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Timestamp Converter
        </h1>
        <p className="text-muted-foreground">
          Paste a Unix epoch or any parseable date string and read it back as
          seconds, milliseconds, ISO 8601, UTC, your local zone, and relative
          time. Seconds vs. milliseconds is auto-detected.
        </p>
        <p className="text-muted-foreground">
          Everything is computed locally — nothing leaves your browser, and your
          last input is remembered between visits.
        </p>
      </header>
      <TimestampClientOnly />
      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">How detection works</h2>
        <p>
          All-digit input is treated as a Unix epoch. Values at or below{" "}
          <code className="font-mono">1e11</code> are read as seconds, larger
          values as milliseconds — so both <code className="font-mono">1700000000</code>{" "}
          and <code className="font-mono">1700000000000</code> resolve to the
          same moment. Anything else is parsed as a date string (ISO 8601,
          RFC 2822, and other formats your browser understands).
        </p>
      </section>
    </ToolPage>
  );
}
