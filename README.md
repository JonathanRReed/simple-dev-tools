# Simple Dev Tools

Developer utilities that process input in the browser, without an account or application backend. Built by Jonathan R. Reed at Hello.World Consulting.

[Live site](https://dev-tools.helloworldfirm.com)

## Tools

Generate API snippets for cURL, Python requests, and fetch. Edit Mermaid diagrams, experiment with SQLite WASM, test regular expressions, or compare text.

Other tools handle UUIDs, ULIDs, cron expressions, URL and Base64 encoding, QR codes, JSON, YAML, OpenAPI validation, JWTs, hashes, HMAC, Markdown, and query strings. Editors support file import and keyboard shortcuts where applicable. Visited tools can work offline through the service worker.

The home page has one input for everything. Paste a token, JSON, a timestamp, a cron line, a color, a URL, SQL, or a Mermaid diagram, and it names what it found and opens the matching tool with the content loaded. The same detection runs in the ⌘K palette, which loads as its own chunk once the page is idle. The rules are local heuristics in `src/lib/detect.ts`; nothing is fetched or sent.

The 15 tools are also laid out as the left-hand block of a keyboard (`1`–`5`, `Q`–`T`, `A`–`G`), and pressing a key opens its tool. Single-key shortcuts can be turned off from the home page or the palette.

Inputs are not submitted to an application backend. Share links are different: they contain compressed tool state. Treat a generated URL as a copy of its contents, and do not share secrets through it. Oversized state produces an error rather than an incomplete link.

Opening a detected paste does not create a share link. The content crosses to the tool through `sessionStorage` (`src/lib/handoff.ts`) and is removed on first read, so it never appears in a URL or in history.

## Develop

```bash
bun install --frozen-lockfile
bun run dev
```

The app uses Next.js 16 static export, React 19, TypeScript 6, Bun 1.4.4, Tailwind CSS 4, and Radix UI. CodeMirror 6 powers SQL and Mermaid editors. Theme tokens, including `--code-*`, live in `src/app/globals.css`; there is no Tailwind JavaScript configuration.

`dev` and `build` first copy the matching SQL.js JavaScript, WebAssembly, and license from the pinned `sql.js` package into `public/sqljs/`. These generated assets are ignored by Git and served from the same origin. To prepare them separately, run `bun run assets:prepare`.

## Design

The interface is modelled on bench instruments, and three surfaces carry it. The bench is the page. A panel is an instrument body raised off the bench. A well is a recess cut into a panel, and every field and readout sits in one. Buttons are keycaps (`key` in `globals.css`) that sit on a lip and travel down when pressed. A lit LED means on or selected.

Eight themes share that structure and differ only in palette: Art Deco, Blueprint, Rose Pine, Moon, Graphite, Paper, Dawn, and Hi-Vis. `src/lib/theme-contrast.test.ts` holds every one of them to WCAG contrast. Text and syntax colors owe 4.5:1 on each surface they can land on, and control borders, focus rings, and indicators owe 3:1. The hairline between regions is decorative and is not held to a ratio, so anything a person must be able to find uses `border-input`.

Type is self-hosted (`src/app/fonts/`). Archivo sets interface text, and one static expanded cut of it sets headings; shipping that cut instead of the two-axis variable file saves about 40 KB on a first visit. Atkinson Hyperlegible Mono sets code and data, because it keeps `0`/`O` and `1`/`l`/`I` apart in hashes, IDs, and tokens.

The favicons and the social card are generated from one drawing by `bun run assets:brand`.

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
| Bun | `1.4.4`, pinned by `packageManager` |

Crawler metadata lives in `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.

## License

Functional Source License 1.1, MIT Future License. Each version converts to MIT two years after release. See [LICENSE](LICENSE).
