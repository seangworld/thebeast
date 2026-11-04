# Shared authentication execution record — November 3, 2026

## Current retained database state

Version 20261103235724 is installed in both the development/data project and
canonical production thebeast. The owner reviewed and retained the production
migration. The two production fingerprint differences were resolved read-only:
only existing push-scheduler timestamps changed; reconstructing those timestamps
inside SELECT expressions reproduced both saved baselines exactly. Existing
account/profile records and original Auth triggers remain intact. No rollback
was performed. Historical development execution notes below remain historical.

Canonical application integration is being validated on a protected Preview;
Production application promotion and BeastGuide identity cutover remain gated.
No schema, trigger or SMTP changes are included in this application work.

## Latest result — development migration accepted

This section supersedes the earlier connector-blocked execution status below.
The approved migration was applied only to `the-beast-dev`
(`zvzcojwjgnedrouilovc`) through the authenticated project-local Supabase CLI.
The CLI execution passed the normal execution approval review; no credentials
were extracted and no confirmation setting was disabled. The exact reviewed SQL
ran in one transaction with collision guards and standard migration-history
bookkeeping. Installed version: `20261103235724`; the stored SQL matches the
reviewed source exactly. Canonical production and application deployments were
not touched.

Hosted acceptance passed tagged/untagged registration-trigger behavior,
case-insensitive uniqueness, collision rollback, verified existing-ID claims,
metadata immutability, limiter behavior, anonymous/authenticated RPC and table
access denial, unrelated-owner RLS isolation, and removal of only the new trigger.
All test writes and trigger removal were rolled back. Final readback confirms
the new trigger is enabled, both registry tables have RLS, only service_role can
execute the three gateway RPCs, and zero fixture rows remain.

All 12 Auth accounts, 12 profiles, 14 library rows and 164 episode-progress rows
match their immediate preflight content digests. Existing policies, trigger
bindings and trigger-function definitions are unchanged. Security advisors found
only the expected INFO notices for the private deny-by-default RLS tables with
no client policies. No migration blocker remains. These are hosted database
acceptance results, not live mailbox/password/browser acceptance.

## Fixed targets and authority

Owner authorized the five-phase implementation, development rehearsal, subsequent
canonical migration after successful rehearsal, and release after acceptance.
This is not missing owner authorization. Canonical identity remains production
`thebeast` (`grpyzwvgqiwtxadfdtni`). Existing entertainment records remain in
`the-beast-dev` (`zvzcojwjgnedrouilovc`). No new identity project or service.

Reviewed existing BeastOS PR #309 (`codex/beastguide-phase1-current`, isolated
checkout `/private/tmp/beastos-identity-20261102`) and BeastGuide PR #3
(`/private/tmp/beastguide-release-20261102`). Existing consent-based dual-proof
mapping, independent standalone build and embedded host-client reuse are retained.
No automatic email-based account merge, data re-keying or replacement architecture.

## Development migration packet

Exact source: `supabase/migrations/20261103235724_universal_authentication.sql`.
SHA256: `1c3a9d15cfd54274fdf364418b24439c0ac81af1a2ea44a76838a37ca9f72769`.
Target for this attempt ONLY: `the-beast-dev`, development rehearsal.

Preflight: both projects reported ACTIVE_HEALTHY. No beast_identity schema,
conflicting gateway functions or beast_register_username trigger exists in the
development project. Existing trigger definitions were inspected. No existing
function or policy is replaced. The migration adds two RLS-enabled private tables,
service-only RPCs, and a username registration trigger. The new limiter function
can update/delete only its own rate buckets; it does not run during installation.
The new foreign-key cascade deletes registry mappings only if their Auth user is
separately deleted, never Auth users or entertainment records.

Local PostgreSQL rehearsal verified untagged signup preserves existing profile
creation; tagged signup canonicalizes the name; case collisions roll back the
new user/profile; metadata updates cannot rename identities; verified claims retain
IDs; public/authenticated access is denied; limiter budgets reset; removing only
the new trigger retains existing signup behavior. The exact hosted acceptance SQL
also passed against local PostgreSQL and rolled back its fixture writes/trigger
removal. These are database tests, not live Auth/mailbox tests.

