**Dev Supabase Schema Runbook**

- **Purpose:** create a clean development schema equivalent to production structure used by the app, without copying any production data.
- **Files referenced:** `migrations/20260531_dev_schema.sql`, `migrations/dev_seed_placeholders.sql`
- **Current migration source of truth:** use `docs/SUPABASE_MIGRATIONS.md` and `supabase/migrations/` for Supabase CLI-managed migration history.

This runbook is retained for legacy dev schema context and local seed guidance. Do not use it to bypass the Supabase CLI migration history once a project is linked and repaired.

Quick steps to create the dev schema

1. Create a new Supabase project for development (do NOT use production credentials).
2. In the Supabase dashboard go to SQL -> New query.
3. Paste the full contents of `migrations/20260531_dev_schema.sql` and run it.
   - This creates tables, indexes and RLS policies.
   - Statements use `IF NOT EXISTS` and are safe to re-run.
4. Sign up a test user (via the app or Supabase Auth) and get the test user's UUID.
5. (Optional) Open `migrations/dev_seed_placeholders.sql`, replace `<TEST_USER_ID>` and other placeholders with the test user's UUID (or explicit IDs), then run the SQL in the Supabase SQL editor to create minimal test rows.
6. Confirm RLS: each table in the migration is created with RLS enabled and policies that restrict access to `auth.uid() = user_id`.
7. Update your local `.env.local` to point to the dev Supabase project (use `.env.local.example` as a template in the repo). Do NOT commit real keys.

Seed file usage (short workflow)

- `migrations/dev_seed_placeholders.sql` is intentionally minimal and uses only placeholders.
- Steps:
  1. Create a test user in the dev Supabase project (Auth -> Users) or sign up via the app.
  2. Copy the test user's UUID.
  3. Edit `migrations/dev_seed_placeholders.sql`: replace `<TEST_USER_ID>` with that UUID, and optionally fill `<CHECKING_FUNDING_ID>`, `<CREDIT_CARD_FUNDING_ID>`, `<HELOC_FUNDING_ID>` or leave them as new generated UUIDs.
  4. Run the seed SQL in the Supabase SQL editor.
  5. Run the quick checks at the bottom of the seed file to verify rows were created.

Safety notes

- NEVER run these files against a production project. They reference `auth.users` and will create/modify tables in whichever project you run them in.
- The seed file contains no real emails, PII, or production UUIDs — placeholders are required to be replaced by a developer with dev-only values.
