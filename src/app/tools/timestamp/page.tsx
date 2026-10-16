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
          milliseconds is auto-detected, or you can choose the unit.
        </p>
        <p>
          Everything is computed locally. Nothing leaves your browser, and your last input is
          remembered between visits.
        </p>
      </ToolPageHeader>
      <TimestampClientOnly />
      <ToolNotes title="How detection works">
        <p>
          Signed numbers and decimal values are accepted as Unix epochs. Auto-detect reads
          13-digit values or magnitudes above <code>1e11</code> as milliseconds; other
          numbers are seconds. Choose a unit explicitly for ambiguous values near 1970.
          Date strings are accepted in Auto-detect mode; include a time zone to avoid
          differences between browsers and locations.
        </p>
      </ToolNotes>
    </ToolPage>
  );
}
