# BA-107 — BeastOS email verification and change workflows

## Authority

Supabase Auth is the only source for the Beast login email, confirmation state,
and pending email-change state.

- Current sign-in email: `auth.users.email`
- Verified status: `auth.users.email_confirmed_at`
- Pending change: `auth.users.email_change`
- Change requested at: `auth.users.email_change_sent_at`

BeastOS does not write a copied email into `public.profiles`. The Personal Hub
labels the Auth email as the address used for login, verification, recovery,
and account-security messages. A future contact or notification email must be
introduced as a deliberately separate field with a different label.

## Member workflow

1. Personal Hub loads the current user with `auth.getUser()`.
2. The member sees the authoritative login email, verification state, and any
   pending email change.
3. A signed-in member requests a different email through `auth.updateUser()`.
4. Supabase secure email change keeps the existing Auth email authoritative
   until the configured confirmations complete.
5. Confirmation templates send their one-time token hash to the shared
   server-side Auth callback, which verifies it into the cookie-backed session
   before returning to Personal Hub.
6. The member can resend signup or email-change verification when Supabase has
   an applicable unverified state.

The UI applies a 60-second resend cooldown; hosted Supabase rate limits remain
the enforcement boundary.

## Owner workflow

BeastAdmin continues to read the current login email and verification status
from Auth. BA-107 adds the owner-only
`get_beast_admin_member_email_statuses()` projection for pending changes.

An owner-assisted correction uses the server-only Auth Admin API. Supabase's
Admin update is a direct change, so BeastAdmin explicitly marks the corrected
email unverified and requests verification. If verification delivery fails,
the server restores the prior Auth email. The same user ID and all member data
remain intact.

Owners may resend an existing account or email-change verification. The action
does not alter either email and records an immutable
`email_verification_resent` owner audit event.

## Required hosted Supabase configuration

Confirm these settings in Development, Preview, and Production before release:

- Confirm Email enabled.
- Secure email change enabled so current and new addresses must confirm.
- Site URL and `/auth/callback` allowlist match each environment.
- Change Email Address template uses
  `supabase/auth/templates/change-email.html`.
- Confirm Signup template uses
  `supabase/auth/templates/verify-email.html`.
- Custom SMTP can deliver to real member addresses.
- Email resend frequency is at least 60 seconds.

Local `supabase/config.toml` now enables email confirmations, keeps secure
double confirmation enabled, and maps the Beast change-email template.

## Migration

Apply in every Supabase environment after the BA-103 account-editing migration:

`20260726001100_add_beast_auth_email_workflows.sql`

The migration is required before the updated BeastAdmin member directory can
load. It creates an owner-checked projection and extends the existing owner
audit action constraint. It does not copy or mutate member email addresses.
