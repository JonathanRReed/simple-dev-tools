import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Schema & Types Studio",
};

export default function SchemaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
