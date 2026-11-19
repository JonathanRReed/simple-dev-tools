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
        <PageHeader title="Contact">
          <p>
            For consulting, product questions, or feedback about Simple Dev Tools, use the
            official Hello.World Consulting site or Jonathan R. Reed&apos;s project profile.
          </p>
        </PageHeader>

        <section aria-label="Contact links" className="grid gap-4 sm:grid-cols-2">
          {contactCards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-3 border border-border bg-card p-5 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none rounded-lg"
            >
              <span className="flex min-w-0 flex-col gap-2">
                <span className="ui-label">{card.label}</span>
                <span className="font-display text-lg text-foreground">
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
            For a bug, include the tool name, your browser, the kind of input, and the output you
            expected. A small sample that reproduces it works better than a screenshot.
          </p>
          <p>
            Please don&apos;t send private tokens, production secrets, customer data, or
            confidential source code. Describe the shape of the problem first.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
