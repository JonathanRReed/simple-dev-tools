import type { Metadata } from "next";
import Link from "next/link";

import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Simple Dev Tools is a browser-only toolkit by Jonathan R Reed and Hello.World Consulting for practical developer workflows.",
  alternates: {
    canonical: "/about/",
  },
};

export default function AboutPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            About
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Practical browser tools for everyday development work.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {siteConfig.name} is built by {siteConfig.author.name} at{" "}
            {siteConfig.provider.name}. The toolkit focuses on small, reliable
            workflows that engineers need while debugging, documenting, testing,
            or checking implementation details.
          </p>
        </header>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-xl font-semibold text-foreground">How it works</h2>
          <p className="leading-7 text-muted-foreground">
            The tools run in the browser and avoid account setup, backend storage,
            or analytics scripts. Each workspace is designed for quick local work,
            clear copy and export actions, and transparent limits where a browser
            API or local runtime is involved.
          </p>
          <p className="leading-7 text-muted-foreground">
            That local-first shape matters for developer utilities. Regex samples,
            snippets, tokens, schema drafts, SQL experiments, and diagram text can
            include sensitive implementation details. Simple Dev Tools keeps those
            workflows close to the browser so you can inspect or transform data
            without sending it through a hosted analysis service.
          </p>
        </section>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-xl font-semibold text-foreground">Who maintains it</h2>
          <p className="leading-7 text-muted-foreground">
            Jonathan R Reed builds AI, cybersecurity, and developer productivity
            products through Hello.World Consulting. You can review related work
            on the{" "}
            <Link
              href={`${siteConfig.author.url}/projects/`}
              className="font-medium text-primary hover:underline"
            >
              project archive
            </Link>
            .
          </p>
          <p className="leading-7 text-muted-foreground">
            The project is maintained as a practical companion to consulting and
            product engineering work: small tools, predictable behavior, clear
            outputs, and no forced account layer for tasks that should stay fast.
          </p>
        </section>
      </article>
    </ToolPage>
  );
}