`supabase/tests/universal_auth_acceptance.sql` is the reviewed post-migration
packet: one transaction, synthetic Auth/profile rows, no email, no existing-record
updates, and final ROLLBACK. It must be run only after the selected project has the
registry. Do not claim email verification, SDK login or SMTP delivery from these
SQL tests. Capture fresh before/after account, profile, library, progress, policy
and trigger-definition fingerprints around any future hosted execution.

## Execution outcome

One development `apply_migration` attempt under the latest five-phase instruction
returned INVALID_ARGUMENT: confirmation expired. No repeat request was submitted
under that instruction. No CLI/SQL-editor path was used to bypass confirmation.
The connector must complete its confirmation/execution step before hosted rehearsal
can proceed. Canonical production migration remains gated on rehearsal acceptance.

Final read-only development verification: schema absent, migration record count 0,
new trigger absent. All account/profile/library/progress content digests and the
existing-policy digest match the immediate preflight:

| Surface | Rows | MD5 of complete ordered JSON rows |
| --- | ---: | --- |
| Auth users | 12 | 76080796be13b3a3dbc7574f32bf1356 |
| Profiles | 12 | bd3195306bf24ec907b4748b3318b5a6 |
| BeastGuide library | 14 | 042c71de61d60dadbee99c90c65c4e74 |
| Episode progress | 164 | e15c902e3a6191e3bbb064196996184d |

Existing policy digest: `46f987cda3f46d6c20712b1493ea8ec9`.
Only counts/digests were returned; no private rows were exported.

## Non-destructive rollback procedure — prepared, not needed or executed

First disable the application feature flag BEAST_UNIVERSAL_AUTH_ENABLED and unmount
its optional interface. Restore the previous deployment if a candidate was released.
Then remove only the new trigger and suspend the new gateway RPCs:

```sql
begin;
drop trigger if exists beast_register_username on auth.users;
revoke execute on function public.beast_auth_identity(text) from service_role;
revoke execute on function public.beast_auth_claim(text, uuid) from service_role;
revoke execute on function public.beast_auth_attempt(text, integer) from service_role;
commit;
```

Keep all Auth users, profiles, registry mappings, application records, original
triggers, existing policies and migration history. No DROP SCHEMA CASCADE, table
drops, customer-record DELETEs or auth-credential resets. On reactivation, recreate
only the reviewed trigger and restore only these explicit grants. Existing users
created while the feature was active retain their original IDs and records.

## Current verification

- Workspace full suite: 1,619/1,619 passed; prior version-expectation failure fixed
  by comparing against the canonical manifest rather than freezing an old version.
- Nine gateway/policy tests cover persistent successful-login cookies, private
  failure parity, limits, disabled/unverified/wrong-subject rejection, session-control
  denial, verified ownership claims and database failure closure.
- Eleven local PostgreSQL check groups passed, including exact hosted packet.
- Existing BeastOS PR branch before foundation extension: 2,688/2,688 passed.
  After adding the dormant username foundation: 2,697/2,697 passed.
- BeastGuide: 40 unit tests and 6 actual PostgreSQL integration tests passed.
- BeastGuide browser smoke passed reload, refresh, dual-proof linking, episode
  readback in a second browser context, unrelated-account isolation and forged-owner
  denial. Upstream Auth was simulated; this is not live or physical-device evidence.
- TypeScript, changed-file ESLint and diff whitespace checks passed in the workspace.
- The new foundation was copied into the existing PR #309 checkout as dormant,
  uncommitted source for integration; no remote push or deployment was triggered.
- Vercel connector returned 404 for the recorded existing project. The supported
  read-only CLI fallback successfully confirmed BeastGuide's exact project ID and
  team. No deployment, production alias or environment setting was changed.

Live registration/verification/recovery, canonical username/password use across
both apps, real identity linking, cross-device acceptance and release are pending.
Existing canonical SMTP was previously inspected as built-in and CAPTCHA disabled;
those observations are not proof of delivery readiness. Do not enable the new
mandatory-CAPTCHA gateway without validating the configured provider/widget and
preserving existing recovery/login compatibility. Existing verified Resend Free
preparation may be reused; no new provider, key, paid service or SMTP change was
made by this work. New credential setup and live password changes must follow the
appropriate secure owner-controlled path.
