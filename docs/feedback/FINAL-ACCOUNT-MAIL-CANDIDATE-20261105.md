# Final account mail release candidate — PR #313 and Issue #316

Primary executor: Codex. Owner authorized implementation/reconciliation, not production activation. Reconciled the existing `codex/canonical-username-mail` branch with production main `a2e76db3d9828ed88824981bcaf317f05892967e` in merge commit `838f30e5`. Resolved only migration registry/list conflicts by retaining both pending mail and deployed member-username migrations. Required migration inventory is now 136 files.

## Scope and resulting behavior

Username selection immediately shows the actual canonical username. The existing private registry insertion queues one informational confirmation; delivery uses only the account's current verified, active email. Existing mappings are never renamed or backfilled. Choosing a username before verification queues its confirmation until the email is verified.

Forgot Username emails either the exact canonical username or setup instructions to a verified account's registered email. Existing, unknown, unverified and rate-limited requests retain a neutral public response, including a partial queue failure that could otherwise distinguish an existing account. Queue errors produce only a fixed private diagnostic tag, never a different membership-dependent response. The existing secure recovery-link implementation remains available and is the deployed default. Keep `NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED=false` until an explicitly approved existing-account mail test has actually verified delivery; do not substitute a rendered template/preview for that acceptance.

Issue #316 is implemented centrally by an `AFTER INSERT ON auth.users` trigger, not a login or verification handler. Every new canonical Auth account produces a private `owner_registration` outbox event with a unique `registration:<Auth user UUID>` key. The event captures the original registration email/time before verification. Verification, username selection, email updates and login do not create another owner event. All applications using canonical Auth, including Guide and future Beast applications, are covered without duplicating per-app registration hooks.

The configured owner recipient must match a current verified, active canonical admin account. It is a private server setting, never browser input. The email contains the registration date/time (UTC), registered address, Pending verification status for ordinary public signup, and the fixed BeastAdmin Members link. An administrative/import account already verified at creation is truthfully labeled Verified at account creation. Current user metadata does not prove originating app; origin is deliberately omitted rather than trusting a forgeable value. No password, auth token, private library/progress record or user metadata is included. Informational recovery links additionally strip callback query parameters/fragments and arbitrary nested queries while retaining the safe requested application destination.

## Existing infrastructure and immediate dispatch

One existing pending migration is extended; there is no additional identity store, provider, database project, queue service or SMTP account. The already-prepared private `beast_identity.account_mail_outbox` is reused for all three message types.

Read-only production inspection confirmed existing `pg_net` 0.20.0, Vault 0.3.1, pg_cron 1.6.4 and `extensions.hmac(text,text,text)`. An outbox INSERT wakes the existing Vercel `/api/cron/account-mail` handler through existing asynchronous pg_net. Per Supabase, HTTP is started only after the database transaction commits. Registration never waits for SMTP and never depends on verification/first login to trigger the owner event.

The existing pg_net request queue grants SELECT to client roles. Therefore the queued HTTP request MUST NOT contain the reusable dedicated dispatch key, SMTP credential, account identifier or email. The request carries only a timestamp, nonce and HMAC-SHA256 signature; POST validates a two-minute window and consumes the nonce once using the existing private rate-limit mechanism. The payload is `{}` and the fixed worker cannot accept a requested recipient/account. SQL uses the independent BEAST_ACCOUNT_MAIL_DISPATCH_SECRET through its encrypted Vault binding; the raw key never enters the request queue. Both worker methods accept only the dedicated key (minimum 64 encoded characters); neither reads or falls back to CRON_SECRET. No global pg_net grants are changed. The existing secret-authenticated GET drain remains available.

A normal registration dispatches immediately after commit. Transport failure, a global dispatch cap, or a disabled/unconfigured worker can delay actual mailbox delivery; this is not represented as a synchronous/exactly-once SMTP guarantee. Successful SMTP receives a durable receipt and stable Message-ID. Ambiguous/stale in-flight outcomes become held/uncertain and are never automatically resent. Pending events remain available for safe wake-up retries. Five/minute, twenty/hour and twenty/day claim limits apply across all custom mail; wake-ups also skip when that budget is exhausted. Review held records against provider evidence before any explicit retry.

Queue and wake-up exceptions are caught inside their notification triggers and logged only as fixed tags/SQLSTATE. A mail failure must not roll back a new Auth account or canonical username. A rare outbox write failure can consequently leave a missing notice requiring operator review; do not silently backfill all historical members to repair it.

## Exact private configuration requirements

Only the owner-approved dedicated dispatch secret has been bound by this revision. The owner separately supplied BEAST_SMTP_PASSWORD. All custom flags remain off/default-off.

