import dynamic from "next/dynamic";
import type { Metadata } from "next";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

export const metadata: Metadata = {
  title: "SQLite Playground",
};

const SQLiteClient = dynamic(() => import("./SQLiteClient"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading SQLite playground…" />
  ),
});

export default function SQLitePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          SQLite Playground
        </h1>
        <p className="text-muted-foreground">
          Run SQL experiments locally in your browser using SQLite WASM. Edit queries, execute, and inspect results without any backend.
        </p>
      </header>
      <SQLiteClient />
    </ToolPage>
  );
}
