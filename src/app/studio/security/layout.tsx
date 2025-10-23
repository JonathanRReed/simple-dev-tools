import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Security & Tokens",
};

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
