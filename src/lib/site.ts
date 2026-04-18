export const siteConfig = {
  name: "Simple Dev Tools",
  shortName: "Simple-Dev-Tools",
  url: "https://dev-tools.helloworldfirm.com",
  description:
    "Browser-only developer tools by Jonathan R Reed for API snippets, diagrams, SQLite, regex, IDs, QR codes, schemas, and security tokens.",
  author: {
    name: "Jonathan R Reed",
    url: "https://jonathanrreed.com",
    handle: "@jonathanrreed",
  },
  provider: {
    name: "Hello.World Consulting",
    url: "https://helloworldfirm.com",
  },
  keywords: [
    "developer tools",
    "browser developer tools",
    "API snippet generator",
    "mermaid editor",
    "SQLite playground",
    "regex tester",
    "JSON schema validator",
    "JWT decoder",
    "QR code generator",
    "ULID generator",
    "cron expression helper",
  ],
} as const;

export type ToolIcon =
  | "braces"
  | "calendarClock"
  | "code"
  | "database"
  | "qr"
  | "searchCode"
  | "shield"
  | "workflow";

export type ToolPageInfo = {
  title: string;
  href: string;
  description: string;
  icon: ToolIcon;
  tags: readonly string[];
};

export const toolGroups = [
  {
    title: "Developer accelerators",
    description: "Fast local utilities for everyday implementation work.",
    tools: [
      {
        title: "API Snippet Generator",
        href: "/api-snippet/",
        description: "Draft cURL, Python, and fetch snippets from one endpoint definition.",
        icon: "code",
        tags: ["REST", "Swagger", "Docs"],
      },
      {
        title: "Mermaid Editor",
        href: "/mermaid/",
        description: "Sketch flows, sequence diagrams, and architecture notes with export tools.",
        icon: "workflow",
        tags: ["Diagrams", "Planning"],
      },
      {
        title: "SQLite Playground",
        href: "/sqlite/",
        description: "Run SQL experiments locally with SQLite WASM and instant result tables.",
        icon: "database",
        tags: ["SQL", "Data"],
      },
      {
        title: "Regex Lab",
        href: "/tools/regex/",
        description: "Iterate on patterns with live matches, replacements, samples, and links.",
        icon: "searchCode",
        tags: ["Regex", "Testing"],
      },
      {
        title: "IDs & Scheduling",
        href: "/tools/ids-cron/",
        description: "Generate UUIDs and ULIDs, inspect ULID time, and explain cron schedules.",
        icon: "calendarClock",
        tags: ["Scheduling", "Automation"],
      },
      {
        title: "Encoders & QR",
        href: "/tools/encode-qr/",
        description: "Encode payloads, decode Base64 and URLs, and export QR assets.",
        icon: "qr",
        tags: ["Encoding", "Utilities"],
      },
    ],
  },
  {
    title: "Studios",
    description: "Deeper workspaces for schema and security tasks.",
    tools: [
      {
        title: "Schema & Types Studio",
        href: "/studio/schema/",
        description: "Parse JSON, YAML, and OpenAPI, validate data, and generate TypeScript or Zod.",
        icon: "braces",
        tags: ["Types", "Validation"],
      },
      {
        title: "Security & Tokens",
        href: "/studio/security/",
        description: "Decode JWTs, verify signatures, compute hashes, and generate HMACs locally.",
        icon: "shield",
        tags: ["Security", "Identity"],
      },
    ],
  },
] as const satisfies readonly {
  title: string;
  description: string;
  tools: readonly ToolPageInfo[];
}[];

export const toolPages: ToolPageInfo[] = toolGroups.flatMap((group) => [...group.tools]);

export const trustPages = [
  {
    title: "About",
    href: "/about/",
    description: "Learn who builds Simple Dev Tools and how the toolkit is maintained.",
  },
  {
    title: "Contact",
    href: "/contact/",
    description: "Contact Hello.World Consulting or Jonathan R Reed about Simple Dev Tools.",
  },
  {
    title: "Privacy",
    href: "/privacy/",
    description: "Review the local-first privacy model for Simple Dev Tools.",
  },
] as const;
