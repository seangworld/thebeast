# BA-103 — Member Account Editing

## Supported owner changes

BeastAdmin Members now edits each field through its authoritative boundary:

| Field | Write target | Notes |
| --- | --- | --- |
| Display name | `public.profiles.display_name` | The directory prefers this explicit owner-managed value, then falls back to existing Personal Hub identity fields. |
| Login email | Supabase Auth Admin API | Requires an explicit warning and confirmation. The Auth user ID is unchanged; no profile email copy is written. The result reports whether the new email requires verification. |
| Role | `public.profiles.role` | The database and server route both prevent demotion of the final owner. |
| Account status | Supabase Auth Admin API | Supports suspension and reactivation. Invitation completion and deletion remain outside this editor. |
| Household relationship | Not available | Disabled until BeastOS has a real persisted household-membership source. No mock record is written. |
| Module access | `public.beast_admin_member_module_access` | Supports BeastMoney and BeastEducation. BeastOS remains available; BeastAdmin stays role-controlled. Navigation and route guards consume the same persisted override. |
| Beta assignments | `public.beast_admin_feature_flag_assignments` | Supports direct member Beta assignments. Role/module assignments and non-Beta overrides remain in Feature Flags. |

Every successful edit inserts a row in
`public.beast_admin_member_account_audit_events`. Authentication changes are
summarized with before/after values and verification status; service-role
credentials never leave the server route.

## Safety boundary

- The browser authenticates the current session, and the server verifies
  `public.profiles.role = 'admin'` before creating the Auth Admin client.
- The transactional account-edit RPC grants execution only to `service_role`;
  authenticated browsers cannot call it directly.
- Input is validated in TypeScript and again at the transactional database RPC
  boundary.
- Explicit `system` and `demo` profiles are protected. Auth accounts without a
  managed public profile are also read-only.
- The final owner cannot be demoted or suspended, including under concurrent
  requests.
- Duplicate Auth email errors are returned as a human-readable conflict without
  applying profile changes.
- If the database transaction fails after Auth changes, the server attempts to
  restore the previous email and suspension state and reports a hard failure if
  that rollback cannot be verified.

## Deployment requirements

Apply these migrations in order in every Supabase environment:

1. `20260726000900_add_authoritative_beast_admin_member_directory.sql`
2. `20260726000950_ensure_beast_admin_updated_at_trigger.sql`
3. `20260726001000_add_beast_admin_member_account_editing.sql`

The deployed server must also have `SUPABASE_SERVICE_ROLE_KEY` configured as a
server-only environment variable. It must never use a `NEXT_PUBLIC_` prefix.
Until both the migration and server secret are present, the directory remains
readable but account edits cannot complete.
