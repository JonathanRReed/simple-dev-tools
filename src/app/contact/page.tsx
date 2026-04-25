import type { Metadata } from "next";
import Link from "next/link";

import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Hello.World Consulting or Jonathan R Reed about Simple Dev Tools, feedback, consulting, or related developer tooling.",
  alternates: {
    canonical: "/contact/",
  },
};

export default function ContactPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Contact
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Send feedback or start a tooling conversation.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            For consulting, product questions, or feedback about Simple Dev Tools,
            use the official Hello.World Consulting site or Jonathan R Reed&apos;s
            project profile.
          </p>
          <p className="text-base leading-7 text-muted-foreground">
            Useful reports include the tool name, browser, input type, expected
            output, and whether the issue affects copying, exporting, validation,
            or rendering. Please avoid sending private tokens, production secrets,
            or customer data in a first message.
          </p>
          <p className="text-base leading-7 text-muted-foreground">
            Reports about the Mermaid diagram generator, regex debugger, API
            snippet generator, SQLite playground, schema studio, or token tools
            are easiest to act on when they include a small reproducible sample.
            A short example usually works better than a screenshot alone.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href={siteConfig.provider.url}
            className="rounded-xl border border-border/60 bg-card/60 p-5 transition hover:border-primary/60 hover:bg-primary/10"
          >
            <span className="block text-sm text-muted-foreground">
              Consulting
            </span>
            <span className="mt-2 block font-semibold text-primary">
              {siteConfig.provider.name}
            </span>
          </Link>
          <Link
            href={siteConfig.author.url}
            className="rounded-xl border border-border/60 bg-card/60 p-5 transition hover:border-primary/60 hover:bg-primary/10"
          >
            <span className="block text-sm text-muted-foreground">
              Portfolio
            </span>
            <span className="mt-2 block font-semibold text-primary">
              {siteConfig.author.name}
            </span>
          </Link>
        </section>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-xl font-semibold text-foreground">
            What to send
          </h2>
          <p className="leading-7 text-muted-foreground">
            For consulting, describe the current workflow, the system you are
            trying to build, and the risk or delivery problem you want solved.
            For product feedback, describe the browser-only tool you used and the
            exact output that felt wrong or incomplete.
          </p>
          <p className="leading-7 text-muted-foreground">
            If the request is about a private codebase, send the shape of the
            problem first instead of pasting confidential source code. The first
            pass only needs the goal, the failing workflow, and the kind of
            output you expected from the tool.
          </p>
        </section>
      </article>
    </ToolPage>
  );
}
