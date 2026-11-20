import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import ToolPage from "@/components/layout/ToolPage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Simple Dev Tools handles your input, local storage, and network requests.",
  alternates: {
    canonical: "/privacy/",
  },
};

export default function PrivacyPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-3xl">
      <article className="flex flex-col gap-8">
        <PageHeader title="Privacy">
          <p>
            {siteConfig.name} is just a static site. There aren&apos;t any logins or user accounts,
            and there is no backend saving what you paste in.
          </p>
        </PageHeader>

        <PageSection title="What you paste">
          <p>
            Everything you put into the tools stays in your browser. A few of them rely on normal
            browser APIs like Web Crypto, clipboard copy, or file downloads, all on your own
            device.
          </p>
          <p>
            Some tools keep your last input in local storage so a page refresh doesn&apos;t wipe
            your work. Hit Reset inside the tool to clear it out.
          </p>
          <p>
            Pasting into the home page box or search bar hands your text over using this tab&apos;s
            session storage. The tool clears it right when it opens, so nothing gets put into a URL
            or your browser history.
          </p>
        </PageSection>

        <PageSection title="Network requests">
          <p>
            The SQLite playground loads its SQL.js WebAssembly file directly from this site instead
            of a third party CDN. Schema &amp; Types Studio only fetches a remote file if you
            actually paste a URL and tell it to. Cloudflare Web Analytics may run on the host for
            basic visit counts. Even with everything running locally, I wouldn&apos;t paste real
            production secrets or private keys into any web tool.
          </p>
        </PageSection>
      </article>
    </ToolPage>
  );
}
