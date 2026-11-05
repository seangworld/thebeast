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

The existing pg_net request queue grants SELECT to client roles. Therefore the queued HTTP request MUST NOT contain the reusable CRON_SECRET, SMTP credential, account identifier or email. The request carries only a timestamp, nonce and HMAC-SHA256 signature; POST validates a two-minute window and consumes the nonce once using the existing private rate-limit mechanism. The payload is `{}` and the fixed worker cannot accept a requested recipient/account. SQL uses the existing CRON_SECRET copied through a separately approved encrypted Vault binding; the raw key never enters the request queue. No global pg_net grants are changed. The existing secret-authenticated GET drain remains available.

A normal registration dispatches immediately after commit. Transport failure, a global dispatch cap, or a disabled/unconfigured worker can delay actual mailbox delivery; this is not represented as a synchronous/exactly-once SMTP guarantee. Successful SMTP receives a durable receipt and stable Message-ID. Ambiguous/stale in-flight outcomes become held/uncertain and are never automatically resent. Pending events remain available for safe wake-up retries. Five/minute, twenty/hour and twenty/day claim limits apply across all custom mail; wake-ups also skip when that budget is exhausted. Review held records against provider evidence before any explicit retry.

Queue and wake-up exceptions are caught inside their notification triggers and logged only as fixed tags/SQLSTATE. A mail failure must not roll back a new Auth account or canonical username. A rare outbox write failure can consequently leave a missing notice requiring operator review; do not silently backfill all historical members to repair it.

## Exact private configuration requirements

No values were bound or enabled by this work. All custom flags remain off/default-off.

| Setting | Required binding |
|---|---|
| BEAST_SMTP_HOST | Existing `smtp.resend.com` |
| BEAST_SMTP_PORT | Existing `465` / verified TLS |
| BEAST_SMTP_USER | Exact existing canonical SMTP username |
| BEAST_SMTP_FROM | Exact existing approved canonical sender on seangworld.com |
| BEAST_SMTP_PASSWORD | Existing original credential, Production Secret; binding remains deferred |
| BEAST_OWNER_REGISTRATION_EMAIL | Owner-approved existing verified canonical admin email; no value is committed |
| CRON_SECRET | Reuse existing server secret; do not create/rotate it |
| Vault `beast_account_mail_dispatch_secret` | A separately approved secure copy of that existing CRON_SECRET, never pasted into SQL files/chat/logs |
| BEAST_ACCOUNT_MAIL_ENABLED | Keep false until exact server activation approval |
| NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED | Keep false until delivery acceptance, then enable only with approval |
| BEAST_OWNER_REGISTRATION_MAIL_ENABLED | Keep false until owner-alert activation approval |

The existing canonical identity URL pin, service-only admin client, BEAST_AUTH_RATE_SECRET and CRON_SECRET remain the existing authentication boundary. No production server secret is copied into Preview. Shared canonical Supabase SMTP, subjects and authentication templates are not edited.

### Credential recoverability result

No reusable SMTP/Resend credential was present in the scoped project/process mail environment, known local configuration files, Vercel production environment metadata or matching Vault entries. Supabase's stored SMTP password is hidden, not a recoverable dashboard value. Resend documents that existing API-key values cannot be viewed after creation. No credential was printed, exported, searched for in chat, created, rotated or replaced.

Exact SMTP blocker: the owner must recover the ORIGINAL value from their existing secure record and perform the deferred approved-secret workflow. This evidence does not establish that the original value is lost everywhere. The existing CRON_SECRET is a hidden production secret and was not present in scoped local configuration; its approved Vault copy likewise requires the existing secure source/workflow. Do not invent a new key to bypass either requirement. Exact SMTP user/from values must be confirmed in the secure workflow; redacted fields do not prove they are wrong.

## Migration and scheduler packet — NOT APPLIED

- Pending reviewed migration: `supabase/migrations/20261105031457_canonical_username_mail.sql`. It creates the prepared private outbox, service-only recovery/claim/receipt functions, canonical Auth-registration and username-insert notification triggers, and payload-free asynchronous dispatch functions. It performs no account/profile/username updates, historical backfill, extension installation or scheduling. Apply only to canonical `grpyzwvgqiwtxadfdtni`, never the live entertainment project.
- Optional pending-delivery backup: `supabase/operations/account-mail-activation.sql`, explicitly outside migrations/build execution. After separate approval and private binding, it schedules only `beast-account-mail-pending` once per minute in EXISTING pg_cron. It posts only when pending work/budget/private binding exist. It does not edit any agent schedules or vercel.json. This replaces the earlier proposed daily Vercel backup; neither schedule is active.
- Pause packet: `supabase/operations/account-mail-pause.sql`. It removes only the named mail backup and disables only its wake trigger. It does not drop records, clear receipts, change Auth identities or touch the seven managed notices.

