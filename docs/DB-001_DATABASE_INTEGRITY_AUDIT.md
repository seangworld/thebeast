# DB-001 — SQL, Migration, and Database Integrity Audit

Audit date: 2026-07-29 EDT

Repository: `/Users/seangworld/Desktop/Beast/thebeast`

Audit mode: repository and local-source inspection only

No Supabase environment was queried or modified. The repository is locally
linked to the development project, but DB-001 deliberately did not use that
link. Live-schema and migration-ledger state remain the responsibility of the
read-only BeastAdmin Migration Status workflow.

## Executive conclusion

The canonical migration source is `supabase/migrations/`. It contains 64
ordered migrations with unique 14-digit versions. Static inspection found:

- 84 `CREATE TABLE` statements representing 79 unique public tables;
- one deliberate final table removal (`cache_settings`), leaving 78 expected
  public tables after the complete chain;
- 91 function definitions representing 76 unique public functions;
- 40 trigger definitions representing 35 unique trigger names;
- 114 policy definitions representing 106 unique policy names;
- 121 index definitions representing 106 unique index names;
- 69 grant statements and 88 revoke statements;
- one extension (`pgcrypto`) declared idempotently;
- no repository-defined views, materialized views, or PostgreSQL enum types.

Every one of the 79 tables created by the chain has an explicit RLS-enablement
statement. All 114 statically discoverable policies use either an
`auth.uid()` ownership check or the owner/admin authorization function. Every
statically discoverable `SECURITY DEFINER` function has an explicit
`search_path`.

All literal application references to Supabase tables and RPCs resolve to an
object defined in the canonical migration stream. The one non-table `.from()`
literal is the private `beast-documents` Storage bucket, which is created by
`20260715000700_add_beast_document_storage_bucket.sql`.

## 1. Safe to keep

### Canonical migration stream

- Keep all 64 files in `supabase/migrations/` in their existing order.
- Keep historical migrations immutable.
- Keep the forward-only reconciliation migrations:
  - `20260726002000_reconcile_beast_auth_email_workflows.sql`
  - `20260726002100_reconcile_beast_admin_member_invitations.sql`
  - `20260726002200_reconcile_beast_admin_account_access_history.sql`
- Keep `20260726000950_ensure_beast_admin_updated_at_trigger.sql`; it repairs
  the missing helper dependency before member account editing.
- Keep RLS enabled on every member-data and administrative table.
- Keep service-role use inside server-only routes and
  `src/lib/supabase/admin.ts`.

### Historical SQL

The 22 date-prefixed files in `migrations/` are byte-for-byte mirrors of the
first 22 canonical CLI migrations. They are historical evidence, not a second
migration stream.

The eight root one-off SQL files are also historical evidence. Their effects
are consolidated into `20260531000000_dev_schema.sql`:

| Legacy file | Canonical representation |
|---|---|
| `20260526_add_debt_payment_behavior.sql` | `debts.payment_behavior`, `minimum_payment_rate`, and `minimum_payment_floor` |
| `20260527_add_payment_funding_source.sql` | payment `funding_source_id` columns and indexes |
| `20260529_add_funding_source_to_debts.sql` | `debts.funding_source_id` and index |
| `20260529_add_next_due_date_to_debts.sql` | `debts.next_due_date_after_payment` and index |
| `20260530_add_next_due_date_to_bill_events.sql` | `bill_events.next_due_date_after_payment` and index |
| `20260531_add_assignment_horizon_months.sql` | local baseline column; `cache_settings` is later retired |
| `20260531_add_linked_debt_id_to_funding_sources.sql` | `funding_sources.linked_debt_id` and FK |
| `debt_payments_migration.sql` | `debt_payments`, owner-scoped RLS, and indexes |

`migrations/dev_seed_placeholders.sql` is intentionally excluded from the CLI
stream and must not be used in shared or production environments.

## 2. Safe to migrate

No new production migration was justified by repository-only evidence.

DB-001 added `supabase/seed.sql` as a data-free local seed entrypoint because
`supabase/config.toml` enabled `./seed.sql` while the file did not exist. This
is local tooling configuration, not a database schema migration. It inserts no
demo, placeholder, or member data.

Any future database correction must be additive and forward-only. A missing
ledger entry alone is never evidence that SQL should be replayed.

## 3. Requires manual review

### Live schema and migration ledger

This audit did not query development, preview, or production. Therefore it
does not claim that any migration is applied, missing, or safe to execute in a
hosted environment. Use BeastAdmin Migration Status to compare repository,
ledger, and live schema before considering an execution or history repair.

### Supabase-generated types

`src/lib/types/database.ts` is a 519-line hand-maintained collection of domain
row types. It is not Supabase CLI generated output, does not define a complete
`Database` schema contract, and is not supplied as a generic to the browser,
server, or admin Supabase clients. It covers selected profiles, subscriptions,
Money, Education, Goals, Documents, and agent-memory records but does not cover
the full 78-table final schema.

