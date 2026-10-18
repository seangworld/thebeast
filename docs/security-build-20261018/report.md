# Security/build remediation assessment — 18 October 2026

**Outcome: genuinely blocked upstream. No complete supported compatible remediation is available in the checked releases. The release gate remains closed.** This isolated assessment is based on Avery PR #265 commit `58c6f4a330d8878f8d415191c0ef2bf1749d6b63`. It changes documentation/evidence only: no dependency, lockfile, application, lint-rule, Tailwind, audit or build configuration change is proposed for merge.

## Baseline and overlapping work

The primary working checkout had an unrelated modified version manifest on `ba-rec-bf-dash-rec-ga4`; it was left untouched. This branch, `codex/security-build-remediation`, starts from the completed Avery head in the existing isolated checkout. Open PRs and local/remote-tracking security/dependency branches were inspected. No open PR contained this remediation. Earlier `c1b2751f` already patched compatible advisories and retained the gate; this assessment does not duplicate those changes. The other security branch concerns database grants and has older dependency versions, not a braces fix.

Installed Next **15.5.27**, React **18**, Tailwind **3.4.19**, ESLint **8**, eslint-config-next **15.5.27**; local Node **24.19.0**, npm **11.17.0**. Next's declared Node range is `^18.18.0 || ^19.8.0 || >=20.0.0`, and its React peer range includes 18.2+. eslint-config-next permits ESLint 7/8/9 and TypeScript >=3.3.1. Local runtime satisfies declared requirements; `npm ls --all --json` completes with no missing/invalid/peer problems. No hosted runtime compatibility is inferred from this local check.

`npm run build` is still `npm run audit:ci && next build`; audit:ci is full `npm audit`. Lint remains `next lint`, extending `next/core-web-vitals`. Existing security overrides were inspected and left unchanged; none is added for this issue.

## Root cause and complete installed paths

