import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
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
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          File Hash Checker
        </h1>
        <p className="text-muted-foreground">
          Paste text or drop a file to compute SHA-1, SHA-256, SHA-384, and
          SHA-512 digests locally. Then paste an expected hash to verify it.
        </p>
        <p className="text-muted-foreground">
          Everything happens in your browser with the Web Crypto API. No file
          contents or hashes are uploaded.
        </p>
      </header>

      <HashClientOnly />

      <section className="border-2 border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="brutal-label mb-2 text-foreground">Privacy &amp; notes</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Hashing uses <code className="font-mono">crypto.subtle.digest</code>{" "}
            in your browser. Files and text stay on this page.
          </li>
          <li>
            The verify field is case-insensitive and ignores spaces. It matches
            against any of the four computed digests.
          </li>
          <li>
            SHA-1 is provided for compatibility; prefer SHA-256 or higher for new
            work.
          </li>
        </ul>
      </section>
    </ToolPage>
  );
}
