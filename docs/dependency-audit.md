# Temporary development dependency exception

Approved on October 15, 2026 (Central Time), only for GHSA-vfj7-8cjw-p6xm in braces 3.0.3. Expires at 2026-10-20 05:00 UTC, the end of October 19 Central Time. No other advisory or repository is covered by this record.

The affected chain is eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces. It is used for linting. Deeply nested malicious patterns can exhaust the Node.js stack. The upstream advisory currently lists no patched release: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm . Avoid untrusted lint configuration and glob inputs.

Run `bun run audit`. The check requires a successful, clean production audit and permits only this exact advisory before expiry with the reviewed consumer graph in `dependency-exception.json`. New consumers, altered versions, other advisories, invalid responses, command errors, or an expired exception block. It never lowers a severity threshold or treats a failed audit as a clean result.

When an upstream fix is available, update the dependency, rerun the complete checks, and remove the exception record and special handling. Do not extend the expiration without a new decision.

## Resolved dependency chain, October 22, 2026

The October 20 exception has not been extended. The current full and production
registry audits are clean because the vulnerable implementation was removed,
not renamed or excluded from scanning.

The sole `fast-glob` consumer, Next's lint plugin, now resolves that import to the
exact official `tinyglobby@0.2.17` npm artifact. Its package identity remains
`tinyglobby` in the lockfile and at runtime. This removes fast-glob's micromatch
and braces dependency chain while retaining the Next lint rules.

Version-pinned Bun patches preserve directory discovery:

- `@next/eslint-plugin-next@16.4.2`: disable automatic directory expansion,
  retain absolute roots, and preserve the trailing-globstar minimum depth.
- `fdir@6.5.0`: include a followed directory symlink itself in directory results,
  in both CJS and ESM builds. Existing recursion/cycle checks are unchanged.

`tests/unit/lint-glob-compat.test.ts` checks canonical root selections captured
from the original implementation, mixed root arrays, backslash normalization,
relative and absolute roots, dot directories, symlinks, both module entry points,
actual Pages/App-root lint diagnostics, replacement identity and the single
consumer invariant. The effective 67-rule configuration was also compared before
and after the replacement. Future dependency changes must retain this coverage;
a clean registry audit alone does not establish API compatibility.

Build/test tools are pinned to Bun 1.4.4 and Node 22.23.4, with Next 16.4.2 and
Undici 7.30.1. The deployed product remains a static export; these Node selectors
do not describe a production Node server. The historical expired exception tests
remain to ensure a reintroduced finding cannot silently regain an exemption.

## URI resolver security maintenance, October 24, 2026

The `fast-uri` override now resolves to the official `3.1.9` patch release,
without changing Ajv's major version or the existing lint compatibility patches.
The [upstream release](https://github.com/fastify/fast-uri/releases/tag/v3.1.9)
addresses GHSA-w74x-v6f9-j3xg (encoded schemes), GHSA-wjr9-j795-jxcr
(ambiguous domain hosts), GHSA-xhq7-xmqj-769h (relative references), and
GHSA-333x-w4r6-6crp (suffix-reference colons).

Schema Studio dynamically imports Ajv for user-provided schemas. The regression
suite exercises Ajv's actual URI resolver with short, inert identifiers, plus
local/relative schema references, validation errors, formats, fresh-instance
recompilation, and missing-reference failures for all three supported dialects.
It does not fetch remote schemas, exercise executable URLs, or run stress inputs.
The suffix-option regression covers the dependency fix; it does not imply that
Schema Studio uses that non-default option. These tests are not a claim that
Ajv is a sanitizer for arbitrary URLs or that every upstream issue is exploitable
in the application. Raw full/production audits and the existing fail-closed audit
gate remain required; no advisory exception or severity threshold was changed.

## Dependency refresh, November 18, 2026

`bun audit` had three new moderate findings against the October lockfile, so the
fail-closed gate (`bun run audit`) was blocking. All three are resolved by
upgrading, with no exception record and no change to the gate:

- `next` 16.4.2 → 16.4.6, for GHSA-mfr8-8qww-v76h and GHSA-vc7v-qv4w-wrv8
  (cache leaks across root params; affects `>=16.2.0 <=16.4.4`). This site is a
  static export and does not use `'use cache'`, but the fixed release is taken
  rather than argued around.
- `eslint-config-next` 16.4.6 pulls `typescript-eslint` 8.73, whose
  `minimatch` is `^11.0.1`, for GHSA-g3hv-75wg-m249.

The `@next/eslint-plugin-next` patch is version-keyed, so it was renamed to
`@next%2Feslint-plugin-next@16.4.6.patch` with identical content; the patched
file is unchanged upstream between the two releases and the patch applies
cleanly. `fdir@6.5.0` and the `tinyglobby@0.2.17` alias are untouched. `undici`
moves 7.30.1 → 7.30.2 and Node 22.23.4 → 22.23.5 within their pinned lines.

Other packages moved to current releases, including two majors (`mermaid` 12,
exercised by the template e2e test, and `sql.js` 1.16 with its asset test).
Three are held back on purpose:

- `eslint` stays on 9.x: `eslint-plugin-react` 7.37.5 still declares
  `^9.7` as its newest supported peer.
- `typescript` stays on 6.0.x: `typescript-eslint` 8.73 requires `<6.1.0`.
- `@types/node` stays on 22.x to match the pinned Node 22 toolchain.

`tests/unit/lint-glob-compat.test.ts` must keep covering the replacement glob.
On the macOS machine used for this refresh its symlink cases (`symlink`,
`globstar`, and the ESM symlink entry) fail, and the remaining cases need a
timeout far above the default because the temp directory is walked through
`/private/var`. The ESM symlink case fails identically on the untouched
October lockfile on the same machine, so this is local to that environment and
not introduced here. CI on Linux remains the authority for that suite.
