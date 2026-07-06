# BeastOS Dev Environment

This runbook uses the existing `thebeast-dev` environment as the required
pre-production validation target. Do not create a separate Supabase staging
project unless that is explicitly approved later.

## Purpose

`thebeast-dev` must catch code/schema drift before production. Every release
that changes database shape, RLS, auth, navigation, onboarding, or user-owned
data flows must pass `thebeast-dev` before it is deployed to production.

## Access Required

Codex cannot configure cloud resources without authenticated Supabase and Vercel
access. A project owner must perform dashboard/API steps for `thebeast-dev`.

Required access:

- Supabase organization permission for the `thebeast-dev` project.
- Vercel team permission for the dev/preview deployment environment.
- Stripe test-mode access if billing flows are validated.
- OpenAI key access if live Learning AI calls are validated.

## Dev Supabase Project

Use the existing Supabase project:

- Project name: `thebeast-dev`
- Data policy: schema parity with production, no production user data copied.

Do not duplicate production data into dev. If a production schema dump is used,
use schema-only export. Do not include auth users, profile rows, debts, bills,
feedback, certificates, or other user data.

## Apply Schema

Run local migrations in this order against `thebeast-dev`:

```text
migrations/20260531_dev_schema.sql
migrations/20260602_add_assignment_columns.sql
migrations/20260628_add_profiles.sql
migrations/20260628_add_velocity_settings.sql
migrations/20260702_add_subscriptions.sql
migrations/20260702_subscription_billing_customer_updates.sql
migrations/20260703_add_income_activity_flags.sql
migrations/20260703_add_profile_identity_fields.sql
migrations/20260704_add_beastlearning_private_beta.sql
migrations/20260705_fix_learning_feedback_rls.sql
migrations/20260706_add_learning_courses_and_activities.sql
migrations/20260706_add_profile_learning_context.sql
```

Do not run `migrations/dev_seed_placeholders.sql` until a dev-only test user
exists and the placeholders are replaced with dev-only IDs.

## Required Profile Schema

Verify `thebeast-dev` has every app-required `public.profiles` column:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;
```

Required columns:

```text
id
role
onboarding_complete
stripe_customer_id
created_at
updated_at
preferred_name
display_name
full_name
username
birthday
location
timezone
household_context
bio
current_academic_level
career_interests
learning_preferences
learning_availability
learning_strengths
learning_help_areas
```

If any optional profile context columns are missing, run:

```sql
alter table public.profiles
  add column if not exists preferred_name text null,
  add column if not exists display_name text null,
  add column if not exists full_name text null,
  add column if not exists username text null,
  add column if not exists birthday date null,
  add column if not exists location text null,
  add column if not exists timezone text null,
  add column if not exists household_context text null,
  add column if not exists bio text null,
  add column if not exists current_academic_level text null,
  add column if not exists career_interests text null,
  add column if not exists learning_preferences text null,
  add column if not exists learning_availability text null,
  add column if not exists learning_strengths text null,
  add column if not exists learning_help_areas text null;
```

## Required BeastLearning Tables

Verify these tables exist:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'learning_profiles',
    'learning_courses',
    'learning_goals',
    'learning_plans',
    'learning_sessions',
    'learning_activities',
    'learning_feedback',
    'learning_certificates'
  )
order by table_name;
```

## RLS Verification

Confirm RLS is enabled for user-owned tables:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'learning_profiles',
    'learning_courses',
    'learning_goals',
    'learning_plans',
    'learning_sessions',
    'learning_activities',
    'learning_feedback',
    'learning_certificates'
  )
order by tablename;
```

Expected: `rowsecurity = true`.

Check policies:

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'learning_profiles',
    'learning_courses',
    'learning_goals',
    'learning_plans',
    'learning_sessions',
    'learning_activities',
    'learning_feedback',
    'learning_certificates'
  )
order by tablename, policyname;
```

Expected pattern:

- `profiles`: users can select/update where `auth.uid() = id`.
- Learning tables: users can select/insert/update/delete their own rows where
  `auth.uid() = user_id`.
- Feedback: authenticated users only access their own feedback.
- Certificates: authenticated users only access their own certificates.

## Dev Admin/Test Data

Create dev-only auth users through Supabase Auth or the app:

- `dev-admin`
- `dev-learner`
- `dev-adult`

Promote only the dev admin:

```sql
update public.profiles
set role = 'admin'
where id = '<DEV_ADMIN_AUTH_USER_ID>';
```

Do not run this against production unless it is an approved production admin
operation.

## Vercel Dev Setup

Use the existing dev/preview deployment target for BeastOS.

Rules:

- Dev/preview environment variables must be separate from production.
- Supabase URL/key must point to `thebeast-dev`.
- Stripe keys must be test-mode keys.
- Redirect URLs must point to the dev/preview domain.
- `BEASTLEARNING_DEMO_MODE` must be `false`.
- Never reuse production service role keys in dev.

## Dev Environment Variables

Use `docs/dev.env.example` as the canonical list.

Required dev/preview env vars:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
OPENAI_LEARNING_MODEL
BEASTLEARNING_DEMO_MODE=false
```

## Local Dev Validation

For local testing against `thebeast-dev`, copy `docs/dev.env.example` to a
local gitignored file such as `.env.local` and fill it with dev values only.

Then run:

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Dev Smoke Test

Run before production deployment:

```text
Auth
- Sign up with a dev-only learner.
- Log out and log back in with magic link.

BeastLearning
- Complete onboarding.
- Confirm redirect lands on /dashboard/today.
- Confirm no /dashboard/onboarding loop.
- Confirm Learning Center loads.
- Complete first activity.
- Confirm Today updates.

Profile
- Save preferred name.
- Save career interests.
- Save learning preferences.
- Confirm no schema-cache errors.

Admin
- Log in as dev admin.
- Confirm Admin View As appears.
- Switch Admin/Pro/Free modes.

BeastMoney
- Open Money dashboard.
- Open Cashflow.
- Confirm no regressions.

Security
- Confirm feedback only shows current user's feedback.
- Confirm certificate downloads require ownership.
- Confirm Learning AI requires auth.
```

## Production Release Gate

Do not deploy production until all are true:

- Code merged into `main` only after `thebeast-dev` passes.
- Required migrations applied to `thebeast-dev`.
- Dev smoke test passed.
- Required migrations applied to production.
- Production schema verification SQL passed.
- Vercel production env vars checked.
- Production deploy completed.
- Production smoke test completed.

## Required Codex Handoff Sections

Every future Codex release handoff must include:

```text
Code changes:

Database changes:

Migration required: yes/no

Migration files:

Exact SQL:

Dev validation:

Production deployment steps:

Smoke test results:

Rollback plan:
```

If `Migration required: yes`, production deploy must wait until the migration and
smoke test pass in `thebeast-dev`.
