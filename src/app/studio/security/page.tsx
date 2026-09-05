import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SecurityTokensClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Security & Tokens",
  description:
    "Decode and verify JWTs (HS256/RS256/ES256), sign new tokens, compute hashes, and generate HMACs with Web Crypto. No secrets leave the browser.",
  alternates: {
    canonical: "/studio/security/",
  },
};

export default function SecurityTokensPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/studio/security/">
        <p>
          Decode and verify JWTs (HS256/RS256/ES256), compute hashes, and generate HMACs using
          Web Crypto. No secrets leave the browser.
        </p>
      </ToolPageHeader>
      <SecurityTokensClientOnly />
      <ToolNotes title="Privacy &amp; notes">
        <ul>
          <li>
            Signing, verification, hashing, and HMAC all run through{" "}
            <code>crypto.subtle</code> in your browser. Keys and tokens are never uploaded.
          </li>
          <li>
            Decoding a JWT does not prove it is valid. Verify the signature against the issuing
            key before trusting any claim.
          </li>
          <li>Prefer pasting test keys here; keep production secrets in your secret manager.</li>
        </ul>
      </ToolNotes>
    </ToolPage>
  );
}