## Validation

- `npm test`: **2,736 passing**, zero failures.
- `npm run test:account-mail`: **17 focused unit/gateway tests** plus both isolated PostgreSQL/PGlite acceptance suites pass. These gates are part of the production build.
- `npm run build`: passed staff-source/history completion, embedded Guide artifact/provenance, isolated SMTP/privacy/PostgreSQL gates, full npm audit (zero vulnerabilities), Next compilation, lint and TypeScript.
- Released auth gateway/onboarding source, Guide imported assets/navigation, BeastAdmin directory, Vercel cron configuration and existing security gates match current production main unchanged.
- Local PostgreSQL checks: no migration backfill; exact existing accounts/profiles/username rows; service-only lookup/claim; recipient verification/privacy; unknown-account neutrality; durable UUID dedupe; new account event before verification; no later verification/login/claim duplicates; registered-email snapshot immutability; Guide/future-app central coverage; pending username delivery until verified; queue/network/SMTP failure isolation; rollback; bounded dispatch and no blind ambiguous retry.
- The local network/Vault/pgcrypto adapters are explicit stubs and contact no service. The test deliberately simulates readable pg_net request records and proves no raw reusable credential/private payload is queued. Real Node HMAC verifies expiry/replay/nonce limits. A separate production READ-ONLY calculation on PUBLIC fixture strings confirmed the installed pgcrypto HMAC-SHA256 output matches Node; no real secret or webhook was exercised.
- Read-only production count: 15 Auth users, 15 profiles, 5 canonical username mappings; custom outbox absent. No hosted migration, actual SMTP connection, email send, cron activation or feature enablement occurred.
- Seven managed Supabase security notices were already approved, applied and verified on November 5. Their source bodies and historical rollback packet are retained unchanged. Do NOT reapply, disable or duplicate those notices in this activation.

## Exact activation order and owner approvals still required

1. Approve secure binding of the existing SMTP user/from/password and approved owner recipient; the Production password binding is explicitly still deferred. Approve the private copy of the existing CRON_SECRET into Vault through the established secure workflow. Do not send credentials in chat.
2. Approve the exact validated PR/source revision and ONLY the pending canonical migration. Capture fresh aggregate preservation baselines and current production/rollback references immediately before execution. Merge/release are NOT authorized by the implementation request.
3. Deploy the exact approved merged-main build with flags disabled and retain the previous working deployment. Current retained production is `a2e76db3d9828ed88824981bcaf317f05892967e` / `dpl_sEobph7BxpeqaE8ArKnQfsJ2sBMo`; reverify at activation time.
4. Separately approve server-mail activation and ONE agreed username-recovery test to the owner's existing verified account. Keep the UI recovery-link fallback until actual mailbox acceptance. Approve the intended owner recipient and separately controlled owner-registration flag; no tester repeat signup is required.
5. Only after acceptance, approve the UI switch and immediate dispatch Vault binding/wake-up plus the exact optional pg_cron backup. A real creation-event mailbox test, if wanted, needs an explicitly agreed disposable test account/recipient; none has been created or emailed by this work. Do not change an existing account just to simulate signup.
6. Verify future real registration owner alerts use the original creation snapshot and do not duplicate after verification/login. Preserve and monitor pending/uncertain receipts; do not bulk-resend.

Rollback: turn all three custom flags off, stop only the mail wake/backup with the pause packet, and restore the retained production deployment. Preserve Auth accounts, canonical usernames, outbox and receipts. Do not roll back the seven managed security notices or delete audit history. Re-enable only after correcting the verified defect and reviewing held deliveries.

Primary references: [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Database Webhooks](https://supabase.com/docs/guides/database/webhooks), [Vault](https://supabase.com/docs/guides/database/vault), [Resend key management](https://resend.com/docs/dashboard/api-keys/introduction), [Nodemailer SMTP](https://nodemailer.com/smtp).
