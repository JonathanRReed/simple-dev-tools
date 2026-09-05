import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import ToolPage from "@/components/layout/ToolPage";
import { siteConfig, toolPages } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Local Browser Developer Tools",
  description:
    "Simple Dev Tools is a browser-only toolkit by Jonathan R. Reed and Hello.World Consulting for practical developer workflows.",
  alternates: {
    canonical: "/about/",
  },
};

export default function AboutPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <PageHeader eyebrow="About" title="Practical browser tools for everyday development work.">
          <p>
            {siteConfig.name} is built by {siteConfig.author.name} at {siteConfig.provider.name}.
            The toolkit focuses on small, reliable workflows that engineers need while debugging,
            documenting, testing, or checking implementation details.
          </p>
        </PageHeader>

        <PageSection title="How it works">
          <p>
            The {toolPages.length} tools run in the browser and avoid account setup, backend
            storage, or analytics scripts. Each workspace is designed for quick local work, clear
            copy and export actions, and transparent limits where a browser API or local runtime is
            involved.
          </p>
          <p>
            That local-first shape matters for developer utilities. Regex samples, snippets,
            tokens, schema drafts, SQL experiments, and diagram text can include sensitive
            implementation details. Simple Dev Tools keeps those workflows close to the browser so
            you can inspect or transform data without sending it through a hosted analysis
            service.
          </p>
        </PageSection>

        <PageSection title="Who maintains it">
          <p>
            Jonathan R. Reed builds AI, cybersecurity, and developer productivity products through
            Hello.World Consulting. You can review related work on the{" "}
            <a href={`${siteConfig.author.url}/projects/`}>project index</a>.
          </p>
          <p>
            The project is maintained as a practical companion to consulting and product
            engineering work: small tools, predictable behavior, clear outputs, and no forced
            account layer for tasks that should stay fast.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
