# Supabase CLI Migration Management

Last audited: 2026-07-15 EDT

This repository now uses the Supabase CLI-standard migration directory:

- `supabase/migrations/`

Legacy SQL files remain in place for traceability:

- repository root one-off SQL files
- `migrations/`

Do not apply legacy SQL files directly unless a recovery audit explicitly requires it. New migrations should be created in `supabase/migrations/`.

## Safety Rules

- Never infer the Supabase project.
- Never store database passwords in scripts, docs, env files, or git.
- Always link the intended environment explicitly before migration commands.
- Always run `migration list` before any dry-run.
- Always run and review `db push --dry-run` before any push.
- Never mark a migration applied until its schema change is confirmed in that environment.
- Stop if dev and production differ unless the difference is intentional and documented.
- Do not squash or replace the active migration stream without explicit owner approval.
- `public.user_settings` is legacy production data. Preserve it and do not baseline or modify it.
- `public.cache_settings` is obsolete. The forward reconciliation migration removes it when present.

## Safe Commands

Confirm the currently linked project:

```bash
npm run supabase:current
```

Link dev:

```bash
npm run supabase:link:dev -- --project-ref <DEV_PROJECT_REF>
```

List dev migration status:

```bash
npm run supabase:list:dev
```

Dry-run dev:

```bash
npm run supabase:dry-run:dev
```

Push dev after reviewing the dry-run:

```bash
npm run supabase:push:dev -- --after-dry-run
```

Verify dev:

```bash
npm run supabase:verify:dev
```

Link production:

```bash
npm run supabase:link:production -- --project-ref <PRODUCTION_PROJECT_REF>
```

List production migration status:

```bash
npm run supabase:list:production
```

Dry-run production:

```bash
npm run supabase:dry-run:production
```

Push production after reviewing the dry-run:

```bash
npm run supabase:push:production -- --after-dry-run
```

Verify production:

```bash
npm run supabase:verify:production
```

Print the full safe release workflow:

```bash
npm run supabase:release-plan
```

## CLI Migration Stream

The CLI stream preserves SQL contents from `migrations/` while using Supabase CLI timestamp filenames. The 2026-07-14 and 2026-07-15 files are ordered by dependency so parent tables exist before child/link tables.

| CLI migration | Source file | Classification |
|---|---|---|
| `20260531000000_dev_schema.sql` | `migrations/20260531_dev_schema.sql` | Confirmed applied to dev and production |
| `20260602000000_add_assignment_columns.sql` | `migrations/20260602_add_assignment_columns.sql` | Confirmed applied to dev and production |
| `20260628000000_add_profiles.sql` | `migrations/20260628_add_profiles.sql` | Confirmed applied to dev and production |
| `20260628000100_add_velocity_settings.sql` | `migrations/20260628_add_velocity_settings.sql` | Confirmed applied to dev and production |
| `20260702000000_add_subscriptions.sql` | `migrations/20260702_add_subscriptions.sql` | Confirmed applied to dev and production |
| `20260702000100_subscription_billing_customer_updates.sql` | `migrations/20260702_subscription_billing_customer_updates.sql` | Confirmed applied to dev and production |
| `20260703000000_add_income_activity_flags.sql` | `migrations/20260703_add_income_activity_flags.sql` | Confirmed applied to dev and production |
| `20260703000100_add_profile_identity_fields.sql` | `migrations/20260703_add_profile_identity_fields.sql` | Confirmed applied to dev and production |
| `20260704000000_add_beastlearning_private_beta.sql` | `migrations/20260704_add_beastlearning_private_beta.sql` | Confirmed applied to dev and production |
| `20260705000000_fix_learning_feedback_rls.sql` | `migrations/20260705_fix_learning_feedback_rls.sql` | Confirmed applied to dev and production |
| `20260706000000_add_learning_courses_and_activities.sql` | `migrations/20260706_add_learning_courses_and_activities.sql` | Confirmed applied to dev and production |
| `20260706000100_add_profile_learning_context.sql` | `migrations/20260706_add_profile_learning_context.sql` | Confirmed applied to dev and production |
| `20260713000000_add_learning_session_outcomes.sql` | `migrations/20260713_add_learning_session_outcomes.sql` | Confirmed applied to dev and production |
| `20260714000000_add_beast_goals.sql` | `migrations/20260714_add_beast_goals.sql` | Confirmed applied to dev and production |
| `20260714000100_add_beast_goal_milestones.sql` | `migrations/20260714_add_beast_goal_milestones.sql` | Confirmed applied to dev and production |
| `20260714000200_add_beast_documents.sql` | `migrations/20260714_add_beast_documents.sql` | Confirmed applied to dev and production |
| `20260715000000_add_beast_goal_support_items.sql` | `migrations/20260715_add_beast_goal_support_items.sql` | Confirmed applied to dev and production |
| `20260715000100_add_beast_goal_references.sql` | `migrations/20260715_add_beast_goal_references.sql` | Confirmed applied to dev and production |
| `20260715000200_add_beast_goal_contributions.sql` | `migrations/20260715_add_beast_goal_contributions.sql` | Confirmed applied to dev and production |
| `20260715000300_add_beast_goal_recommendations.sql` | `migrations/20260715_add_beast_goal_recommendations.sql` | Confirmed applied to dev and production |
| `20260715000400_add_beast_goal_lifecycle_events.sql` | `migrations/20260715_add_beast_goal_lifecycle_events.sql` | Confirmed applied to dev and production |
| `20260715000500_add_beast_document_module_links.sql` | `migrations/20260715_add_beast_document_module_links.sql` | Confirmed applied to dev and production |
| `20260715000600_reconcile_canonical_runtime_schema.sql` | forward-only canonical reconciliation | Confirmed applied to dev and production |
| `20260715000700_add_beast_document_storage_bucket.sql` | BeastOS document storage bucket and policies | Confirmed applied to dev and production |
| `20260715000800_add_beast_document_organization.sql` | BeastOS document folders, collections, tags, and organization metadata | Confirmed applied to dev and production |
| `20260715000900_add_beast_document_access_grants.sql` | BeastOS document ownership, household sharing, and access grants | Pending until pushed by Supabase CLI |

