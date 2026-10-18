# Scoped braces fork — consolidated readiness report

2026-10-18 • PR #267 • Issue #264 • based on Avery commit `58c6f4a3`.

**Recommendation: approve the isolated dependency patch for integration review, then separately authorize the targeted DEV-only migration/authentication/end-to-end stage.** The dependency blocker is corrected locally without changing Tailwind, Next, application code, or Avery's competency evidence. This is not production release approval or a new intelligence certification. The private fork has a small explicit maintenance obligation described below.

## Tailwind reconciliation before changes

Freshly fetched `main` (`13005e94`), PR #265 (`58c6f4a3`) and the prior PR #267 head (`f19ffbcb`) all declare `tailwindcss: ^3` and lock **3.4.19**. The actual pre-change installation was also **3.4.19**, with braces **3.0.3**. Next and eslint-config-next are **15.5.27** in all three. No newer working Tailwind configuration or manifest/lock/install mismatch exists in these requested refs. Tailwind-related manifest/lock history was checked across available branches; no separate recent Tailwind-major migration was found. This does not establish what happened in another repository or unreferenced checkout.

**No Tailwind upgrade was repeated, and no newer version was downgraded.** The earlier disposable Tailwind 4 experiment was never applied to these branches. [Exact reconciliation](fork-verification/reconciliation.json).

## Root cause and selected patch

The original seven high findings are dependency nodes arising from [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): unbounded recursive AST traversal after parsing deeply nested patterns. Paths:

- Tailwind → chokidar → braces.
- Tailwind → micromatch → braces.
- Tailwind → fast-glob → micromatch → braces.
- Next ESLint plugin → fast-glob → micromatch → braces.

