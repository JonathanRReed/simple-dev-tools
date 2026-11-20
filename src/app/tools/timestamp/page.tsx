import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import TimestampClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Timestamp Converter",
  description:
    "Convert Unix epochs, ISO 8601 dates, and time zones with relative time, auto detecting seconds vs milliseconds.",
  alternates: {
    canonical: "/tools/timestamp/",
  },
};

export default function TimestampPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/timestamp/" />
      <TimestampClientOnly />
      <ToolNotes title="How detection works">
        <p>
          Signed numbers and decimals both work as Unix epochs. Auto detect reads 13 digit numbers
          or anything past <code>1e11</code> as milliseconds, and treats smaller numbers as
          seconds. Pick a unit manually for dates right around 1970. Date strings work in Auto
          detect too, just include a time zone so different browsers don&apos;t guess differently.
        </p>
        <p>Your last input stays in this browser until you hit Reset.</p>
      </ToolNotes>
      <FamilyTools href="/tools/timestamp/" />
    </ToolPage>
  );
}