## Legacy SQL Inventory

| File | Classification | Notes |
|---|---|---|
| `20260526_add_debt_payment_behavior.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260527_add_payment_funding_source.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260529_add_funding_source_to_debts.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260529_add_next_due_date_to_debts.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260530_add_next_due_date_to_bill_events.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260531_add_assignment_horizon_months.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `20260531_add_linked_debt_id_to_funding_sources.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `debt_payments_migration.sql` | Obsolete or duplicate | Legacy root one-off; represented by the consolidated early schema stream. Preserve for traceability only. |
| `migrations/dev_seed_placeholders.sql` | Obsolete for remote migrations | Local/dev seed data only. Excluded from `supabase/migrations/`. |

## Forward-Only Canonical Reconciliation

The active migration stream is not squashed. Existing migration files stay unchanged. The forward reconciliation migration is:

- `supabase/migrations/20260715000600_reconcile_canonical_runtime_schema.sql`

That migration:

- drops `public.cache_settings` if it exists because current application code does not use it
- does not touch `public.user_settings`
- verifies/adds `user_id` uniqueness for `cash_settings` and `debt_settings` only when no equivalent unique key exists
- does not rewrite primary keys
- contains no destructive changes to runtime data

### DEV Release Sequence

DEV normally records migrations through the latest released migration. To apply pending forward migrations:

```bash
npm run supabase:link:dev -- --project-ref <DEV_PROJECT_REF>
npm run supabase:current
npm run supabase:list:dev
npm run supabase:dry-run:dev
npm run supabase:push:dev -- --after-dry-run
npm run supabase:verify:dev
```

Then validate the app:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

### One-Time PRODUCTION Bootstrap

PRODUCTION has manually applied historical schema changes but no recorded migration history. Repair only versions whose runtime schema is sufficiently present, leaving genuinely missing migrations pending for normal `db push`.

Link production and confirm the target:

```bash
npm run supabase:link:production -- --project-ref <PRODUCTION_PROJECT_REF>
npm run supabase:current
npm run supabase:list:production
```

Mark sufficiently-present historical runtime schema as applied:

```bash
npx supabase migration repair --status applied 20260531000000
npx supabase migration repair --status applied 20260602000000
npx supabase migration repair --status applied 20260628000000
npx supabase migration repair --status applied 20260628000100
npx supabase migration repair --status applied 20260703000100
npx supabase migration repair --status applied 20260704000000
npx supabase migration repair --status applied 20260705000000
npx supabase migration repair --status applied 20260706000000
npx supabase migration repair --status applied 20260706000100
npx supabase migration repair --status applied 20260713000000
npx supabase migration repair --status applied 20260714000000
npx supabase migration repair --status applied 20260714000100
npx supabase migration repair --status applied 20260714000200
npx supabase migration repair --status applied 20260715000000
```

Leave these migrations pending so normal CLI push applies them:

- `20260702000000_add_subscriptions.sql`
- `20260702000100_subscription_billing_customer_updates.sql`
- `20260703000000_add_income_activity_flags.sql`
- `20260715000100_add_beast_goal_references.sql`
- `20260715000200_add_beast_goal_contributions.sql`
- `20260715000300_add_beast_goal_recommendations.sql`
- `20260715000400_add_beast_goal_lifecycle_events.sql`
- `20260715000500_add_beast_document_module_links.sql`
- `20260715000600_reconcile_canonical_runtime_schema.sql`

Then list, dry-run, push, and verify:

```bash
npm run supabase:list:production
npm run supabase:dry-run:production
npm run supabase:push:production -- --after-dry-run
npm run supabase:verify:production
```

After production succeeds, return the local CLI link to DEV:

```bash
npm run supabase:link:dev -- --project-ref <DEV_PROJECT_REF>
npm run supabase:current
```

Final desired state:

- DEV and PRODUCTION keep the same active local migration files.
- DEV and PRODUCTION record the same migration versions after each release.
- `public.cache_settings` is absent.
- production `public.user_settings` remains preserved.
- future migrations are handled normally through Supabase CLI.

## Validation Rule

Migration management validation should confirm:

- `supabase/migrations/` exists.
- The canonical CLI migration filenames exist in dependency-safe order.
- Legacy root SQL files are not duplicated into the CLI stream.
- `migrations/dev_seed_placeholders.sql` is not present in the CLI stream.
- Supabase command scripts require explicit environment selection.
- Push commands require a reviewed dry-run marker.
