export const siteConfig = {
  name: "Simple Dev Tools",
  shortName: "Simple Dev Tools",
  url: "https://dev-tools.helloworldfirm.com",
  description:
    "Browser dev tools that stay on your own machine: API snippets, Mermaid diagrams, SQLite, regex, JSON, schemas, JWTs, timestamps, hashes, and QR codes.",
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
        description: "Turn one API request into cURL, Python, and JS fetch code.",
        icon: "code",
        tags: ["REST", "Swagger", "Docs"],
      },
      {
        title: "Querystring Editor",
        href: "/tools/query/",
        description: "Break a URL query string or form body into a table, edit it, and copy it back.",
        icon: "table",
        tags: ["URL", "Encoding"],
      },
      {
        title: "Encoders & QR",
        href: "/tools/encode-qr/",
        description: "Encode or decode Base64 and URLs, or make PNG and SVG QR codes.",
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
        description: "Format, check, and convert JSON, YAML, and CSV, or pull out values with a path query.",
        icon: "json",
        tags: ["JSON", "Convert"],
      },
      {
        title: "SQLite Playground",
        href: "/sqlite/",
        description: "Run SQLite right in your browser with WASM and export the tables.",
        icon: "database",
        tags: ["SQL", "Data"],
      },
      {
        title: "Schema & Types Studio",
        href: "/studio/schema/",
        description: "Check data against JSON Schema, read OpenAPI docs, and generate TypeScript or Zod.",
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
        description: "Test JavaScript regexes with live matches, replacements, and sample text.",
        icon: "searchCode",
        tags: ["Regex", "Testing"],
      },
      {
        title: "Text Diff",
        href: "/tools/diff/",
        description: "Compare two blocks of text side by side or inline with word highlights.",
        icon: "diff",
        tags: ["Diff", "Text"],
      },
      {
        title: "Markdown Preview",
        href: "/tools/markdown/",
        description: "Write or paste Markdown, preview it safely, and grab the clean HTML.",
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
        description: "Convert Unix timestamps, ISO 8601 dates, and time zones.",
        icon: "clock",
        tags: ["Time", "Dates"],
      },
      {
        title: "IDs & Scheduling",
        href: "/tools/ids-cron/",
        description: "Generate UUIDs and ULIDs, check ULID timestamps, and decode cron lines.",
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
        description: "Decode, verify, and sign JWTs, hash text, or run HMACs locally.",
        icon: "shield",
        tags: ["Security", "Identity", "JWT"],
      },
      {
        title: "File Hash Checker",
        href: "/tools/hash/",
        description: "Hash text or files with SHA-1, SHA-256, SHA-384, or SHA-512 and verify checksums.",
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
        description: "Write Mermaid diagrams with live preview, templates, and SVG or PNG export.",
        icon: "workflow",
        tags: ["Diagrams", "Planning"],
      },
      {
        title: "Color & Contrast",
        href: "/tools/color/",
        description: "Convert between HEX, RGB, HSL, and OKLCH and check WCAG contrast.",
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
    description: "Who built Simple Dev Tools and why it runs in your browser.",
  },
  {
    title: "Contact",
    href: "/contact/",
    description: "How to reach me or report a bug in Simple Dev Tools.",
  },
  {
    title: "Privacy",
    href: "/privacy/",
    description: "What stays in your browser and what touches the network.",
  },
] as const;