| Setting | Required binding |
|---|---|
| BEAST_SMTP_HOST | Existing `smtp.resend.com` |
| BEAST_SMTP_PORT | Existing `465` / verified TLS |
| BEAST_SMTP_USER | Exact existing canonical SMTP username |
| BEAST_SMTP_FROM | Exact existing approved canonical sender on seangworld.com |
| BEAST_SMTP_PASSWORD | Owner supplied dedicated Resend Free sending-only Production Secret; confirmed hidden, no readback/test mail |
| BEAST_OWNER_REGISTRATION_EMAIL | Owner-approved existing verified canonical admin email; no value is committed |
| CRON_SECRET | Leave unchanged; account-mail worker does not read it |
| BEAST_ACCOUNT_MAIL_DISPATCH_SECRET | Independent cryptographically generated 256-bit key encoded as 64 hex characters; Production Secret only |
| Vault `beast_account_mail_dispatch_secret` | The exact same dedicated dispatch key as Vercel Production, never pasted into SQL files/chat/logs |
| BEAST_ACCOUNT_MAIL_ENABLED | Keep false until exact server activation approval |
| NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED | Keep false until delivery acceptance, then enable only with approval |
| BEAST_OWNER_REGISTRATION_MAIL_ENABLED | Keep false until owner-alert activation approval |

The existing canonical identity URL pin, service-only admin client, BEAST_AUTH_RATE_SECRET remain the existing authentication boundary. No production server secret is copied into Preview. Shared canonical Supabase SMTP, subjects and authentication templates are not edited.

### Dedicated-secret preparation — supersedes historical recovery blocker

Owner approved Option 2 after the original CRON_SECRET proved unrecoverable. A new independent 256-bit secret was generated with installed pgcrypto gen_random_bytes(32), stored encrypted in canonical Vault, and transferred directly in memory to Vercel Production as a hidden Sensitive secret. No secret was printed, committed, written to a local file or included in SQL source. Existing CRON_SECRET metadata and all cron.job rows were verified unchanged before/after; no reads, replacements or rotations of that credential are performed. No secret or Production binding is copied into Preview.

Dedicated Vercel and Vault bindings are preparation only; custom flags remain off/default-off. Migration is unapplied and backup is absent. SMTP host/port/user, exact approved sender and verified canonical admin recipient still require Stage 1 configuration. Existing BEAST_SMTP_PASSWORD is already securely bound. Supabase SMTP and seven managed security notices stay unchanged. Actual SMTP authentication/delivery remains untested and requires Stage 2 approval.

## Migration and scheduler packet — NOT APPLIED

- Pending reviewed migration: `supabase/migrations/20261105031457_canonical_username_mail.sql`. It creates the prepared private outbox, service-only recovery/claim/receipt functions, canonical Auth-registration and username-insert notification triggers, and payload-free asynchronous dispatch functions. It performs no account/profile/username updates, historical backfill, extension installation or scheduling. Apply only to canonical `grpyzwvgqiwtxadfdtni`, never the live entertainment project.
- Optional pending-delivery backup: `supabase/operations/account-mail-activation.sql`, explicitly outside migrations/build execution. After separate approval and private binding, it schedules only `beast-account-mail-pending` once per minute in EXISTING pg_cron. It posts only when pending work/budget/private binding exist. It does not edit any agent schedules or vercel.json. This replaces the earlier proposed daily Vercel backup; neither schedule is active.
- Pause packet: `supabase/operations/account-mail-pause.sql`. It removes only the named mail backup and disables only its wake trigger. It does not drop records, clear receipts, change Auth identities or touch the seven managed notices.

## Validation

- `npm test`: **2,738 passing**, zero failures, zero failures.
- `npm run test:account-mail`: **19 focused unit/gateway tests** plus both isolated PostgreSQL/PGlite acceptance suites pass. These gates are part of the production build.
- `npm run build`: passed staff-source/history completion, embedded Guide artifact/provenance, isolated SMTP/privacy/PostgreSQL gates, full npm audit (zero vulnerabilities), Next compilation, lint and TypeScript.
- Released auth gateway/onboarding source, Guide imported assets/navigation, BeastAdmin directory, Vercel cron configuration and existing security gates match current production main unchanged.
- Local PostgreSQL checks: no migration backfill; exact existing accounts/profiles/username rows; service-only lookup/claim; recipient verification/privacy; unknown-account neutrality; durable UUID dedupe; new account event before verification; no later verification/login/claim duplicates; registered-email snapshot immutability; Guide/future-app central coverage; pending username delivery until verified; queue/network/SMTP failure isolation; rollback; bounded dispatch and no blind ambiguous retry.
- The local network/Vault/pgcrypto adapters are explicit stubs and contact no service. The test deliberately simulates readable pg_net request records and proves no raw reusable credential/private payload is queued. Real Node HMAC verifies expiry/replay/nonce limits. A separate production READ-ONLY calculation on PUBLIC fixture strings confirmed the installed pgcrypto HMAC-SHA256 output matches Node; no real secret or webhook was exercised.
- Read-only production count: 15 Auth users, 15 profiles, 5 canonical username mappings; custom outbox absent. Only dedicated Vault secret creation occurred; no mail migration, actual SMTP connection, email send, cron activation or feature enablement occurred.
- Seven managed Supabase security notices were already approved, applied and verified on November 5. Their source bodies and historical rollback packet are retained unchanged. Do NOT reapply, disable or duplicate those notices in this activation.