Do not synthesize generated types from migration regexes. Generate them only
from an explicitly approved schema target, review the diff, and then type all
three Supabase client factories consistently.

### Shared-service persistence

| Service | Current authoritative behavior | Review finding |
|---|---|---|
| Goals | `beast_goals` and related `beast_goal_*` tables | Canonical BeastOS goal system. `learning_goals` remains Education-owned curriculum state, not a duplicate shared-goal replacement. |
| Documents | `beast_documents` and related organization/access/link tables | Canonical BeastOS document metadata and private Storage bucket. Health records reference document provenance rather than creating a second document store. |
| Calendar | Derived UI from current module data plus `beast_document_calendar_links` | No canonical persisted BeastOS calendar-event table exists yet. Do not claim durable shared-calendar persistence. |
| Timeline | Derived read model over Education, retirement, and platform events | No single canonical timeline table exists. This is an intentional read-model boundary, but persistence/provenance requirements need a future approved design. |
| Notifications | `beast_member_notifications` plus private-message notification rows | Two purpose-specific persisted sources are aggregated by the shared workspace. They are not interchangeable schemas. |
| Messages | `beast_admin_message_threads`, `beast_admin_messages`, and notification rows | Canonical private member-to-Administration support system. Agent conversation tables are professional memory, not member support messages. |

### Local full migration execution

Docker is not available in the audit environment, so a clean local Supabase
database could not be started and the 64-file chain could not be executed
against PostgreSQL. Static migration tests, TypeScript, lint, application tests,
and production build are required, but they do not replace a clean PostgreSQL
migration-chain run.

## 4. Do not replay

Do not replay these original migrations against a database where their
capabilities were manually or partially created:

- `20260726001100_add_beast_auth_email_workflows.sql`
- `20260726001200_add_beast_admin_member_invitations.sql`
- `20260726001300_add_beast_admin_account_access_history.sql`

They contain constraint replacement and object creation that can conflict with
the broader immutable audit constraint and newer objects. Their forward-only
reconciliation counterparts are the only repository-approved completion path,
and even those must not be executed without live-schema evidence and explicit
environment approval.

Do not apply any file from the repository root or `migrations/` as a new
migration. Do not execute `migrations/dev_seed_placeholders.sql` outside an
isolated disposable environment.

## 5. Do not delete

- Do not delete or rename any of the 64 canonical migrations.
- Do not delete the 22 historical mirrors or eight root one-off SQL files
  until a separately approved archival policy preserves their audit evidence.
- Do not delete member, household, financial, educational, health, document,
  conversation, recommendation, outcome, or execution-history data.
- Do not delete `learning_goals` merely because BeastOS also owns
  `beast_goals`; their current responsibilities differ.
- Do not remove the reconciliation migrations after a ledger repair.
- Do not remove RLS policies, ownership columns, audit triggers, immutable
  history protections, or explicit grants/revocations.

## Schema and ownership map

| Domain | Authoritative schema objects | Ownership boundary |
|---|---|---|
| Identity and membership | `profiles`, `subscriptions` | `id`/`user_id = auth.uid()`; owner/admin elevation through `is_profile_admin()` |
| Money | `debts`, `funding_sources`, `income_events`, bill/debt payment and settings tables, retirement tables | `user_id` or `owner_id = auth.uid()` |
| Education | `education_profiles`, `learning_*` | `owner_id` or `user_id = auth.uid()`; parent links explicitly relate users |
| Goals | `beast_goals`, milestones, support, references, contributions, recommendations, lifecycle events | `owner_id = auth.uid()` |
| Documents | `beast_documents`, folders, collections, access grants, module/calendar links, Storage policies | owner by default; explicit household/member grants for shared reads |
| Professional context | `agent_conversations`, messages, memories | `owner_id = auth.uid()` |
| Health | `beast_health_records` | `owner_id = auth.uid()` with provenance fields |
| Execution history | requests, plans, steps, recommendations, approvals, results, outcomes, follow-ups, confidence, audit and lifecycle events | owner-scoped reads/creates; append-only or immutable evidence where required |
| BeastAdmin | roadmap, analytics RPCs, flags, prompts, releases, invitations, member controls, audit, and private messaging | owner/admin-only RPC authorization plus RLS; members receive only explicitly scoped self-service reads |

## Regression coverage added by DB-001

`tests/databaseIntegrityAudit.test.ts` now fails when:

- migration versions collide or filenames stop following the CLI convention;
- a created public table lacks RLS enablement;
- a `SECURITY DEFINER` function lacks an explicit search path;
- literal application table or RPC usage lacks a canonical migration object;
- a legacy mirror silently diverges from its canonical counterpart;
- the configured local seed target disappears or begins inserting data; or
- a client component references the service-role environment variable.

These tests are repository guards. They do not claim to inspect hosted schema,
grants, policies, data, or migration history.
