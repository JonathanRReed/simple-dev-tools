# Simple Dev Tools

Browser dev tools that run on your own machine, with no accounts and no backend. I built this at Hello.World Consulting because I got tired of pasting tokens, JSON, and SQL into sites covered in ads just to format or decode something.

[Live site](https://dev-tools.helloworldfirm.com)

## Tools

There are 15 tools in here: API snippets for cURL, Python requests, and JS fetch, a Mermaid editor, a SQLite WASM playground, a regex tester, and text diff. There's also UUID/ULID generation, cron explanations, URL and Base64 encoding, QR codes, JSON/YAML/CSV conversion, OpenAPI and JSON Schema validation, JWT decoding and signing, file hashing, HMACs, Markdown preview, color contrast, and a query string editor. Most editors take dropped files and have keyboard shortcuts, and any tool you've opened before works offline through the service worker.

The home page has one box where you can paste pretty much anything. Drop in a JWT, JSON, a timestamp, a cron line, a hex color, a URL, SQL, or a Mermaid diagram, and it guesses what it is and opens the matching tool with your text already filled in. The ⌘K menu runs the exact same detector and loads after the page settles. All of that logic lives locally in `src/lib/detect.ts` and makes zero network requests.

On desktop, the 15 tools sit in the same layout as the left side of a keyboard (`1` to `5`, `Q` to `T`, `A` to `G`). Hit a key to jump straight to that tool, or flip single key shortcuts off from the home page or command palette.

Nothing you type goes to a backend. Share links are the one thing to watch out for since they pack compressed tool state into the URL hash. Treat a share link like a copy of whatever you pasted, and don't put real secrets in one. If your input is too big for a URL, it shows an error instead of creating a broken link.

Opening a pasted item from the home page or ⌘K doesn't make a share link. It hands the text over through `sessionStorage` in `src/lib/handoff.ts` and deletes it as soon as the tool reads it, so it never lands in a URL or your history.

## Develop

```bash
bun install --frozen-lockfile
bun run dev
```

Built with Next.js 16 static export, React 19, TypeScript 6, Bun 1.4.4, Tailwind CSS 4, and Radix UI. CodeMirror 6 handles the SQL and Mermaid editors. All theme tokens, including `--code-*`, live in `src/app/globals.css`. There's no Tailwind JS config file.

Before running `dev` or `build`, a small script copies the matching SQL.js JavaScript, WebAssembly, and license files from the pinned `sql.js` package into `public/sqljs/`. Those files stay gitignored and load from the same origin. You can run `bun run assets:prepare` by itself too.

## Design

The UI uses three layers: the page background, raised tool panels, and recessed wells for inputs and outputs. Buttons sit like keycaps that press down on click, and small LEDs show when something is active or was opened recently.

All eight themes keep the same layout and only swap colors: Art Deco, Blueprint, Rose Pine, Moon, Graphite, Paper, Dawn, and Hi-Vis. Every theme gets checked in `src/lib/theme-contrast.test.ts` against WCAG contrast rules. Text and code syntax have to clear 4.5:1 on every surface they appear on, while borders, focus rings, and indicators have to clear 3:1. Decorative hairlines don't get held to that ratio, so anything you actually need to spot uses `border-input`.

Fonts are self-hosted in `src/app/fonts/`. Archivo handles UI text, and headings use one static expanded cut instead of the full two axis variable font, which cuts about 40 KB off a first visit. Atkinson Hyperlegible Mono handles code and data so `0` and `O` or `1`, `l`, and `I` don't blend together in hashes, IDs, and tokens.

Favicons and the social preview card come from one script: `bun run assets:brand`.

## Verify

```bash
bun run check
bun run test:e2e
```

`check` runs the dependency audit, oxlint, ESLint, typechecks, unit tests, and a production build. Playwright covers desktop and mobile rendering separately. Both run in CI on PRs and pushes to `main`.

Other scripts:

```bash
bun run lint:fast
bun run deps:check
bun run deps:outdated
```

Those run oxlint on its own, Knip for unused files and exports, and dependency freshness plus vulnerability checks.

## Deploy

`next.config.js` uses `output: "export"` and `trailingSlash: true`. Cloudflare Pages settings:

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && bun run build` |
| Output | `out` |
| Production branch | `main` |
| Bun | `1.4.4`, pinned by `packageManager` |

Crawler files live in `public/robots.txt`, `public/sitemap.xml`, and `public/llms.txt`.

## License

Functional Source License 1.1, MIT Future License. Each version converts to MIT two years after release. See [LICENSE](LICENSE).
