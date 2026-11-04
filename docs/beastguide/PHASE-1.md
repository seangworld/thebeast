> Current release authority: [CONSOLIDATED-RELEASE.md](CONSOLIDATED-RELEASE.md). Historical observations below are retained; the owner accepted current auth evidence, the tooling blocker is resolved, and SMTP/Resend proposals are superseded. Unperformed tests remain unperformed.

# BeastGuide in BeastOS — Phase 1 acceptance candidate

Tracks [#308](https://github.com/seangworld/thebeast/issues/308). Canonical base: main `3a41e80a`. Independent BeastGuide source: `seangworld/beastguide`, commit `8d6d137`. This candidate is not released.

## Implemented experience

BeastGuide appears in Applications when `NEXT_PUBLIC_BEASTGUIDE_ENABLED=true`. `/dashboard/beastguide` opens the independently maintained entertainment UI using the exact BeastOS browser client, existing persistent cookies and current account. It does not create a second canonical Auth client. Profile account management goes to BeastOS. Sign-out removes the embedded session; listener cleanup prevents a closed frame retaining subscriptions. Direct embedded-document bookmarks provide a link back through the protected BeastOS route.

Discover, My Library, episode/season checkmarks, collections, manual movies/events and preferences remain BeastGuide-owned code. The existing server gateway preserves legacy data ownership after explicit fresh dual-identity proof and consent; it never matches accounts by email. The six entertainment table allowlist excludes unrelated BeastOS application tables. Original hosted records have not been migrated, exported, reset or deleted.

Canonical BeastOS signup/onboarding remains unchanged. No BeastGuide-only registration endpoint, Auth trigger guard, service-role browser key, new Supabase project or separate identity service is activated. Earlier optional enrollment work remains preserved on its original historical branch and is not included here. Existing adult/profile eligibility is reused. Existing editable member module overrides cover Money/Education; this candidate does not expand that shared table or claim new per-member controls.

## Maintain one application codebase

From a clean committed BeastGuide checkout:

```
node scripts/export-beastos.mjs artifacts/beastos-phase1
```

Then from BeastOS:

```
node scripts/import-beastguide.mjs /absolute/path/to/beastguide/artifacts/beastos-phase1
```

The import validates every manifest SHA-256 before replacing only `public/beastguide-app` and `src/vendor/beastguide`. Review application changes in the BeastGuide source repository; do not edit generated snapshots. Embedded builds ignore standalone .env files and receive their account client/public configuration from the host. No scoped database password was found in the public artifact.

Only the two BeastGuide document routes receive same-origin frame permissions; other pages retain their existing framing restrictions, including Atlas's separate microphone policy. The embedded document alone permits the TVmaze connection required by existing show tracking. Catalog/sports licensing gates and reminder-delivery limitations are preserved.

## Configuration and rollback

Existing BeastOS public Supabase configuration must point to canonical `thebeast`. The flag defaults off; registry entries/navigation are absent until enabled, preserving existing module dashboards/counts. `NEXT_PUBLIC_BEASTGUIDE_LEGACY_PUBLISHABLE_KEY` is optional linking configuration and must be a public key.

Server `BEASTGUIDE_DATA_ENABLED`, `BEASTGUIDE_ORIGIN`, `BEASTGUIDE_TARGET`, `BEASTGUIDE_PREVIEW_LINK_DATABASE_URL` and `BEASTGUIDE_PREVIEW_DATA_DATABASE_URL` configure protected acceptance. Preview target/roles cannot access production entertainment namespaces. Production roles are still NOLOGIN; no production credentials were activated. The original gateway retains TLS/hostname verification, upstream user/session validation, least-privilege roles and RLS. The official Supabase database CA is pinned publicly in the source; certificate verification is never disabled.

Disable the two feature/data flags to retire the candidate, retain existing production aliases, and revoke only the Preview roles if necessary. Keep all original records and mapping tombstones. Never roll back by dropping tables, deleting accounts, changing global project passwords or migrating IDs. Production activation requires separate owner approval and fresh preservation checks.

## Verification and remaining gates

- BeastGuide: **40/40 tests**, syntax checks and standalone/embedded production builds passed.
- Current BeastOS: **2,688/2,688 full-suite tests** passed with four concurrent workers, including five actual React wrapper tests (verification-before-entry, failed verification, logout cleanup, navigation race and Preview test-data mode). The first unconstrained earlier run had one unchanged Agency worker fail; that file and both bounded full-suite runs passed. No Agency source was modified.
- Current BeastOS `next build` passed, including type checks. Staff-dossier checks and change-base validation passed; no agent duties/configuration changed.
- `npm audit --omit=dev`: **zero vulnerabilities**. The required unmodified `npm run build` is **BLOCKED** at its full npm audit by **18 moderate development-tooling findings**, all derived from minimatch GHSA-g3hv-75wg-m249. No high/critical findings. Its protected dependency/audit gate was not weakened or skipped for a release claim. Current main already contains the earlier Next/sharp fixes; no framework update is included here.
- Browser: real existing SSR cookie library plus actual local PostgreSQL/RLS, with explicitly synthetic upstream Auth identities/provider responses. Shared entry without a second login, reload persistence, episode save/readback, preference readback in a second tab, account isolation and cross-tab logout passed. Phone 390 and landscape 844 rendered without horizontal overflow. This does not prove live canonical registration, real identity linking or two physical-device synchronization.
- Hosted: both approved Preview-only role logins passed CA/hostname-verified TLS, NOSUPERUSER/NOBYPASSRLS, connection limit 3. No private rows were returned.

Do not promote this candidate while the required build gate fails. Resolve the shared development-tooling advisory through a reviewed compatibility-safe fix; do not force minimatch 11 over legacy callers or lower the gate silently. The upstream advisory is [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Protected existing-project acceptance is now configured on branch `codex/beastguide-phase1-current`: ten branch-only Preview variables, two database URLs stored as sensitive, canonical public Auth configuration, Preview-only roles and the exact branch origin. No Production variable was changed. One exact canonical `/auth/callback` redirect was added for that branch; canonical Site URL and all earlier redirects were preserved. The embedded UI explicitly labels isolated acceptance records and does not promise to copy/display original production libraries. The Vercel Git integration can produce a READY Preview while the local full audit gate remains blocked; this is controlled acceptance, not release approval. Owner-controlled live acceptance must cover existing sign-in, new canonical onboarding, fresh proof to both identities before linking, refresh/relaunch, two actual devices, disabled sessions, foreign-owner read/write rejection, and profile/preferences/progress continuity. Keep production aliases/environment unchanged.

Resend Free account/domain verification is complete. Shared SMTP changes and application test emails are still pending scoped owner approval after impact review: canonical sender changes affect BeastOS verification, sign-in and recovery across the ecosystem. Do not create paid services or change SMTP as an incidental integration step. The two confirmed test mailboxes are retained privately; do not infer existing account ownership from mailbox equality.

Existing organization egress was last observed at 1.038/5 GB (21%), with zero current overage; the November 16 notice is conditional. Verify fresh headroom/healthy services before live expansion. Real-data backup remains held for independent secure-path verification and separate execution approval; no private rows may enter agent responses/logs/plaintext exports.

**Phase 1 is implemented and locally verified, not live-accepted. Phase 2 standalone completion and Phase 3 App Store packaging remain pending.**

## Hosted acceptance entry

[Protected BeastOS acceptance](https://thebeast-git-codex-beastguide-f18023-seangworld-3898s-projects.vercel.app/login?next=%2Fdashboard%2Fbeastguide). The owner must enter their existing Beast credentials. Do not send an email, register a new account, or change SMTP implicitly. Production deploy IDs verified unchanged during staging: BeastOS `dpl_4MCXE648MgieNGoZFUVadBbat6y1`; standalone BeastGuide `dpl_DzkQezPeio82sTa5wWbDRgTAMJN2`.