## Revised release boundary and remaining approvals

The latest Option 2 approval supersedes the earlier Stage 1 source approval: this revision authorizes isolated-secret implementation/binding only. Do NOT merge, apply the mail migration, deploy or activate custom mail until the revised source and packet are reviewed and approved.

Stage 1 approval must name the new PR head and pending migration; configure SMTP host smtp.resend.com, port 465, username resend, the approved bare seangworld.com sender and existing verified active canonical admin recipient, reusing BEAST_SMTP_PASSWORD. Capture fresh preservation baselines, merge the exact approved source, validate/deploy the resulting merged-main build with ALL three custom flags off and apply ONLY 20261105031457_canonical_username_mail.sql to grpyzwvgqiwtxadfdtni. Reconfirm that both dedicated bindings exist. No mail test or backup schedule is authorized. Current rollback is a2e76db3d9828ed88824981bcaf317f05892967e / dpl_sEobph7BxpeqaE8ArKnQfsJ2sBMo; refresh it at actual release.

Stage 2 requires separate approval of BEAST_ACCOUNT_MAIL_ENABLED=true, the agreed existing-owner recovery-email acceptance test, and BEAST_OWNER_REGISTRATION_MAIL_ENABLED=true. The dedicated signed wake-up becomes effective only after approved migration/source/binding/server activation. Keep NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED=false until real mailbox acceptance, then separately approve its build-time switch/rebuild. No existing tester must register again. A real registration-notice mailbox test requires an agreed new test account and explicit consent. Optional existing-pg_cron backup remains separately approved only via account-mail-activation.sql. No historical backfill or bulk retry.

Rollback: turn all three custom flags off, stop only the named mail wake/backup with account-mail-pause.sql and restore retained production. Keep the dedicated secret bindings dormant for approved reuse. Preserve Auth/accounts/usernames/outbox/receipts and seven managed notices. Never change CRON_SECRET, unrelated scheduled operations or Supabase SMTP during rollback.

Primary references: [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Database Webhooks](https://supabase.com/docs/guides/database/webhooks), [Vault](https://supabase.com/docs/guides/database/vault), [Resend key management](https://resend.com/docs/dashboard/api-keys/introduction), [Nodemailer SMTP](https://nodemailer.com/smtp).

## Dedicated binding verification receipt

Vercel Production binding BEAST_ACCOUNT_MAIL_DISPATCH_SECRET is Sensitive/hidden, Production-only. Existing CRON_SECRET ID, scope, type, creation and update metadata are identical before/after; its value was never retrieved. Canonical Vault contains one correctly encoded 64-hex-character binding; anon/authenticated SELECT on decrypted_secrets remains denied. Secret generation/transfer responses were not printed or persisted locally. The same generated value was passed directly from Vault to the Vercel creation call; no readback of hidden Vercel credentials was attempted.

Read-only canonical before/after: 15 Auth accounts, 15 profiles, 5 usernames. Profile fingerprint 0e1199f1a9b2cc02ca8f736a9935ec99, username fingerprint c899dfafbed574e3a0cd8de54491c917, cron.job fingerprint c3101a885f249cbee7637f16b67efda2 all unchanged. Mail outbox remains absent. Only the specifically approved Vault secret was created; no account/session/application-data write, SMTP configuration change or optional schedule activation occurred. All three flags remain absent/default-off. Only the new account-mail route changed under src/app/api/cron; vercel.json and existing scheduled routes are unchanged.

Revised migration SHA-256: 4b12e8a7d9263817e568aa42deffd71e59d5d871374a18c07f84b7c2f343a76b. Backup script SHA-256: a0d0e63c09b8494203d12fa5f7c0b1fbd8b30db40d2a6ed4274d62e5d8be0d1d. Pause script SHA-256: 7f13bdaf376e7f1a1d1baf999779fe0cd84f7a8e92236130a148f1e42cf83a46.
