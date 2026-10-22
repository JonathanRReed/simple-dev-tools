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
