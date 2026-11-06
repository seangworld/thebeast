# Episode tracking and provider Preview — 2026-11-06

Scope: backlog persistence, compact indicator, provider information/corrections. No Production promotion, account-mail activation, native work, paid services, or licensed catalog activation.

## Behavior and starting point

Watched rows remain authoritative. A past air date never changes a checkbox. The applicable aired, unchecked episodes are sorted by season/episode; all remain outstanding and the first is Next to Watch, with its original air date. Coming Up contains future listings; My Schedule also contains the complete outstanding backlog.

The safe default uses the earliest explicitly recorded episode when history exists. Otherwise, the immutable library added-at timestamp selects the latest aired release batch at that time (or the first listed upcoming episode). This avoids importing an older show's entire history as a debt on first add. Missing added-at/history asks for a starting point. The episode screen lets the user save a different starting point. Earlier explicitly unchecked episodes remain outstanding even after a later start is selected. Nothing marks excluded historical episodes watched or rewrites existing progress. Season check/uncheck remains explicit and available across all seasons.

The default is deterministic from existing cloud records, not the current date. Selected starting points and provider corrections are cloud-backed and fetched on reload or when returning to My Library from a hidden tab. Simultaneous different-field settings updates preserve each other's fields; same-episode concurrent writes retain the existing last-write behavior.

## Provider provenance

TVmaze's existing authorized network/webChannel metadata is displayed as original network/platform, separately from US streaming availability. Source attribution remains. The API is not treated as a current US subscription/rights directory. Current streaming availability remains explicitly unverified until a user supplies their own comma-separated providers. Manual corrections can be cleared with Use source metadata. No TMDB/Ticketmaster/UFC feed or commercial licensing was activated. No inferred availability from legacy promotional service labels.

## Database packet

Data project: `zvzcojwjgnedrouilovc`, not canonical Auth. Four nullable columns on the existing library tables: `tracking_start_season`, `tracking_start_episode`, `broadcast_override`, `streaming_override`.

- Isolated Preview only: `database/003_episode_tracking.preview.sql` targets `beastguide_preview` and `beastguide_preview_canonical`.
- Future Production candidate, NOT applied by this assignment: `database/003_episode_tracking.candidate.sql` targets `public` and `beastguide_canonical`. Separate approval required before release.
- No migrations touch Auth, usernames, profiles, identity links, progress, roles, grants, RLS policies, preferences, mail, or schedules.
- Deploying the new frontend requires these columns in its corresponding data scope. Preserve the existing Preview isolation gate; do not target Production data for acceptance.

Before Production approval: apply reviewed additive columns in the data project, then release the matching standalone and imported BeastOS code together. Old code remains compatible with the extra nullable columns. Roll back code to the retained working deployments; keep the additive columns and any user's new settings. Do not drop columns or change watch history during rollback.

## Validation

- Unit tests: time passage, old-series safe baseline, full release batches, future exclusion, explicit check/uncheck, historical unchecked overrides, compact labels, provider provenance/unknowns.
- Actual local PostgreSQL: exact Preview migration does not alter Production schemas; existing identities/library fields/watch rows preserved; forged owners rejected; two independent cloud clients synchronize baseline/providers/progress; partial updates preserve fields and creation dates.
- Browser acceptance: built standalone and same-origin BeastOS-launch fixtures on desktop Chromium and mobile WebKit; indicator focus, check/uncheck/count updates, outstanding/future schedule separation, manual provider save/reload, historical checkbox readback, no overflow or runtime exceptions. Synthetic accounts only. These are not physical iPhone or live cross-device acceptance claims.
- Existing authentication/linking/account isolation and manual sports/event browser regressions retained.

Production deployments and all custom account-mail flags must remain unchanged. Physical iOS 26.2 standalone acceptance remains an owner/device check.

## Consolidated host candidate

Source PR: https://github.com/seangworld/beastguide/pull/11 at `dc1d1e9792fdb3776f25857cf6cc091a8888c855`. Imported with hash verification, without hand-edited bundles. BeastOS baseline: `0c6966ee693ee6c0016d8a21d6884a2b8d165247`; dormant mail-fix PR #318 is excluded.

Host validation: 2,740 regression tests pass; full required build including staff/history checks, artifact safeguards, account-mail tests and local DB/security checks passes, with zero audit vulnerabilities. Shipped-artifact Chromium/WebKit frame-policy tests pass and retain external/nested frame denial.

Existing protected acceptance branch `codex/beastguide-phase1-current` is reused via fast-forward to this reviewed candidate, retaining its exact approved Preview origin, isolated role credentials and callback. No hidden secret copying, configuration widening or Production environment changes. The source and import PRs remain unmerged.

Preview-only additive migration was applied and verified: four settings columns in each isolated Preview library; zero settings columns in either Production library. Production schema migration and deployment require separate approval.
