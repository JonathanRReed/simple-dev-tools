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
      </article>
    </ToolPage>
  );
}
