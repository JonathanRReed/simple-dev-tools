import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Simple Dev Tools Support",
  description:
    "Contact Hello.World Consulting or Jonathan R. Reed about Simple Dev Tools, feedback, consulting, or related developer tooling.",
  alternates: {
    canonical: "/contact/",
  },
};

const contactCards = [
  { label: "Consulting", name: siteConfig.provider.name, href: siteConfig.provider.url },
  { label: "Portfolio", name: siteConfig.author.name, href: siteConfig.author.url },
] as const;

export default function ContactPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <PageHeader eyebrow="Contact" title="Send feedback or start a tooling conversation.">
          <p>
            For consulting, product questions, or feedback about Simple Dev Tools, use the
            official Hello.World Consulting site or Jonathan R. Reed&apos;s project profile.
          </p>
          <p>
            Useful reports include the tool name, browser, input type, expected output, and
            whether the issue affects copying, exporting, validation, or rendering. Please avoid
            sending private tokens, production secrets, or customer data in a first message.
          </p>
          <p>
            Reports about the Mermaid diagram generator, regex debugger, API snippet generator,
            SQLite playground, schema studio, or token tools are easiest to act on when they
            include a small reproducible sample. A short example usually works better than a
            screenshot alone.
          </p>
        </PageHeader>

        <section aria-label="Contact links" className="grid gap-4 sm:grid-cols-2">
          {contactCards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-3 border-2 border-border bg-card p-5 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none"
            >
              <span className="flex min-w-0 flex-col gap-2">
                <span className="brutal-label">{card.label}</span>
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  {card.name}
                </span>
              </span>
              <ArrowUpRight
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </a>
          ))}
        </section>

        <PageSection title="What to send">
          <p>
            For consulting, describe the current workflow, the system you are trying to build,
            and the risk or delivery problem you want solved. For product feedback, describe the
            browser-only tool you used and the exact output that felt wrong or incomplete.
          </p>
          <p>
            If the request is about a private codebase, send the shape of the problem first
            instead of pasting confidential source code. The first pass only needs the goal, the
            failing workflow, and the kind of output you expected from the tool.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
