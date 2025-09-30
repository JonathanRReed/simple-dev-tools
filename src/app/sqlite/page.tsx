import dynamic from "next/dynamic";

import ToolLoading from "@/components/ToolLoading";
import ToolPage from "@/components/layout/ToolPage";

const SQLiteClient = dynamic(() => import("./SQLiteClient"), {
  ssr: false,
  loading: () => (
    <ToolLoading message="Loading SQLite playground…" />
  ),
});

export default function SQLitePage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl">
      <SQLiteClient />
    </ToolPage>
  );
}
