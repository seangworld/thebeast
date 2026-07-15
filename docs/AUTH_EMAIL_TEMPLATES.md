# Beast Authentication Email Templates

package: SW-AUTH-004
status: implemented_source_templates
sender: seang@seangworld.com

## Purpose

Beast authentication emails use branded, responsive, dark-mode friendly templates instead of default Supabase copy.

## Source Files

Shared application template system:

- `src/lib/auth/emailTemplates.ts`

Supabase-ready HTML templates:

- `supabase/auth/templates/welcome.html`
- `supabase/auth/templates/magic-link.html`
- `supabase/auth/templates/verify-email.html`
- `supabase/auth/templates/password-reset.html`

## Sender

Use:

- `seang@seangworld.com`

Do not change the sender without owner approval and provider verification.

## Supabase Mapping

Use the HTML source files above in Supabase Auth email template settings:

| Supabase email | Beast template |
| --- | --- |
| Magic Link | `supabase/auth/templates/magic-link.html` |
| Confirm signup / Verify Email | `supabase/auth/templates/verify-email.html` |
| Reset Password | `supabase/auth/templates/password-reset.html` |
| Welcome / invite-style account message | `supabase/auth/templates/welcome.html` |

The Magic Link, Verify Email, and Password Reset templates use Supabase `{{ .ConfirmationURL }}` for the action button and fallback link. The Welcome template uses `{{ .SiteURL }}`.

## Required Content

Every template keeps:

- Beast branding.
- Beast logo.
- SEANGWORLD footer identity.
- Responsive layout.
- Dark-mode friendly styles.
- Privacy, Terms, Security, and Contact links.
- Sender reference to `seang@seangworld.com`.
- Security reminder that Beast will not ask for passwords, codes, or private links by email reply.

Security-sensitive templates also include:

- One-time use notice.
- Expiration notice.
- Ignore-this-email copy when the user did not request it.

## Guardrails

- Do not log magic links, reset links, confirmation links, tokens, credentials, or secrets.
- Do not expose whether an email address is registered.
- Do not add tracking pixels or analytics to authentication emails without a future approved privacy package.
- Do not create a new email provider, sender, or Supabase project from this package.
- Applying these templates to hosted Supabase settings is a provider configuration action and must target the existing approved Supabase project only.
