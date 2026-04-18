import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
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
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Privacy
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Local-first tools with no account layer.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {siteConfig.name} is a static browser application. It does not provide
            authentication, database-backed accounts, analytics tracking, or a
            server-side store for tool input.
          </p>
        </header>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-xl font-semibold text-foreground">Tool input</h2>
          <p className="leading-7 text-muted-foreground">
            Text, tokens, schemas, SQL, regex patterns, and QR payloads are handled
            in your browser. Some tools use browser APIs such as Web Crypto,
            clipboard, file download, or local runtime libraries to complete the
            selected action.
          </p>
        </section>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-xl font-semibold text-foreground">External resources</h2>
          <p className="leading-7 text-muted-foreground">
            The SQLite playground loads SQL.js resources from a public CDN so the
            WebAssembly runtime can initialize in the browser. Do not paste
            production secrets, private keys, or regulated data into any developer
            utility.
          </p>
        </section>
      </article>
    </ToolPage>
  );
}
