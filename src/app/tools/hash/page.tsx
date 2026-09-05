import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import HashClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "File Hash Checker",
  description:
    "Hash text or files with SHA-1, SHA-256, SHA-384, and SHA-512 using the browser's Web Crypto API, and verify a digest against an expected value. Nothing is uploaded.",
  alternates: {
    canonical: "/tools/hash/",
  },
};

export default function HashPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/tools/hash/">
        <p>
          Paste text or drop a file to compute SHA-1, SHA-256, SHA-384, and SHA-512 digests
          locally. Then paste an expected hash to verify it.
        </p>
        <p>
          Everything happens in your browser with the Web Crypto API. No file contents or hashes
          are uploaded.
        </p>
      </ToolPageHeader>
      <HashClientOnly />
      <ToolNotes title="Privacy &amp; notes">
        <ul>
          <li>
            Hashing uses <code>crypto.subtle.digest</code> in your browser. Files and text stay on
            this page.
          </li>
          <li>
            The verify field is case-insensitive and ignores spaces. It matches against any of the
            four computed digests.
          </li>
          <li>SHA-1 is provided for compatibility; prefer SHA-256 or higher for new work.</li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
