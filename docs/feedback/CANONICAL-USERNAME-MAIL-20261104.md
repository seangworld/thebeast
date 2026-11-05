# Canonical username mail — review candidate

Owner approved secure reuse of the existing canonical SMTP account, without credential rotation, new service or production activation. Based on released BeastOS 212129777d7fde7a822aa01d72e5601727a6ee6b. Production remains unchanged by this candidate.

## Implementation

Uses the existing canonical private username registry and existing Resend SMTP host, smtp.resend.com:465. Nodemailer 10.3.1 is pinned; TLS certificate validation and TLS 1.2 minimum remain mandatory. No protocol logging, attachments, URL/file loading, passwords or authentication links/tokens in informational messages. Message recipients and usernames come only from service-only canonical database functions, never browser-supplied identity/metadata. The fixed canonical sign-in/setup link preserves a safe requested Guide destination for recovery.

A single necessary additive migration, 20261105031457_canonical_username_mail.sql, creates a private RLS-enabled outbox, one new-username INSERT trigger and service-only recovery/claim/receipt functions. No existing account/profile/username row is changed, no existing account is backfilled, and no new identity database is introduced. A new assignment queues one confirmation; only verified, active accounts can be delivered. Recovery queues either the authoritative username or setup instructions, privately. Unknown/unverified/disabled addresses get the same public neutral response and no account creation.

Persistent existing rate limits bound network/recipient requests. Delivery claims serialize and enforce five/minute, twenty/hour and twenty/day limits. One recipient can request recovery once per safe application destination per 15-minute database bucket (still bounded by the three-per-recipient request limit). The queue uses leased delivery ownership and a stable Message-ID. Successful sends receive a durable receipt. A failed/ambiguous SMTP exchange or stale in-flight lease becomes uncertain and is not automatically resent. This avoids duplicate notices; it is not a claim of mathematically exactly-once SMTP delivery. Operators must review provider evidence before any explicit retry of an uncertain row.

Next.js after() sends only after a neutral recovery response; no SMTP latency or account existence is reflected in the response body. Verified setup/profile visits can flush only their own assignment queue. An authenticated cron-secret endpoint can drain pending rows in bounded batches as a delivery backup. The exact proposed daily backup is {"path":"/api/cron/account-mail","schedule":"30 10 * * *"}. It is not added to vercel.json or active; the existing scheduler configuration is unchanged. The activation batch must review and record this shared scheduler change under the canonical staff-source gate before adding it. The disabled endpoint returns an explicit disabled status, never a false delivery success. It has no anonymous recipient/username lookup and no client-selected ownership.

The feature is off unless BOTH the server BEAST_ACCOUNT_MAIL_ENABLED and UI NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED are explicitly enabled. While off, existing private recovery links continue unchanged. The new server routes fail closed. Supabase-managed password/email/MFA/identity security notices remain a separate provider configuration batch; this sender intentionally does not duplicate them.

## Existing credential availability

Read-only canonical SMTP dashboard showed custom SMTP enabled, smtp.resend.com, port 465, and an empty replacement-password field: “Stored password is hidden. Enter a new password to replace it.” Existing SMTP credentials are not retrievable through that form. No replacement was entered. The scoped project/server env sources contain no reusable SMTP/Resend credential. The owner was asked to bind the EXISTING value directly to Vercel Production Secret BEAST_SMTP_PASSWORD in project thebeast, without pasting it into chat or creating/rotating a key. No server secret has been copied into Preview.

Required private server configuration (copy the existing canonical values through the approved secure workflow):
- BEAST_SMTP_HOST=smtp.resend.com
- BEAST_SMTP_PORT=465
- BEAST_SMTP_USER=the current SMTP username
- BEAST_SMTP_FROM=the current approved canonical sender address on seangworld.com
- BEAST_SMTP_PASSWORD=the existing SMTP credential, stored as a Production Secret

No credential value belongs in Git, PRs, logs or chat. The sender/username fields were redacted through the available UI; their exact reusable values were not established. Do not infer that the SMTP configuration is wrong, or change its sender as a workaround. If the actual sender does not fit the approved transport constraint, review the existing sender policy before activation.

## Evidence

2,728 tests pass, including neutral existing/unknown recovery responses, no SMTP send before response, session-derived ownership, foreign-request rejection, disabled-by-default behavior, no informational auth material/header injection, TLS/sender restrictions, durable success receipts and failure/ambiguous holds. New rendered UI test verifies the optional informational recovery branch uses the same-origin server with no sign-in-token creation. The PostgreSQL regression is a portable npm run test:account-mail-db command and a mandatory production-build gate together with the SMTP/privacy/ownership unit checks (all isolated from hosted services). TypeScript and required production build pass; npm audit reports zero vulnerabilities.

node scripts/test-account-mail-db.mjs passes against actual local PostgreSQL/PGlite: client/private-registry denial; service-only functions; verified recipients; no metadata authority; zero backfill; unchanged existing account and username rows; recipient deduplication; token-bound receipts; no-username instructions; safe app return; stale/ambiguous hold; global dispatch limit. No live SMTP connection, actual email or hosted migration has occurred. This is not delivered-mail acceptance.

## Explicit activation gate

Prepare and review the exact PR first. Then owner approval is required before:
1. Applying ONLY the reviewed additive migration to canonical grpyzwvgqiwtxadfdtni (not the live entertainment data project zvzcojwjgnedrouilovc).
2. Merging/deploying this candidate, enabling both feature flags after the existing credential binding and sender settings are verified, and activating the reviewed once-daily pending-delivery backup in the existing scheduler.
3. Sending one agreed recovery test to the owner's existing verified account; no new registration or tester repeat is needed.
4. Separately enabling the seven currently-off managed security notifications after inspecting their stored templates: password, email, phone, identity linked/removed, MFA added/removed. No template/SMTP credential change is bundled implicitly.

Capture fresh read-only production preservation fingerprints immediately before activation. Preserve the current live deployment dpl_HQGDFZvBWcDAqw2mxgzW9Q48TgHA. Rollback: disable the two mail flags and restore the prior deployment; leave accounts, registry and delivery receipts intact. Do not bulk-reset uncertain deliveries or delete audit history. No native/App Store work.

Primary references: https://nodemailer.com/smtp and https://nextjs.org/docs/app/api-reference/functions/after (stable since Next 15.1; project uses 15.5.28).

Owner steering: the existing credential is noted elsewhere and credential binding is explicitly deferred until later. Continue review work; do not retrieve it from chat, request rotation or activate the custom mail path. Seven managed notification bodies were inspected read-only; the original body rollback packet and minimal replacement bodies are in SECURITY-NOTIFICATION-REVIEW-20261104.json and supabase/auth/templates/security. Their activation is independent of the deferred server SMTP secret and still requires the explicit production-security approval specified in the final assignment.
