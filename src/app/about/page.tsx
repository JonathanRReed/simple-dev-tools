import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import ToolPage from "@/components/layout/ToolPage";
import { siteConfig, toolPages } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Simple Dev Tools is a set of browser developer tools built by Jonathan R. Reed at Hello.World Consulting.",
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
            I made {siteConfig.name} because I got tired of pasting JSON, tokens, and SQL into
            random websites covered in ads just to format or decode something.
          </p>
        </PageHeader>

        <PageSection title="How it works">
          <p>
            All {toolPages.length} tools run right in your browser. There aren&apos;t any accounts,
            and nothing you type gets sent to a backend. Stuff like regex tests, tokens, schemas,
            SQL, and diagrams usually has real project details in it. It makes way more sense for
            all of that to stay on your own machine.
          </p>
        </PageSection>

        <PageSection title="Who makes it">
          <p>
            I&apos;m {siteConfig.author.name}. Most of my work at {siteConfig.provider.name} is
            around AI, security, and developer tools. You can see my other stuff on the{" "}
            <a href={`${siteConfig.author.url}/projects/`}>projects page</a>.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
