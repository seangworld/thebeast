# BA-110 Immutable Account Audit Log

## What is recorded

BeastAdmin uses `public.beast_admin_member_account_audit_events` as the
single account-management audit source. Each event stores the owner actor,
target Auth user, normalized action, timestamp, previous value, new value,
outcome, and an optional reason.

The log covers member invitations, invitation resend and revocation, Auth
email changes, role changes, suspension and restoration, module and Beta
access changes, password-reset requests, session revocation, and the existing
fresh-sign-in and suspicious-activity controls. The schema also reserves
explicit deletion-request and deletion-cancel actions for the controlled
account-deletion workflow; BA-110 does not create or simulate that workflow.

Compound account edits remain compatible with the BA-103 write function. A
database trigger emits the distinct email, role, account-status, module, and
Beta events that actually changed and keeps the original event as internal
source evidence.

## Immutability and security

- Authenticated clients receive `SELECT` only, and the existing owner RLS
  policy remains authoritative.
- Every `UPDATE` or `DELETE` is rejected by a database trigger, including
  service-role attempts.
- Audit references use `ON DELETE RESTRICT`, so deleting an Auth identity
  cannot silently erase its audit history.
- Explicit events are written through a server-only function that verifies
  the actor is a current Beast owner.
- A recursive insert guard rejects object keys that identify passwords,
  tokens, one-time codes, secrets, or email action links. Password-reset
  operations record only the outcome and a non-secret provider error code.

## Owner search

The Members workspace includes an owner-only audit view backed by
`get_beast_admin_account_audit_log`. Events can be filtered by target member,
normalized action, start date, and end date. Results are newest-first and
limited to 250 rows per query.

## Deployment order

Apply these pending migrations in chronological order in every Supabase
environment:

1. `20260726001200_add_beast_admin_member_invitations.sql`
2. `20260726001300_add_beast_admin_account_access_history.sql`
3. `20260726001400_add_immutable_beast_admin_account_audit_log.sql`

The BA-110 migration is required before the immutable search view and
password-reset audit action work. It was added to the repository only; it is
not applied automatically to development, preview, or production.
