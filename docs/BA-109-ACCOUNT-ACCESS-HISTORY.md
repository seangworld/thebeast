# BA-109 — Account Access History and Session Controls

## Evidence boundaries

BeastAdmin displays only authentication evidence that exists:

- `auth.users.last_sign_in_at` is the authoritative last successful sign-in.
- `auth.audit_log_entries` supplies retained Supabase Auth actions such as
  sign-in activity, sign-out, password recovery requests, password updates,
  account updates, and token revocations.
- `auth.users.email_change_sent_at` identifies a currently pending email-change
  request when one exists.
- `public.beast_admin_member_auth_events` records owner session and review
  actions performed through BeastAdmin.

The owner API converts an available user agent into coarse device, platform,
and browser categories before returning data to the browser. It does not return
or persist the raw user agent.

Failed sign-in events are labeled unavailable because the configured Supabase
Auth audit contract does not expose a standardized failed-attempt event.
BeastAdmin does not infer failures from a missing successful sign-in.

IP addresses and IP-derived locations are intentionally not selected, returned,
persisted, or inferred for this feature.

## Owner-only access

The history projection requires `public.is_profile_admin()`. Security actions
also require an authenticated owner in the route and a service-role-only
database function. Service-role credentials remain server-side.

Protected system, demo, unmanaged, and deleted accounts cannot receive session
or review actions.

## Retention

The access view is limited to 90 days and 100 meaningful events per source.
BeastAdmin authentication events receive an `expires_at` no later than 90 days
after creation. Expired events are excluded from reads and are removed
opportunistically when the next owner security action runs.

The existing immutable account audit table also records the owner action for
security accountability. That broader owner audit trail follows the platform
audit policy rather than the access-view retention policy.

## Session semantics

Supabase Auth does not expose an owner-by-user-ID sign-out API, and its supported
architecture warns applications not to modify the managed Auth schema.
“Revoke all sessions” therefore records the owner action and sets a BeastOS
fresh-sign-in boundary for every current session. “Require fresh sign-in” sets
the same boundary without describing the action as a security revocation.

Supabase access JWTs are stateless and can remain cryptographically valid until
their configured expiry. BeastOS checks
`public.is_current_beast_session_allowed()` on protected dashboard and
application API requests. When a stale session reaches BeastOS, the app invokes
Supabase Auth’s supported global sign-out with that member’s JWT and requires
new authentication. Public authentication completion routes remain available
so the member can recover access.

## Deployment

Apply migrations in timestamp order. BA-109 requires:

1. `20260726000950_ensure_beast_admin_updated_at_trigger.sql`
2. `20260726001000_add_beast_admin_member_account_editing.sql`
3. `20260726001100_add_beast_auth_email_workflows.sql`
4. `20260726001200_add_beast_admin_member_invitations.sql`
5. `20260726001300_add_beast_admin_account_access_history.sql`

The BA-109 migration must be applied manually in every Supabase environment
before the new history route and session controls can function.
