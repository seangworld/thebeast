# BeastOS / BeastGuide onboarding correction release packet

## Roadmap Item

- Current owner assignment: correct confirmed Profile navigation and required signup/setup continuity; preserve pending title selections; apply Guide-only no-18+ policy, preserve restricted-module authorization, release design and existing data.
- Primary executor: Codex. Companion: seangworld/beastguide PR #12, source fe6bb378270d8fd0fb62cd528f30708b453b3dc3. Existing Issue #308 is the acceptance history; this receipt supplements it rather than reopening completed work.

## Validation

- BeastOS: 2,744 tests pass. Production build passes staff-dossier, imported Guide artifact integrity, account-mail security/PostgreSQL checks and registry security audit (0 vulnerabilities).
- Guide: 73 unit tests, 6 identity PostgreSQL tests, 29 episode PostgreSQL tests pass. Syntax, production regression/build gates and browser suites pass. Identity suite covers session restoration, expiry, verification callback, required own-profile completion in Guide, pending Add through login/reload with explicit cloud save, account isolation, forged-owner rejection, events, artwork and seven responsive widths. Episode suite covers Chromium desktop and WebKit iPhone emulation, direct/embedded use, oldest unwatched/backlog counts/check/uncheck/future separation/providers/history and top-level Profile navigation with unchanged CSP.
- Signup validates all five fields; red required marks and exact notice are visible. Invalid submissions retain in-memory fields. Passwords never enter profile metadata, URL or browser storage. Canonical signup legacy bypass is closed when universal signup is active. Existing email login stays available.
- The existing own-profile RLS update path fills ONLY missing name/birthday after verified identity and active session checks. Optimistic updated_at prevents overwriting concurrent edits. No username, role, permission or existing nonempty profile field is updated. Existing accounts are never re-registered.
- Guide-only registry minimumAge becomes 0. Server middleware and module API/page guards continue using the existing canonical entitlement resolver. Tests preserve Money/Health minor denial and explicit disabled-module override denial. No global age or child-account policy is removed.
- Read-only Production inspection confirms required profile fields and own-profile RLS already exist. Aggregate snapshot: 15 canonical Auth accounts, 15 profiles, 5 usernames; 15 legacy + 8 canonical library records; 212 legacy episode-progress records. No Production mutation performed. User activity may legitimately change fingerprints before release; capture fresh fingerprints at promotion.
- Browser tests use synthetic Auth and local PostgreSQL. No fresh live email click, real signup, or new installed-iPhone acceptance was performed. Owner's prior real-iPhone success is retained as evidence; WebKit emulation is separately identified.
- BeastFusion's existing deterministic mandatory-execution-report validator checks this receipt. No agent execution/evaluation, paid inference or BeastFusion modification.

## Execution Timeline

- Start timestamp: not recorded
- Completion timestamp: not recorded
- Total elapsed duration: not recorded

Execution timing unavailable.

## Git Status

- Commit: implementation is the companion PR head; exact deployed/source commit recorded by GitHub/Vercel release receipt
- Branch: codex/guide-onboarding-navigation
- Worktree: isolated /private/tmp/beastos-kenny-feedback-20261104; original owner workspace untouched
- Ahead/behind status: candidate based on released origin/main 6823b4ebcf106f64e30782f4da537654d807da45

Imported 18-file Guide SHA-256 manifest: src/vendor/beastguide/manifest.json. This includes shared validated profile bootstrap; client uses the existing canonical publishable client and RLS, never a service-role credential.

## Deployment Status

- Deployment occurred: No

Application corrections are prepared for PR/Preview. Guide Preview dpl_GcibEh4QCPQbm6FA1sbxTxoNmpFY is READY at the exact Guide source above. Current Production is unchanged: Guide 5e7814ee7d6080a34e338fc236500ab883118aa5 / dpl_Fix7N6JpTdeHpqvUuz11hM27FQAm; OS 6823b4ebcf106f64e30782f4da537654d807da45 / dpl_E6GWm86oEsjfkNgCNogs2t5Su3Vu. Retain both for rollback and preserve batch auto-assignment=false.

No migration, Auth configuration, credential, role, provider or scheduler change. Following the existing AGENTS.md authorization limit, obtain approval covering these new exact PR heads before gated merge/Production promotion. Previous episode-release authorization covers the previously released commits, not these new authentication/setup corrections.

After approval: confirm heads/checks, READY rollback and mail flags OFF; fresh read-only preservation fingerprints; merge/build/smoke-check exact Guide changes and promote Guide first; merge/build/smoke-check OS with the imported artifact and promote OS second; verify permanent sites, embedded launch/top-level return and read-only preservation. Roll back application aliases to retained deployments if necessary. Do not drop or alter episode settings columns. No mail dispatcher, queue retry or backup schedule activation.

## Manual Actions

- Owner Production authorization for the final paired PR heads under the existing release gate. No new workflow or new approval stage.
- Account email remains paused. Native, automatic cross-origin SSO and licensed provider expansions remain outside this correction. Separate origin browser sessions can still require a sign-in; embedded Guide reuses the existing OS session. Existing username-less accounts retain the canonical claim flow, with safe Guide return destination.
