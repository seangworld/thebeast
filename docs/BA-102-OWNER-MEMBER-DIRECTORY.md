# BA-102 — Owner Member Directory

## Result

BeastAdmin now reads member account identity through one owner-checked
`get_beast_admin_member_directory()` boundary. The query begins with
`auth.users` so an Auth account is not hidden when its public profile is
missing. The browser uses the authenticated
Supabase client and never receives a service-role credential or direct
`auth.users` table access.

## Field authority

| Displayed field | Authority | Directory behavior |
| --- | --- | --- |
| Display name | `public.profiles` name precedence | Shows `Not provided.` when every profile name field is blank. Email is never converted into a name. |
| Authentication email | `auth.users.email` | Shows `Not provided.` for Auth accounts without an email. No profile email copy is used. |
| Email verification | `auth.users.email_confirmed_at` | Shows Verified, Not verified, or `Not provided.` when no Auth email exists. |
| Pending email change | `auth.users.email_change`, `email_change_sent_at` | Shows the pending address and request time without replacing the current sign-in email. |
| Account status | Supabase Auth lifecycle timestamps | Derives Active, Invited, Suspended, or Deleted from explicit Auth state. |
| Role | `public.profiles.role` | Remains separate from household role and beta assignments. Missing profiles show `Not provided.`. |
| Household role | No persisted source | Always shows `Not provided.`. Mock household and family contracts are not queried. |
| Enabled modules | Canonical module registry + profile role | Uses the same visibility rule as platform navigation. Persisted activity is not treated as access. |
| Beta assignments | Effective BeastAdmin feature-flag assignment | Lists only effective Internal Testing or Beta member/role assignments, with member precedence. |
| Created date | `auth.users.created_at` | Auth account creation, not profile backfill time. |
| Last sign-in | `auth.users.last_sign_in_at` | Nullable and never estimated. |
| Last active | Supported cross-module persisted activity | Nullable and never replaced with profile creation or sign-in. |

## Security boundary

- The RPC is `SECURITY DEFINER`, checks `public.is_profile_admin()`, and raises
  SQLSTATE `42501` for a non-owner.
- Execution is granted to authenticated sessions only; the function performs
  the owner check independently of the page shell.
- The response excludes Auth provider metadata, tokens, identities, phone
  numbers, IP details, and other sensitive authentication fields.
- Profile, household, feature, and module data are joined or resolved by the
  authenticated user ID; no display string is used as a join key.

## Deployment

Apply
`20260726000900_add_authoritative_beast_admin_member_directory.sql` in every
Supabase environment before deploying the updated application. PostgREST will
then serve the replaced RPC response through its schema cache without a UI
workaround.

BA-107 additionally requires
`20260726001100_add_beast_auth_email_workflows.sql` for the owner-only pending
email-change projection and verification-resend audit action.
