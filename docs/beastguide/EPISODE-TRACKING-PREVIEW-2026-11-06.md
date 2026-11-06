# Episode tracking and provider Preview — 2026-11-06

Scope: backlog persistence, compact indicator, provider information/corrections. No Production promotion, account-mail activation, native work, paid services, or licensed catalog activation.

## Behavior and starting point

Watched rows remain authoritative. A past air date never changes a checkbox. The applicable aired, unchecked episodes are sorted by season/episode; all remain outstanding and the first is Next to Watch, with its original air date. Coming Up contains future listings; My Schedule also contains the complete outstanding backlog.

The safe default selects the latest aired release batch at the immutable library added-at timestamp (or the first listed upcoming episode), widened to include any earlier explicitly recorded history. Checking a later episode never advances this default past an earlier outstanding episode. This avoids importing an older show's entire history as a debt on first add. Missing added-at/history asks for a starting point. The episode screen lets the user save a different starting point. Earlier explicitly unchecked episodes remain outstanding even after a later start is selected. Nothing marks excluded historical episodes watched or rewrites existing progress. Season check/uncheck remains explicit and available across all seasons.

The default is deterministic from existing cloud records, not the current date. Selected starting points and provider corrections are cloud-backed and fetched on reload or when returning to My Library from a hidden tab. Simultaneous different-field settings updates preserve each other's fields; same-episode concurrent writes retain the existing last-write behavior.

## Provider provenance

TVmaze's existing authorized network/webChannel metadata is displayed as original network/platform, separately from US streaming availability. Source attribution remains. The API is not treated as a current US subscription/rights directory. Current streaming availability remains explicitly unverified until a user supplies their own comma-separated providers. Manual corrections can be cleared with Use source metadata. No TMDB/Ticketmaster/UFC feed or commercial licensing was activated. No inferred availability from legacy promotional service labels.

## Database packet

Data project: `zvzcojwjgnedrouilovc`, not canonical Auth. Four nullable columns on the existing library tables: `tracking_start_season`, `tracking_start_episode`, `broadcast_override`, `streaming_override`.

- Isolated Preview only: `database/003_episode_tracking.preview.sql` targets `beastguide_preview` and `beastguide_preview_canonical`.
- Future Production candidate, NOT applied by this assignment: `database/003_episode_tracking.candidate.sql` targets `public` and `beastguide_canonical`. Separate approval required before release.
- No migrations touch Auth, usernames, profiles, identity links, progress, roles, grants, RLS policies, preferences, mail, or schedules.
- Deploying the new frontend requires these columns in its corresponding data scope. Preserve the existing Preview isolation gate; do not target Production data for acceptance.

Only after explicit Production approval: apply reviewed additive columns in the data project, then release the matching standalone and imported BeastOS code together. Old code remains compatible with the extra nullable columns. Roll back code to the retained working deployments; keep the additive columns and any user's new settings. Do not drop columns or change watch history during rollback.

## Validation

- Unit tests: time passage, old-series safe baseline, full release batches, future exclusion, explicit check/uncheck, historical unchecked overrides, compact labels, provider provenance/unknowns.
- Actual local PostgreSQL: exact Preview migration does not alter Production schemas; existing identities/library fields/watch rows preserved; forged owners rejected; two independent cloud clients synchronize baseline/providers/progress; partial updates preserve fields and creation dates.
- Browser acceptance: built standalone and same-origin BeastOS-launch fixtures on desktop Chromium and mobile WebKit; indicator focus, check/uncheck/count updates, outstanding/future schedule separation, manual provider save/reload, historical checkbox readback, no overflow or runtime exceptions. Synthetic accounts only. These are not physical iPhone or live cross-device acceptance claims.
- Existing authentication/linking/account isolation and manual sports/event browser regressions retained.

Production deployments and all custom account-mail flags must remain unchanged. Physical iOS 26.2 standalone acceptance remains an owner/device check.

## Final migration-gate correction — prepared, not deployed

The original unguarded packet is retained only as `tests/fixtures/episode-tracking-v1.sql` for compatibility regression. Never use that fixture as release SQL.

The corrected Production candidate has guarded column additions and guarded constraint creation. Existing columns must match the exact integer/text/text-array types, dimensions and collation; remain nullable and local; and have no stored default, missing-value default, identity or generation metadata. PostgreSQL may normalize a literal DEFAULT NULL into no stored default; that catalog-equivalent state is accepted and tested. Existing constraints must match PostgreSQL's parsed approved definitions and be local, validated, inheritable, nondeferrable checks. Unexpected constraints involving these settings columns are rejected. Incompatible values in a partial schema cause an explicit error, never a corrective update.

A transaction, shared advisory lock, access-exclusive locks on ONLY the two target tables, five-second lock timeout and sixty-second statement timeout bound the operation. Table inheritance or concurrent table replacement fails closed. The expected definitions are parsed in a temporary table with a trusted search path; it disappears at commit. No permanent helper objects, user-data writes, default changes, type conversions, grants or policy changes are performed.

Repeated successful executions preserve rows/tuple versions, populated settings, attribute/constraint identities, policies and grants; compatible partial schemas are completed. Drift causes the entire packet to roll back, including earlier additions to the other table. Runtime UI/worker code is unchanged by this correction.

