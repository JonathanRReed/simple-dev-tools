# Simple Dev Tools

Developer utilities that process input in the browser, without an account or application backend. Built by Jonathan R. Reed at Hello.World Consulting.

[Live site](https://dev-tools.helloworldfirm.com)

## Tools

Generate API snippets for cURL, Python requests, and fetch. Edit Mermaid diagrams, experiment with SQLite WASM, test regular expressions, or compare text.

Other tools handle UUIDs, ULIDs, cron expressions, URL and Base64 encoding, QR codes, JSON, YAML, OpenAPI validation, JWTs, hashes, HMAC, Markdown, and query strings. Editors support file import and keyboard shortcuts where applicable. Visited tools can work offline through the service worker.

Inputs are not submitted to an application backend. Share links are different: they contain compressed tool state. Treat a generated URL as a copy of its contents, and do not share secrets through it. Oversized state produces an error rather than an incomplete link.

## Develop

```bash
bun install --frozen-lockfile
bun run dev
```

The app uses Next.js 16 static export, React 19, TypeScript 6, Bun 1.4, Tailwind CSS 4, and Radix UI. CodeMirror 6 powers SQL and Mermaid editors. Theme tokens, including `--code-*`, live in `src/app/globals.css`; there is no Tailwind JavaScript configuration.

## Verify

```bash
bun run check
bun run test:e2e
```

`check` runs oxlint and ESLint, type checks, unit tests, and build. The separate Playwright suite covers desktop and mobile rendering. Both run in CI on PRs and pushes to `main`.

Other checks:

```bash
bun run lint:fast
bun run deps:check
bun run deps:outdated
```

These run oxlint alone, Knip, and dependency freshness and vulnerability checks respectively.

## Deploy

`next.config.js` uses `output: "export"` and `trailingSlash: true`. Cloudflare Pages settings:

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Output | `out` |
| Production branch | `main` |
| Bun | `1.4.0`, pinned by `packageManager` |

Crawler metadata lives in `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.

## License

Functional Source License 1.1, MIT Future License. Each version converts to MIT two years after release. See [LICENSE](LICENSE).