No patched upstream registry release exists at this check. The [maintainer disputes the threat assumptions](https://github.com/micromatch/braces/issues/70); the advisory remains active. Existing open patch proposals were reviewed, particularly [#88](https://github.com/micromatch/braces/pull/88) at `a795ee83ecd011131b2d618fe754ac5a8e124dae` and #87. They are not merged or an externally supported release. No upstream submission was made.

Owner-authorized private repository fork **`@seangworld/braces@3.0.3-beast.1`** retains the exact 3.0.3 runtime, MIT license and attribution, with a narrow depth-safety delta:

1. Bound parser structural nesting for braces and parentheses before adding nodes, preserving escape/quote/bracket behavior.
2. Iteratively preflight AST depth and child cycles before compile, expand or stringify recursively traverse it. Shared acyclic nodes remain valid.
3. Fixed AST-edge ceiling **128** (127 nested parsed groups plus leaf). Controlled `SyntaxError` / `ERR_BRACES_DEPTH` replaces stack exhaustion; options cannot remove the ceiling. Ordinary input-length and expansion-range limits remain.

The source delta is [vendor/braces-depth.patch](../../vendor/braces-depth.patch). Full source is reviewable under `vendor/braces`; committed private archive is approximately 7 KB. A direct devDependency plus npm's supported `$braces` override reference routes every consumer to that exact package. No unrelated package version, Next lint rule or app stylesheet changed. [Installed paths](fork-verification/installed-paths.txt).

## Why this is a real correction, not an audit rename

Public npm advisory matching does **not** cover a private fork. A raw zero-finding registry audit is therefore insufficient. The required build still runs the **full** npm audit, supplemented by a fail-closed gate that checks archive/source/installed hashes, the fork identity, duplicate copies and all four runtime consumer resolutions, then executes security regressions. Tampering with installed safety code fails the gate. No advisory suppression, severity change, omit-dev build gate, forged upstream version, force upgrade or automatic repack was used.

Behavioral proof is independent of registry naming:

- The original 3.0.3 control receives a **9,003-character / 4,500-level** pattern within its existing length cap. It produces native stack-exhaustion `RangeError` in expansion on the default local runtime and in both compile/expand under a 256 KB stack. Thresholds vary by JIT/runtime; no claim is made that every default compile invocation overflows.
- The installed fork rejects the same payload deterministically before recursive overflow, also under the small stack. Deep externally supplied ASTs and cyclic child trees are rejected before walking; shallow valid semantics remain.
- **22/22** focused tests cover all exposed operations, braces/parentheses/mixed nesting, supplied trees, cycles, escapes, quotes, bracket contents, valid nested patterns, ranges, duplicate removal, existing range/input limits and negative tamper detection.
- The **764 exact tagged upstream compatibility tests** pass against the installed fork. Upstream tests were unchanged; only their temporary package entry delegated to the installed fork. Temporary Mocha/bash-path test tools did not enter the application manifest or lockfile.

[Original control](fork-verification/advisory-control.json), [security tests](fork-verification/security-tests.txt), [upstream compatibility](fork-verification/upstream-tests.txt).

This patch resolves the reported recursion-depth failure. It does not promise safety for arbitrary untrusted regex/glob complexity, unlimited expansion, malformed custom parent pointers, or every possible denial-of-service input. Build patterns remain trusted repository configuration.

## Verification

- Clean `npm ci --ignore-scripts` installs the committed archive and its normal fill-range dependencies reproducibly. A manual repack reproduces the same archive/source hashes; no lifecycle script fetch or build-time remote patch is needed. Full installed tree has no missing/invalid dependency problems.
- Full npm audit: **0 findings, including 0 high/critical**. Production-only audit: **0 findings**. These are current registry results plus the local fork verification, not upstream certification.
- Required **`npm run build` succeeds**, including its strengthened audit gate, Next production compilation, type/lint validation and static generation. No security or build checks bypassed.
- Existing full regression suite: **2,425/2,425 pass**. TypeScript and lint pass; lint reports no warnings/errors.
- Tailwind **3.4.19** and all existing styling configuration retained. Compiling the actual globals/content against original upstream 3.0.3 versus the installed fork produces **byte-identical 167,576-byte CSS**, SHA-256 `0485b02322157c236fd0682beee3855ab45c24e064b5652a5d3a0d923858ff29`.
- Real local GoTrue/auth/RLS/tenant/minor checks pass. Director browser at **1440/390/375** passes disabled-inference, foreign-goal denial, actual deterministic checkpoint verification and duplicate prevention. Money/Health/Settings viewport and overflow checks run at **1440/390**; owner-only administration remains denied to the synthetic normal member. Reviewed screenshots and sanitized results are in the evidence folder.

**Visual/functional limit:** the local Money dashboard shows its fail-closed data-load state because the canonical synthetic fixture lacks Data API privileges for bill_payments/debt_payments (also learning_profiles/subscriptions requests are denied). No grants were changed to conceal it. Settings and Health render, and CSS output is identical; this is not proof that the complete Money dashboard is functionally validated. Treat this as a local integration limitation for the next scoped DEV verification, not evidence of a fork regression or production outage. [Sanitized endpoint failures](fork-verification/money-local-limitation.json).

## Maintainability, rollback and next action

This is **The Beast-maintained**, not an upstream-supported package. The maintenance scope is one small runtime patch, an explicit private prerelease identity, immutable source/archive provenance, focused security tests and the existing upstream test corpus. Review it on parent dependency/advisory updates; prefer removal as soon as a compatible upstream fix covers every path. Do not silently update hashes or patch during CI/install. Manual packing instructions, update/removal checklist and exact rollback are in [BRACES-MAINTENANCE.md](../../vendor/BRACES-MAINTENANCE.md).

Rollback reverts the isolated package/lock/vendor/gate changes together and runs npm ci; that restores seven findings and correctly closes the build gate. No security waiver is part of rollback. Existing public proposals offer an upstream contribution opportunity if Sean later authorizes one; do not start a duplicate open-source project.

**One next release action:** owner reviews this scoped patch in #267 for integration with #265, then separately approves the already documented targeted DEV migration-history reconciliation, four Director migrations, DEV deployment with inference disabled, synthetic hosted authentication and end-to-end verification. Do not blanket-push divergent migration history. Hosted DEV readiness and production release remain unverified; no hosted changes occurred here.

Avery's locked **23/24 PARTIAL-PASS**, original paid responses, blinded packets and acceptance criteria are unchanged. **Zero paid calls**, no access/change to the existing reusable AI development credential, production mutation, merge, deployment, paid service, or public upstream submission.
