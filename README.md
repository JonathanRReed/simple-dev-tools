# dev.hellworldfirm.com

Simple Dev Tools is a static Next.js toolkit for everyday developer workflows. It is built by Jonathan R Reed for Hello.World Consulting and runs as browser-first utilities without auth, a database, or a custom backend.

## Tools

- API Snippet Generator: cURL, Python requests, and fetch snippets from one endpoint definition.
- Mermaid Editor: Mermaid syntax editing, preview, and SVG or PNG export.
- SQLite Playground: local SQL experiments with SQLite WASM.
- Regex Lab: live matches, replacements, samples, and shareable pattern URLs.
- IDs & Scheduling: UUIDv4, ULID inspection, and cron expression descriptions.
- Encoders & QR: URL encoding, Base64, and QR code export.
- Schema & Types Studio: JSON, YAML, OpenAPI, validation, TypeScript, and Zod output.
- Security & Tokens: JWT decode and verify, hashes, and HMAC generation with Web Crypto.

## Development

```bash
bun install
bun run dev
bun run lint
bun run typecheck
bun run build
```

Use `bun run check` before shipping. It runs lint, typecheck, and production build.

## Static Export

The app uses `output: "export"` and `trailingSlash: true` so routes export as clean static directories. `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt` describe crawler and AI-reader surfaces.

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License. This repository is source-available today and converts to MIT two years after each version is made available. See [`LICENSE`](./LICENSE).
