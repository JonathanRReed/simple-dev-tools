import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import HashClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "File Hash Checker",
  description:
    "Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes for text or dropped files using Web Crypto and verify checksums.",
  alternates: {
    canonical: "/tools/hash/",
  },
};

export default function HashPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/hash/" />
      <HashClientOnly />
      <ToolNotes title="Privacy &amp; notes">
        <ul>
          <li>
            Hashing runs through <code>crypto.subtle.digest</code> right in your browser, so your
            files never leave your machine.
          </li>
          <li>
            The verify box ignores spaces and capitalization, and checks against all four hashes at
            once.
          </li>
          <li>
            SHA-1 is only here for checking older checksums. Pick SHA-256 or higher for anything
            new.
          </li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/tools/hash/" />
    </ToolPage>
  );
}