Official registry audit: **7 high, 0 critical, 0 moderate/low**. The affected nodes are `braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `@next/eslint-plugin-next`, `eslint-config-next`. They arise from one active root advisory, [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), recursive nested-brace pattern processing. The advisory lists every released braces version through 3.0.3 and **no patched version**. [Upstream issue #70](https://github.com/micromatch/braces/issues/70) remains open; the maintainer disputes the threat assumptions. That dispute does not withdraw the registry finding or justify bypassing this project's gate.

Actual installed graph (not merely package.json):

- Tailwind 3.4.19 → chokidar 3.6.0 → braces 3.0.3.
- Tailwind 3.4.19 → micromatch 4.0.8 → braces 3.0.3.
- Tailwind 3.4.19 → fast-glob 3.3.3 → micromatch 4.0.8 → braces 3.0.3.
- eslint-config-next 15.5.27 → @next/eslint-plugin-next 15.5.27 → fast-glob 3.3.1 → micromatch 4.0.8 → braces 3.0.3.

See [installed paths](installed-paths.txt), [installed summary](installed-summary.json), [current audit](audit-current.json), and [official registry version/dependency/engine metadata](upstream-metadata.json). No packages were installed into or removed from the repository during this assessment.

## Alternatives evaluated in the requested order

| Option | Evidence and disposition |
| --- | --- |
| Compatible patched release | Latest braces is 3.0.3; latest micromatch 4.0.8 and fast-glob 3.3.3 still require it. No fixed compatible release to install. |
| Supported minor/config update | Tailwind 3.4.19 is already current in its major and retains three paths. Latest compatible Next 15 lint plugin 15.5.28, latest stable 16.4.2 and even canary 16.5.0-canary.17 still require fast-glob 3.3.1. Neither ESLint CLI/flat-config conversion nor config path restrictions remove installed vulnerable packages or clear full audit. No canary/unsupported cross-version combination was installed. |
| Remove unnecessary dependencies | Tailwind is the active PostCSS utility compiler; Next's plugin supplies the active core-web-vitals lint rules. Neither is unused. Dropping them without equivalent behavior/rules would remove styling or weaken checks. Standalone binaries/vendored precompiled CSS do not constitute a maintained patched graph and would obscure rather than remediate this dependency. |
| Major Tailwind migration | Disposable **lockfile-only**, scripts-disabled resolution with Tailwind **4.3.3** and @tailwindcss/postcss **4.3.3** leaves **5 high / 0 critical**: the Next lint → fast-glob → micromatch → braces chain. Experiment resolved the full root manifest against official npm; it was never installed or applied to the repository. See [audit](tailwind4-resolution-audit.json). This rejects Tailwind-only migration as a complete fix. |
| Audit force suggestions / arbitrary override | Downgrade to eslint-config-next 14.2.35 or force-changing chokidar/Tailwind does not establish a supported complete solution. The Next 14 line is [outside upstream support](https://nextjs.org/support-policy); its config also selects the older React Hooks 4 ruleset rather than the current Hooks 5 ruleset. A clean audit obtained by dropping maintained framework checks would not satisfy the preservation requirement. No force install, alias, custom fork, patch-package, arbitrary override, exception, prod-only build audit or advisory suppression used. |

A Tailwind 4 migration also changes minimum browser requirements (Safari 16.4+, Chrome 111+, Firefox 128+), PostCSS integration, preflight defaults and some utility meanings. Preserving the BeastOS visual baseline would require explicit compatibility work and fresh desktop/mobile comparisons. It is unnecessary risk while the independent lint path still prevents acceptance. [Official Tailwind migration guidance](https://tailwindcss.com/docs/upgrade-guide), [Next 15 lint guidance](https://nextjs.org/docs/15/app/api-reference/config/eslint). No partial major migration is recommended for merge.

## Actual validation and exposure

| Gate | Current result |
| --- | --- |
| Full npm audit | **FAIL: 7 high, 0 critical** |
| Production-only dependency audit | **PASS: 0 findings** |
| Required `npm run build` | **FAIL at unchanged full audit prerequisite; Next compilation not reached** |
| Full suite | **PASS: all 2,425 existing tests** |
| TypeScript `tsc --noEmit` | **PASS** |
| Lint `npm run lint` | **PASS: no warnings/errors** |
| Installed tree | `npm ls --all --json`: no dependency compatibility problems |
| Visual verification | No migration/source/style/config change. No fresh browser pass claimed in this assessment. Recorded Avery baseline local 1440/390/375 checks remain historical evidence for identical application bytes, not proof of a new toolchain. |

Evidence logs are adjacent to this report. No paid model inference, credential reading/change, hosted data access/migration, merge or production deployment occurred. Frozen competency material and score remain untouched.

The vulnerable library is present in **development/build tooling**, including CI installation/build and local watch/lint. Tailwind processes repository/config content globs; Next's lint implementation resolves page directories and supports configured rootDir globs. No direct import/use of braces, micromatch or fast-glob was found in application `src` code. Production-only audit is clean. This does **not** prove zero risk in a deployment that retains dev tooling or builds untrusted contributions; malicious build configuration/patterns can attack the build process. No remotely reachable production HTTP exploit was demonstrated. See [Tailwind content scanning source](https://github.com/tailwindlabs/tailwindcss/blob/v3.4.19/src/lib/content.js) and [Next root-directory glob source](https://github.com/vercel/next.js/blob/v15.5.27/packages/eslint-plugin-next/src/utils/get-root-dirs.ts).

## Smallest release-readiness action

The smallest compatible fix is a supported patched **braces** release, compatible with all existing parents and recognized as fixed by the advisory. It can clear both chains without changing Tailwind or lint behavior. Another upstream route is supported parent releases that remove/replace the affected library in **every** path; replacing only one path fails acceptance. Existing authorization covers adopting and validating such a compatible fix when available; no new approval is needed merely to investigate it.

**Owner decision now:** defer release until a supported complete upstream fix exists, or explicitly change scope to maintaining a reviewed upstream patch/fork or replacing the complete styling/lint toolchain. Those alternatives currently lack a verified supported complete package combination and must not be represented as merge-ready or used to waive the zero-high gate. Under the stated no-unsupported-combination/no-arbitrary-override boundaries, this pass stops at the external blocker rather than performing a knowingly incomplete migration.

After a complete fix: unchanged full audit → required production build → TypeScript/lint/2,425 regressions → relevant desktop/mobile comparisons. Then seek the separate DEV-only authorization already described in [Avery release readiness](../avery-release-readiness/report.md): targeted migration-history reconciliation, four Director migrations, DEV deployment with inference disabled, synthetic hosted authentication/tenant boundaries and end-to-end checkpoint verification. This assessment does not authorize or execute that stage. Avery's 23/24 intelligence review is not reopened.
