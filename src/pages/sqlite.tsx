import dynamic from "next/dynamic";

const SQLitePlayground = dynamic(() => import("../components/SQLitePlayground"), { ssr: false });

export default function SQLitePage() {
  return <SQLitePlayground />;
}