Production migration SHA-256: `8ba0d1e19ac75ecefba762a65775464e10e6549ed82ce8a0514dec77d06307c4`.

Validation commands: `npm test`, `npm run test:identity-db`, `npm run test:episode-db`, `npm run check`, `npm run build`, `npm run test:episode-browser`, and `npm run test:identity-browser`. The episode database command includes 28 migration tests plus the existing two-device cloud-sync test. The six identity PostgreSQL tests remain active. Browser contexts use synthetic identities and local PostgreSQL; physical iOS 26.2 and live authenticated two-device acceptance remain separate limitations.

## Authorization and exact release order

Preparation is local only: no migration was applied to either hosted environment, no PR was merged, and no application was deployed. Pushing these PR branches triggers Vercel; therefore the revised local commits have not been pushed under the no-deployment boundary. The previous Preview remains available with the same application bytes.

After the owner approves the exact revised source/import commits and migration checksum:

1. Publish the two prepared commits to their existing PR branches; allow their Preview checks to finish and reconfirm heads/artifact hashes. Preserve both projects' `autoAssignCustomDomains=false` batch policy.
2. Reconfirm permanent-domain aliases, working rollback deployments and database recovery readiness. Capture read-only account/username/mapping/progress/preferences fingerprints and original library-column projections. Full library JSON hashes naturally change when nullable columns are added; compare the original columns for preservation.
3. Apply only `database/003_episode_tracking.candidate.sql` in the existing entertainment data project `zvzcojwjgnedrouilovc`, never canonical Auth `grpyzwvgqiwtxadfdtni`. Verify four nullable columns and three validated checks in each Production library table and preservation evidence. Stop on any drift, locking, validation or preservation failure.
4. Merge source PR #11 and build its Production candidate without automatic custom-domain assignment; validate the candidate, then promote through the existing workflow to BeastGuide's permanent website.
5. Merge BeastOS PR #321 with its exact matching source manifest, build/validate its Production candidate, then promote through the existing batch workflow. Verify direct and BeastOS-launched Guide access, library saves, check/uncheck persistence, schedules and provider corrections. No account creation or changes to existing usernames are required.
6. Recheck original-data preservation and all three custom-mail flags OFF. Retain both previous deployments and record actual merge/deployment commits and domain mappings.

## Rollback and stop conditions

- BeastGuide working Production: deployment `dpl_FT4MR4AUoXp8DfqfFAKu2aKcA8or`, commit `c621f388840f4005386dddef249635cfb5a88b37`.
- BeastOS working Production: deployment `dpl_2CNsDyupKfP7qLeryRUQoDxGkCzv`, commit `0c6966ee693ee6c0016d8a21d6884a2b8d165247`.
- If DDL fails before commit, roll back that transaction; no partial additions or user-data changes remain. If it succeeds but an application fails acceptance, return that application's permanent aliases to its retained working deployment (both applications if necessary).
- Keep all four nullable columns, validated checks, and every user's settings after a successful migration. Old applications tolerate the extra fields. Do not drop populated columns, reset progress, restore an old whole database over newer activity, or undo unrelated migrations as a release rollback.
- Stop before promotion if database recovery readiness, exact hashes, configuration or validation fails. Mail activation, SMTP changes, account-permission changes, new provider licensing and App Store work are excluded.

## Paired BeastOS final candidate

Prepared source: `191631e6e556509975266a74e5325bf624d77b3b`, based on PR #11 head `b5271a00b7a936f70868d3e13d44f1c39f4907ff`. This host candidate is based on PR #321 head `e02f8be27e8cd8223a8fc81a65f0710c7f3a2485`. Only migration tests/documentation and source provenance changed; all 17 rebuilt application/runtime file hashes match the existing protected Preview. The verified import manifest records the revised source commit; bundles were not hand-edited.

The prepared commits are local only. Publishing the existing PR branches automatically triggers Vercel Preview builds, so publication, merge, hosted migration and application deployment remain pending authorization. The existing Production deployments and protected Preview are retained. Dormant account-mail PR #318 is excluded; account-mail flags stay OFF. No Auth project migration is included.

Final local validation: 69 Guide unit tests, 29 episode PostgreSQL tests (28 migration plus one sync), six existing identity PostgreSQL tests, 2,740 BeastOS tests, both required builds and syntax/artifact/security gates pass; audit reports zero vulnerabilities. Built-app desktop Chromium/mobile WebKit direct and same-origin embedded scenarios, existing identity/browser regressions and shipped-artifact frame-policy navigation tests pass. Reproduced export matches all 17 previous Preview file hashes.

Read-only hosted evidence at preparation: both Preview scopes still have four approved-shaped nullable settings columns and the original three validated checks; both Production scopes still have zero settings columns. Before/after fingerprints match across all 17 Production entertainment/identity datasets and canonical Auth users/profiles/usernames/sessions/jobs. Counts remain 15 accounts, 15 profiles, five assigned usernames, 23 library entries across the two Production scopes and 204 legacy episode-progress records. No existing user data was altered to satisfy tests. Both documented rollback deployments report Ready; both projects retain automatic custom-domain assignment disabled; all three custom-mail flags are false.
