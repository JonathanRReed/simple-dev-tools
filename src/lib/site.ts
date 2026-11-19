export const siteConfig = {
  name: "Simple Dev Tools",
  shortName: "Simple Dev Tools",
  url: "https://dev-tools.helloworldfirm.com",
  description:
    "Local-first developer tools that run in your browser: API snippets, diagrams, SQLite, regex, schemas, IDs, QR codes, and JSON cleanup.",
  author: {
    name: "Jonathan R. Reed",
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
  | "clock"
  | "code"
  | "color"
  | "database"
  | "diff"
  | "hash"
  | "json"
  | "markdown"
  | "qr"
  | "searchCode"
  | "shield"
  | "table"
  | "workflow";

/** The six tool families. Each owns one hue, defined per theme in globals.css. */
export type ToolHue = "web" | "data" | "text" | "time" | "security" | "visual";

export type ToolPageInfo = {
  title: string;
  href: string;
  description: string;
  icon: ToolIcon;
  tags: readonly string[];
};

export const toolGroups = [
  {
    title: "Web",
    hue: "web",
    tools: [
      {
        title: "API Snippet Generator",
        href: "/api-snippet/",
        description: "Draft cURL, Python, and fetch snippets from one endpoint definition.",
        icon: "code",
        tags: ["REST", "Swagger", "Docs"],
      },
      {
        title: "Querystring Editor",
        href: "/tools/query/",
        description: "Parse, edit, and re-encode URL query strings and form bodies as a table.",
        icon: "table",
        tags: ["URL", "Encoding"],
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
    title: "Data",
    hue: "data",
    tools: [
      {
        title: "JSON Workbench",
        href: "/tools/json/",
        description: "Format, validate, and convert between JSON, YAML, and CSV, then query by path.",
        icon: "json",
        tags: ["JSON", "Convert"],
      },
      {
        title: "SQLite Playground",
        href: "/sqlite/",
        description: "Run SQL experiments locally with SQLite WASM and instant result tables.",
        icon: "database",
        tags: ["SQL", "Data"],
      },
      {
        title: "Schema & Types Studio",
        href: "/studio/schema/",
        description: "Parse JSON, YAML, and OpenAPI, validate data, and generate TypeScript or Zod.",
        icon: "braces",
        tags: ["Types", "Validation"],
      },
    ],
  },
  {
    title: "Text",
    hue: "text",
    tools: [
      {
        title: "Regex Lab",
        href: "/tools/regex/",
        description: "Iterate on patterns with live matches, replacements, samples, and links.",
        icon: "searchCode",
        tags: ["Regex", "Testing"],
      },
      {
        title: "Text Diff",
        href: "/tools/diff/",
        description: "Compare two texts side by side or unified, with word-level highlighting.",
        icon: "diff",
        tags: ["Diff", "Text"],
      },
      {
        title: "Markdown Preview",
        href: "/tools/markdown/",
        description: "Preview markdown with a sanitized live render, then copy or download HTML.",
        icon: "markdown",
        tags: ["Markdown", "Writing"],
      },
    ],
  },
  {
    title: "Time & IDs",
    hue: "time",
    tools: [
      {
        title: "Timestamp Converter",
        href: "/tools/timestamp/",
        description: "Convert Unix epochs, ISO 8601, and time zones, with relative time.",
        icon: "clock",
        tags: ["Time", "Dates"],
      },
      {
        title: "IDs & Scheduling",
        href: "/tools/ids-cron/",
        description: "Generate UUIDs and ULIDs, inspect ULID time, and explain cron schedules.",
        icon: "calendarClock",
        tags: ["Scheduling", "Automation"],
      },
    ],
  },
  {
    title: "Security",
    hue: "security",
    tools: [
      {
        title: "Security & Tokens",
        href: "/studio/security/",
        description: "Decode, verify, and sign JWTs, compute hashes, and generate HMACs locally.",
        icon: "shield",
        tags: ["Security", "Identity", "JWT"],
      },
      {
        title: "File Hash Checker",
        href: "/tools/hash/",
        description: "Hash text or files with SHA-256/384/512 and verify against an expected digest.",
        icon: "hash",
        tags: ["Hashing", "Verification"],
      },
    ],
  },
  {
    title: "Visual",
    hue: "visual",
    tools: [
      {
        title: "Mermaid Editor",
        href: "/mermaid/",
        description: "Sketch flows, sequence diagrams, and architecture notes with export tools.",
        icon: "workflow",
        tags: ["Diagrams", "Planning"],
      },
      {
        title: "Color & Contrast",
        href: "/tools/color/",
        description: "Convert HEX, RGB, HSL, and OKLCH, and check WCAG contrast ratios.",
        icon: "color",
        tags: ["Color", "A11y"],
      },
    ],
  },
] as const satisfies readonly {
  title: string;
  hue: ToolHue;
  tools: readonly ToolPageInfo[];
}[];

export const toolPages: ToolPageInfo[] = toolGroups.flatMap((group) => [...group.tools]);

/**
 * The home rack lays the tools out as the left-hand block of a keyboard, so
 * each tool's shortcut is the key sitting in the same position.
 */
// prettier-ignore
const KEY_LEGENDS: readonly string[] = [
  "1", "2", "3", "4", "5",
  "Q", "W", "E", "R", "T",
  "A", "S", "D", "F", "G",
];

export type ToolMeta = ToolPageInfo & {
  /** Hue of the family this tool belongs to. */
  hue: ToolHue;
  /** Family name, e.g. "Data". */
  family: string;
  /** Keyboard legend on the home rack, e.g. "E". */
  legend: string | null;
};

export const toolCatalog: ToolMeta[] = toolGroups
  .flatMap((group) => group.tools.map((tool) => ({ ...tool, hue: group.hue, family: group.title })))
  .map((tool, index) => ({ ...tool, legend: KEY_LEGENDS[index] ?? null }));

/** Canonical route key: strips the export trailing slash ("/tools/json/" → "/tools/json"). */
export const normalizeHref = (href: string) => (href === "/" ? "/" : href.replace(/\/$/, ""));

const toolByHref = new Map(toolCatalog.map((tool) => [normalizeHref(tool.href), tool] as const));

/** Look up a catalog entry by route (trailing slash optional). */
export function getToolPage(href: string): ToolMeta | undefined {
  return toolByHref.get(normalizeHref(href));
}

const toolByLegend = new Map(
  toolCatalog.flatMap((tool) => (tool.legend ? [[tool.legend, tool] as const] : []))
);

/** Look up the tool bound to a home-rack key ("e" and "E" both match). */
export function getToolByKey(key: string): ToolMeta | undefined {
  return toolByLegend.get(key.toUpperCase());
}

/** Tools surfaced in the footer and the PWA manifest shortcuts. */
export const featuredToolHrefs = [
  "/tools/regex/",
  "/tools/json/",
  "/tools/timestamp/",
  "/studio/security/",
] as const;

export const trustPages = [
  {
    title: "About",
    href: "/about/",
    description: "Learn who builds Simple Dev Tools and how the toolkit is maintained.",
  },
  {
    title: "Contact",
    href: "/contact/",
    description: "Contact Hello.World Consulting or Jonathan R. Reed about Simple Dev Tools.",
  },
  {
    title: "Privacy",
    href: "/privacy/",
    description: "Review the local-first privacy model for Simple Dev Tools.",
  },
] as const;
