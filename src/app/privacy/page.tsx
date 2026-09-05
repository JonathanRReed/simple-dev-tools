import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy for Local Browser Tools",
  description:
    "Simple Dev Tools uses a local-first privacy model. Tool inputs run in the browser and are not stored by this static site.",
  alternates: {
    canonical: "/privacy/",
  },
};

export default function PrivacyPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <PageHeader eyebrow="Privacy" title="Local-first tools with no account layer.">
          <p>
            {siteConfig.name} is a static browser application. It does not provide
            authentication, database-backed accounts, analytics tracking, or a server-side store
            for tool input.
          </p>
        </PageHeader>

        <PageSection title="Tool input">
          <p>
            Text, tokens, schemas, SQL, regex patterns, and QR payloads are handled in your
            browser. Some tools use browser APIs such as Web Crypto, clipboard, file download, or
            local runtime libraries to complete the selected action.
          </p>
          <p>
            A few tools remember your last input in this browser&apos;s local storage so it
            survives a reload. Use the tool&apos;s Reset action to clear it.
          </p>
        </PageSection>

        <PageSection title="External resources">
          <p>
            The SQLite playground loads its SQL.js WebAssembly runtime from this site&apos;s own
            origin (vendored, no third-party request). The schema studio can optionally fetch a
            spec from a URL you paste, and the host may enable Cloudflare&apos;s privacy-preserving
            Web Analytics for aggregate traffic totals. Do not paste production secrets, private
            keys, or regulated data into any developer utility.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
