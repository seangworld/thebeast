# BA-103 Migration Dependency Repair

## Root cause

`20260726001000_add_beast_admin_member_account_editing.sql` creates the
`set_beast_admin_member_module_access_updated_at` trigger. That trigger reuses
`public.set_beast_admin_feature_flag_updated_at()`.

The canonical helper is created earlier by
`20260726000400_add_beast_admin_feature_flags.sql`, before either Feature Flags
trigger references it. No equivalent helper exists under another repository
name or schema.

The `42883` failure therefore means the target database does not match the
chronological migration chain. Its BeastAdmin migrations were applied manually,
partially, or out of order: the `00400` helper was omitted even though the
later `01000` package was attempted.

## Forward-only correction

`20260726000950_ensure_beast_admin_updated_at_trigger.sql` now runs immediately
before the blocked `01000` migration. It:

- defines the canonical helper with `CREATE OR REPLACE FUNCTION`;
- uses `SECURITY INVOKER` and an explicit `search_path`;
- matches the repository's transaction-stable `timestamptz` convention with
  `now()`, which PostgreSQL stores as UTC;
- conditionally repairs the module-access trigger if a manual SQL run created
  the table before failing; and
- remains harmless on a clean database where `00400` already created the
  helper and `01000` has not yet created the module-access table.

No released migration was rewritten to hide the dependency.

## Required application order

For a complete BeastAdmin chain, apply migrations in filename order:

1. `20260726000000_add_beast_admin_product_roadmap.sql`
2. `20260726000100_add_beast_admin_ai_analytics.sql`
3. `20260726000200_add_beast_admin_member_timeline.sql`
4. `20260726000300_add_beast_admin_beta_feedback.sql`
5. `20260726000400_add_beast_admin_feature_flags.sql`
6. `20260726000500_add_beast_admin_prompt_library.sql`
7. `20260726000600_add_beast_admin_release_center.sql`
8. `20260726000700_add_beast_admin_executive_metrics.sql`
9. `20260726000800_add_beast_admin_knowledge_inspector.sql`
10. `20260726000900_add_authoritative_beast_admin_member_directory.sql`
11. `20260726000950_ensure_beast_admin_updated_at_trigger.sql`
12. `20260726001000_add_beast_admin_member_account_editing.sql`

For the database currently blocked at `01000`, apply `00950` next and then
retry `01000`. If migration history says an earlier BeastAdmin migration is
applied but its objects are missing, reconcile that environment before marking
the chain healthy.
