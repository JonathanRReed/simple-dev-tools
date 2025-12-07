import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Schema & Types Studio",
  description:
    "Parse JSON/YAML or OpenAPI specs, preview documentation, validate data, and generate TypeScript or Zod types entirely in-browser.",
};

export default function SchemaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
