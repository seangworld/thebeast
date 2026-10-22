# Staff Management release security patch — October 22, 2026

The first retry of the official npm audit surfaced Next.js 15.5.27 advisories. The initial 15.5.28 trial incorrectly left the existing `next@15.5.27` security override behind. Its vulnerable default PostCSS path was not evidence that a major framework migration was required.

## Compatible remediation

- Next.js and eslint-config-next: 15.5.27 → 15.5.28; only their corresponding Next packages change in the lockfile.
- Retarget the existing scoped override to `next@15.5.28`, retaining PostCSS 8.5.23 and Sharp 0.35.5. No new arbitrary override or suppression.
- Next.js's upstream advisories explicitly identify 15.5.28 as patched: [image optimizer RCE](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions DoS](https://github.com/advisories/GHSA-p3m5-59mp-jv5r).
- PostCSS's [incomplete source-map fix advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) identifies 8.5.23 as patched. [Path traversal](https://github.com/advisories/GHSA-r28c-9q8g-f849) was fixed in 8.5.18.
- Clean `npm ci --ignore-scripts` restores installed dependencies from the reviewed lockfile before verification. Installed paths: next 15.5.28 → postcss 8.5.23 / sharp 0.35.5; direct/Tailwind/autoprefixer PostCSS remains 8.5.26. Tailwind remains 3.4.19, React remains 18, and the existing Node engine requirement remains supported. No major migration.
- The existing security-pin test now asserts the patched Next/lint version and checks the override keyed by the actual declared Next version, preventing the demonstrated mismatch.

## Local verification

- Full npm audit: zero vulnerabilities; unchanged security-gated `npm run build`: PASS, including 22 braces fork/security checks and Next production compilation/type checking.
- Application regression suite: 2,559 passing. These are local software checks, not agent competency assessments.
- Dossier maintenance guard: 2 passing; offline source/history completion check passes against origin/main.
- Separate lint and TypeScript checks and responsive component verification are recorded in the release tracking comment after completion.
- No agent settings, prompts, permissions, historical assessments, dates or accounting changed. No paid inference, evaluation cycles, purchases or new services.

Hosted preview/production status and final commit/deployment identities are recorded on PR #277 and Issue #274 after confirmation. Rollback is the preceding production deployment; do not roll back the security patch without assessing the known advisories. No database migrations are part of this release.
