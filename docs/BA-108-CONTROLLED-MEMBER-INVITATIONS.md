# BA-108 — Controlled member invitations

## Outcome

BeastAdmin owners can invite a member without manually editing Supabase Auth or
public tables. Supabase Auth creates and emails one authoritative user identity.
BeastOS then applies the selected display name, role, module access, optional
household context, direct Beta assignments, and invitation audit event to that
same Auth user ID.

The owner directory visibly distinguishes active accounts from invited users.
A separate lifecycle list shows:

- Invitation sent
- Invitation resent
- Invitation accepted
- Invitation expired
- Invitation revoked

## Security and identity

- Invitation creation, resend, and revocation are owner-authorized server
  routes.
- The service-role credential remains server-only.
- A service-role Auth lookup prevents duplicate Beast accounts before an invite
  is sent.
- Supabase Auth also enforces unique login email identity.
- A failed Beast persistence transaction removes only the newly created,
  unaccepted Auth identity. Existing member identities and records are never
  deleted by this workflow.
- Revocation bans the unaccepted Auth identity and preserves its audit history.
- Every send, resend, revoke, and acceptance writes an owner-readable audit
  event.

## Household boundary

BA-108 introduces persisted BeastOS household and membership foundations.
Invitations may select only real households owned by the current owner. When no
persisted household exists, the form truthfully offers `No household
assignment`; it never creates a placeholder household or relationship.

## Required migration

Apply, in chronological order:

`supabase/migrations/20260726001200_add_beast_admin_member_invitations.sql`

This migration depends on the BA-103, BA-106 feature-flag, and BA-107
authentication migrations already being applied.

## Hosted Supabase configuration

For every development, preview, and production Supabase project:

1. Add `/auth/callback` for the environment origin to Auth redirect URLs.
2. Configure the Invite User template from
   `supabase/auth/templates/invite.html`.
3. Keep the Email OTP Expiration aligned with
   `BEAST_INVITATION_EXPIRY_HOURS`; both default to one hour.
4. Configure approved production SMTP before inviting real members.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

The migration and hosted Auth template must be applied manually in each
Supabase environment before controlled invitations work there.
