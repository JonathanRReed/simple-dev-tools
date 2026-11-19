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
        <PageHeader title="About">
          <p>
            {siteConfig.name} is built by {siteConfig.author.name} at {siteConfig.provider.name}.
          </p>
        </PageHeader>

        <PageSection title="How it works">
          <p>
            The {toolPages.length} tools run in the browser, with no account and no backend
            storage. Regex samples, tokens, schema drafts, SQL, and diagram text often contain
            implementation details, so they are handled on your machine instead of being sent to
            a hosted service.
          </p>
        </PageSection>

        <PageSection title="Who maintains it">
          <p>
            Jonathan R. Reed builds AI, cybersecurity, and developer productivity products through
            Hello.World Consulting. You can review related work on the{" "}
            <a href={`${siteConfig.author.url}/projects/`}>project index</a>.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
