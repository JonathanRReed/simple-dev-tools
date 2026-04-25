# Simple Dev Tools

A collection of static, browser-first utilities for everyday developer workflows. Available at [dev.hellworldfirm.com](https://dev.hellworldfirm.com). 

Everything runs locally in your browser—no auth, no database, and no custom backend required. Built by Jonathan R Reed for Hello.World Consulting.

## Tools

- **API Snippets:** Generate cURL, Python requests, and fetch snippets from a single endpoint definition.
- **Mermaid Editor:** Edit Mermaid syntax, preview in real-time, and export as SVG or PNG.
- **SQLite Playground:** Run local SQL experiments in the browser using SQLite WASM.
- **Regex Lab:** Test patterns with live matches, replacements, and shareable URLs.
- **IDs & Scheduling:** Generate UUIDv4, inspect ULIDs, and parse cron expressions.
- **Encoders & QR:** Encode/decode URLs and Base64, and export QR codes.
- **Schema Studio:** Validate and convert between JSON, YAML, and OpenAPI. Generate TypeScript types and Zod schemas.
- **Security & Tokens:** Decode and verify JWTs, calculate hashes, and generate HMACs using the Web Crypto API.

## Tech Stack

- **Framework:** Next.js (Static Export)
- **UI:** React, Tailwind CSS, Radix UI
- **Tooling:** TypeScript, Bun

## Development

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

### Checks & Formatting

Before committing, run the check script to ensure code quality:

```bash
bun run check
```

This runs:
- `bun run lint` (ESLint)
- `bun run typecheck` (TypeScript)
- `bun run build` (Next.js production build)

## Deployment (Static Export)

The application uses `output: "export"` and `trailingSlash: true` in `next.config.js`. When built, routes are exported as clean static directories suitable for hosting on any static file server or CDN. 

Crawler and AI-reader surfaces are defined in `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License. This repository is source-available today and converts to MIT two years after each version is made available. See [`LICENSE`](./LICENSE).
