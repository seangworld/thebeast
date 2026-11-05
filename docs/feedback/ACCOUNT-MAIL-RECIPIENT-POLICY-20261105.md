# Account-mail configured owner recipient — focused correction

Owner-authorized preparation only. Supersedes the recipient-admin requirement in historical PR #313 / Stage 1 mail packets; it does not authorize deployment, hosted migration, account-role changes or mail sending. Tracks Issue #316.

## Verified defect and correction

The approved notification mailbox is a verified, active canonical account but has no admin role. Production claim SQL additionally required public.profiles.role=admin, conflating the right to receive an informational owner email with administrative application permissions.

Add ONLY forward migration 20261105205657_account_mail_configured_owner_recipient.sql. CREATE OR REPLACE the existing service-only beast_account_mail_claim(uuid,text,text) function. Remove only its profile join and admin-role predicate; retain exact canonical-email matching against the private p_owner_email configuration, verified email, nondeleted/nonbanned account, disabled-account checks and every other line of claim/lease/cap/receipt logic. Historical deployed migration 20261105031457 is unchanged. No tables, roles, account records, sessions, identities, schedules or auth settings are changed. Existing ownership and service-only function grants are preserved.

The configured address is the owner-approved BEAST_OWNER_REGISTRATION_EMAIL in private Vercel Production configuration. Only the enabled authenticated server worker passes it. Public recovery/member delivery requests cannot select an owner recipient; browser body, registration metadata and editable profile fields are not recipient authorities. SQL is callable only by service_role. A different verified address is not automatically authorized: the server must never replace the owner-approved configuration with caller input. Receipt eligibility grants no application or BeastAdmin access.

## Regression and security evidence

- Full suite: 2,738 passing. Focused mail suite: 19 unit/gateway tests plus both real isolated PostgreSQL/PGlite suites. Required production build passed staff/source/history, embedded Guide artifact, focused PostgreSQL/auth gates, audit (zero vulnerabilities), Next compilation, lint and TypeScript.
- Fixture owner profile is user, not admin; configured verified active non-admin receives the creation notice. NULL/unknown address, unverified, banned, deleted, is_disabled and account_status=disabled destinations cannot claim a notice.
- Anonymous/authenticated calls remain denied even when attempting a verified recipient. Function ACL is identical before/after. Forged recipient/owner_email/p_owner_email/environment-name fields in public recovery requests are ignored; queued RPC arguments remain only the validated account email and safe return path.
- Exact old/new function comparison permits only the comment and profile/admin predicate removal: dedupe, row locks, rate caps, leases, uncertain-delivery protection and return fields are unchanged.
- Account/profile/username snapshots are unchanged by the forward migration; profile roles remain unchanged. Existing tests retain pre-verification Auth INSERT timing, UUID dedupe, payload-free signed queue, replay protection, and queue/network/SMTP failure isolation.
- Isolated rollback restores the exact old function and preserves accounts, profile roles and all outbox receipts. Local transport/Vault stubs contact no provider; no real mail or account created in production.
- Read-only production preflight: 15 accounts, 15 profiles, 5 usernames, empty mail outbox and no optional backup job. Existing production still has admin-recipient policy; all three custom flags explicitly false. SMTP/Supabase Auth/dedicated dispatch secret untouched.

## Exact deployment requirements — approval required

1. Approve the exact new PR head and ONLY forward migration 20261105205657_account_mail_configured_owner_recipient.sql (SHA-256 5ff1a7dbd758def2c09bde0b8369f0efb7113f68eea7a514cba23d8cfac5a54f). Preserve current Stage 1 rollback deployment dpl_6XGtB7duMH5Dv9iopwKcRzrF8Gs2 / 3fb34a95a024840d25d6e94d9b62e329e3e50d95, plus previous dpl_sEobph7BxpeqaE8ArKnQfsJ2sBMo. Reconfirm actual serving references and capture fresh canonical/application preservation fingerprints before execution.
2. Merge/build/stage the exact approved source and apply only this replacement function to canonical project grpyzwvgqiwtxadfdtni. Do not rerun the original outbox migration, touch the entertainment database, or change account roles. Verify same grants, recipient checks and preservation fingerprints; stop before promotion on failure.
3. Bind BEAST_OWNER_REGISTRATION_EMAIL privately to the explicitly approved seang@seangworld.com. Keep BEAST_ACCOUNT_MAIL_ENABLED, NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED and BEAST_OWNER_REGISTRATION_MAIL_ENABLED all false throughout correction release. Retain existing SMTP host/port/user/sender/password, CRON_SECRET and both dedicated dispatch bindings unchanged. Reverify the dedicated key by a payload-free disabled-worker challenge, never by exposing either secret. Promote only after gates pass.

## Stage 2 controlled activation — separate review/approval

After correction release, reconfirm that the destination remains verified and active, queue is healthy, and no unexpected pending mail exists. With public UI and owner flag still false, enable only server mail in a bounded protected production build and send ONE approved Forgot Username recovery email to the existing seang@seangworld.com account. Confirm SMTP/provider acceptance AND actual mailbox delivery; an outbox sent receipt or provider delivery event alone is not mailbox acceptance. No new accounts or username changes.

If any configuration/security/delivery check fails, restore mail flags false and retained mail-off deployment; hold ambiguous receipts without blind retries. After real acceptance, obtain/retain exact controlled activation approval to enable username confirmation and Forgot Username UI (NEXT_PUBLIC flag needs rebuild) and owner alerts to the approved private destination. New canonical account INSERT triggers alerts before verification, with existing UUID dedupe. Do not create test accounts. Optional backup remains disabled; no newsletters or SMTP/Auth/security-notice changes.

## Rollback

Keep/restore the three custom flags false and mail-off deployment. Reviewed supabase/operations/account-mail-recipient-policy-rollback.sql (SHA-256 abcf98b2cfc17e6f677ccbd5be5266adcb3916d18166735caa5161ac6dc9f999) restores ONLY the prior claim function if approved. It edits no roles, accounts, outbox rows, receipts, keys or schedules. Reverting the SQL reinstates the former non-admin recipient restriction; do not conceal that limitation. Existing account-mail-pause.sql remains the separate worker pause procedure. Never reapply the original outbox migration or roll back managed security notices.
