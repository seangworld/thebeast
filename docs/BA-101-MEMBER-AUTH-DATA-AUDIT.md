# BA-101 — BeastAdmin member and authentication data audit

> Historical audit baseline: BA-102 extends this implementation with an
> Auth-first directory, account lifecycle fields, effective access, and honest
> missing states. See `BA-102-OWNER-MEMBER-DIRECTORY.md` for the current
> production contract.

## Conclusion

The live BeastAdmin Members page does not use the legacy `owner@beastos.local`
or `beta@beastos.local` records. It reads an owner-only Supabase RPC backed by
`public.profiles` joined to `auth.users`.

- Email is always `auth.users.email`. There is no email column in
  `public.profiles` and no email synchronization job.
- Display name is the first non-empty value from
  `profiles.preferred_name`, `display_name`, `full_name`, or `username`.
- Access role is `profiles.role`. Household roles and beta assignments do not
  change it.
- “Profile created” is `profiles.created_at`. It is not guaranteed to equal
  `auth.users.created_at` for backfilled profiles.
- Activity dates, event totals, applications used, and timeline entries are
  derived from permissioned module records at read time.

## Displayed field map

| Displayed field | Source and column | Editable | Authority and synchronization | Access |
| --- | --- | --- | --- | --- |
| Member name | `public.profiles.preferred_name` → `display_name` → `full_name` → `username` → `Member` | Member edits their own Personal Hub fields; admin RLS permits owner updates | Personal Hub precedence, resolved at read time; no Auth metadata sync | Owner-checked security-definer RPC |
| Authentication email | `auth.users.email` | Auth email-change flow or trusted Auth administration; not editable on Members | Supabase Auth is authoritative; no profile copy | `auth.users` is read only inside the RPC; no browser service key |
| Profile access role | `public.profiles.role` | Admin only for privilege changes | Independent of household roles and feature flags | Profiles RLS, privilege trigger, and owner RPC check |
| Profile created | `public.profiles.created_at` | No application editing | Profile trigger normally follows Auth creation; backfills may be later | Owner RPC |
| Latest permissioned activity | `MAX(occurred_at)` across supported source records | Only through source workflows | Recomputed at read time; falls back to profile creation | Owner RPC; contents and sensitive values excluded |
| Journey events | Count of permitted events plus derived first-module events | No direct editing | Recomputed at read time; not login/page-view telemetry | Owner RPC |
| Applications used | Count of derived `module` timeline events | No direct editing | First supported persisted activity per module; not entitlement state | Owner workspace derivation |
| Latest activity | Newest returned event timestamp | No direct editing | Recomputed on refresh | Owner workspace derivation |
| Timeline event | Source record ID/timestamp plus privacy-bounded label | Through the owning module only | Source application is authoritative | Owner RPC excludes messages, balances, payment amounts, and document contents |

## Other audited sources

- `auth.users`: authoritative for user ID and authentication email. The Members
  page does not currently display the Auth creation timestamp or Auth provider
  metadata.
- `public.profiles`: one row per Auth user, normally created by trigger and
  backfilled for existing Auth users. It owns shared display-name fields,
  platform access role, onboarding state, and profile creation time.
- Household and Family: no persisted Household/Family member tables feed
  BeastAdmin Members. Current models contain mock fixtures and are not
  authentication identities, roles, or entitlements.
- `learning_profiles`: contains a module-owned `display_name`, but BeastAdmin
  does not use it as shared identity.
- Feature flags: `beast_admin_feature_flag_assignments.member_id` references
  `auth.users.id`. Name and email are joined from profiles/Auth at read time.
  Module, role, and member assignments are release controls, not member status.
- Beta feedback: feedback owns lifecycle status. Member name and email are
  joined from profiles/Auth at read time and are not copied into feedback.
- Legacy BeastAdmin fixtures: `beastAdminMembers`,
  `beastAdminBetaAssignments`, and `beastAdminFeedbackItems` used `.local`
  emails and invented statuses. They are not production data sources.

## Safe corrections implemented

1. Members visibly labels Auth email, profile access role, and profile-created
   time with a complete source-provenance panel.
2. Registration presentation now says “Profile created” so
   `profiles.created_at` is not misrepresented as the Auth signup timestamp.
3. BeastAdmin Settings no longer renders seeded member assignments or `.local`
   identities. Live beta access links to Feature Flags.
4. Legacy member fixtures are removed from runtime defaults, so an unconnected
   legacy snapshot reports no live member source instead of fabricated members.

No member, Auth, profile, household, role, beta, or feedback records are changed
by these corrections. No service-role key is introduced.
