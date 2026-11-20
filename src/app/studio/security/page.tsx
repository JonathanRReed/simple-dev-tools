import type { Metadata } from "next";

import ToolPage from "@/components/layout/ToolPage";
import ToolNotes from "@/components/tool/ToolNotes";
import FamilyTools from "@/components/tool/FamilyTools";
import ToolPageHeader from "@/components/tool/ToolPageHeader";
import SecurityTokensClientOnly from "./ClientOnly";

export const metadata: Metadata = {
  title: "Security & Tokens",
  description:
    "Decode and verify HS256, RS256, and ES256 JWTs, sign tokens, hash text, and run HMACs with Web Crypto.",
  alternates: {
    canonical: "/studio/security/",
  },
};

export default function SecurityTokensPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <ToolPageHeader href="/studio/security/" />
      <SecurityTokensClientOnly />
      <ToolNotes title="Privacy &amp; notes">
        <ul>
          <li>
            Signing, verification, hashing, and HMAC all run through{" "}
            <code>crypto.subtle</code> in your browser.
          </li>
          <li>
            Decoding a JWT only reads the text inside it. Always verify the signature with the
            right key before trusting any claims.
          </li>
          <li>Use test keys here and keep real production secrets in your secret manager.</li>
        </ul>
      </ToolNotes>
      <FamilyTools href="/studio/security/" />
    </ToolPage>
  );
}
