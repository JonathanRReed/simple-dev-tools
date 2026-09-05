import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
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
      <ToolPageHeader href="/tools/timestamp/">
        <p>
          Paste a Unix epoch or any parseable date string and read it back as seconds,
          milliseconds, ISO 8601, UTC, your local zone, and relative time. Seconds vs.
          milliseconds is auto-detected.
        </p>
        <p>
          Everything is computed locally. Nothing leaves your browser, and your last input is
          remembered between visits.
        </p>
      </ToolPageHeader>
      <TimestampClientOnly />
      <ToolNotes title="How detection works">
        <p>
          All-digit input is treated as a Unix epoch. Values at or below <code>1e11</code> are
          read as seconds, larger values as milliseconds, so both <code>1700000000</code> and{" "}
          <code>1700000000000</code> resolve to the same moment. Anything else is parsed as a
          date string (ISO 8601, RFC 2822, and other formats your browser understands).
        </p>
      </ToolNotes>
    </ToolPage>
  );
}
