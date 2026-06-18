# Simple Dev Tools

Simple Dev Tools is a browser-first toolkit for everyday developer workflows. It is live at [dev-tools.helloworldfirm.com](https://dev-tools.helloworldfirm.com) and designed to be useful without auth, a database, or a custom backend.

Built and maintained by Jonathan R Reed at Hello.World Consulting. Every tool runs entirely in your browser — no accounts, no servers, and nothing sent to a backend.

## What it includes

- API snippets for cURL, Python requests, and fetch
- Mermaid editing with live preview and export
- SQLite experiments in the browser via SQLite WASM
- Regex testing with live matches and replacements
- UUID, ULID, and cron helpers
- URL, Base64, and QR encoding tools
- JSON, YAML, and OpenAPI schema validation and conversion
- JWT decoding, hashing, and HMAC utilities

## Why local-first

- Everything runs in the browser, so sensitive examples — tokens, schemas, SQL, and regex samples — never leave your machine.
- The app is a static export, so deployment is just files on a CDN: simple, cheap, and low-maintenance.
- No auth and no backend, so the tools are usable the moment the page loads.
- Metadata, Open Graph images, robots, sitemap, and llms.txt are already in place for discoverability.

## Tech stack

- Next.js static export
- React, Tailwind CSS, Radix UI
- TypeScript and Bun

## Development

Install dependencies and start the dev server:

```bash
bun install
bun run dev
```

## Quality checks

Run the full repo check before committing:

```bash
bun run check
```

That runs:
- `bun run lint`
- `bun run typecheck`
- `bun run build`

## Deployment

The app uses `output: "export"` and `trailingSlash: true` in `next.config.js`, so routes export as static directories for CDNs or any static host.

Crawler and AI-reader surfaces live in `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License. It is source-available today and converts to MIT two years after each version is released. See [`LICENSE`](./LICENSE).
