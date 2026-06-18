import ToolPage from "@/components/layout/ToolPage";
import SecurityTokensClientOnly from "./ClientOnly";

export default function SecurityTokensPage() {
  return (
    <ToolPage contentClassName="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Security &amp; Tokens
        </h1>
        <p className="text-muted-foreground">
          Decode and verify JWTs (HS256/RS256/ES256), compute hashes, and generate HMACs using
          Web Crypto. No secrets leave the browser.
        </p>
      </header>
      <SecurityTokensClientOnly />
    </ToolPage>
  );
}
