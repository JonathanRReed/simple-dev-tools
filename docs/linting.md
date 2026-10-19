# Lint coverage without the Next glob dependency

The replacement removes `eslint-config-next → @next/eslint-plugin-next →
fast-glob → micromatch → braces`. The audit wrapper, exception document, and
October 20 expiry are unchanged. The unfiltered audit must be clean without
using that exception.

The original `.oxlintrc.json` and its ignores are unchanged. `bun run lint`
first runs that existing Oxlint pass. The Node runner then runs ESLint with
explicit, pinned React, Hooks, accessibility, import, globals, TypeScript,
parser, and resolver configuration captured from DevTools baseline `ecb2d159`.
Hooks 7.1.1 retains its compiler diagnostics and the existing
`set-state-in-effect` exemption.

The runner passes ESLint's actual selected files to a separate Next-only
Oxlint configuration. This preserves Next coverage in `public/`, which the
original Oxlint pass ignores, and covers JS, JSX, MJS, CJS, TS, TSX, MTS, and
CTS. ESLint's generated-output exclusions still apply. The Next-only pass
explicitly enables the 20 migrated rules at their original severities and
uses one thread; it does not replace or weaken the original Oxlint pass.

Two attributed local ESLint rules check document navigation. Their original
`@next/next` IDs preserve existing CSP-related full-document navigation
exemptions. The QR preview's image exemption moves from an ESLint directive
to the corresponding Oxlint directive. Product behavior is unchanged.
The route rule discovers actual page endpoints under `src/app`, `app`,
`src/pages`, or `pages`, rather than treating helper files or assets as routes.
It handles route groups, parallel routes, and dynamic segments. Existing literal
root directories, including checkout names with brackets, are accepted. Unsupported
glob roots fail visibly; DevTools uses one explicit root and standard page extensions.
Pages Router underscore directories and ordinary underscore pages remain routes;
only `_app`, `_document`, and `_error` files are reserved. App Router underscore
directories remain private.

Route discovery stays uncached across linted files. Regression tests reuse one
ESLint instance while adding, renaming, and deleting nested App and Pages endpoints
inside existing directories. Any future cache must preserve that freshness;
route-root timestamps alone do not track every nested change.

The implementation and differential fixtures are adapted from
[Prompt Info PR 14](https://github.com/JonathanRReed/prompt-info/pull/14),
commit `6393b926ad8da69a8ff20de35bc7fccc62f50ec7`. Full original MIT attribution
is in `scripts/lint/THIRD_PARTY_NOTICES.md`.
The literal-root and Pages underscore corrections and freshness regressions are
adapted from [Prompt Info PR 15](https://github.com/JonathanRReed/prompt-info/pull/15),
commit `20035864a6ac1a61cb4f23a2f5122287e160aff6`.

`bun test tests/lint/lint-coverage.test.mjs` checks 70 recorded upstream
examples, all non-Next rules/options/settings/parser options/globals across
the eight file extensions, original Oxlint configuration, actual DevTools
routes, existing exemptions, and the complete runner's public-file and ignore
behavior. It also checks cyclic aliases cannot stall navigation linting.
These fixtures bound the tested equivalence; they are not exhaustive parity
for every possible program. Static App Router routes and dotted dynamic
segments have the stricter endpoint behavior already tested in the reference.

To regenerate upstream diagnostics, use a separate clean checkout of baseline
`ecb2d159` with frozen dependencies and run this checkout's
`tests/lint/record-upstream.mjs` with `UPSTREAM_ROOT` pointing there. Review
fixture changes. Do not restore the vulnerable preset as a test dependency.
