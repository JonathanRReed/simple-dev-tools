import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Security & Tokens",
  description:
    "Decode and verify JWTs (HS256/RS256/ES256), compute hashes, and generate HMACs using Web Crypto — no secrets leave the browser.",
};

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
