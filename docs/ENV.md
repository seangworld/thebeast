# Environment variable guidance

This project uses Supabase for backend services. Follow these rules to avoid accidental modification of production data.

- Local development: create a `.env.local` file (gitignored) with keys for a development/test Supabase project only.
  - Use `.env.local.example` as a template.
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set for local development.

- Dev/pre-production (Vercel/Supabase): use the existing `the-beast-dev` Supabase project and separate dev/preview Vercel environment variables. Follow `docs/DEV_ENVIRONMENT.md`.

- Production (Vercel): configure the same variables in the Vercel project settings for the `production` environment. Do NOT check production keys into source control.

- The application will refuse to start client-side if the Supabase env vars are not set. This prevents accidental writes to unintended projects.

- Scripts in `/scripts` also require these env vars and will abort if not set.

Quick steps for local setup:

1. Create a development Supabase project (if you don't have one).
2. Copy `.env.local.example` -> `.env.local` and set the values to your DEV project.
3. Run the app locally: `npm run dev`.

Before deploying production, validate against `the-beast-dev` and confirm every required migration has been applied there first. Production deploys must not be used as the first test of a database migration.

If you need to run against production for any reason, do NOT set production creds in `.env.local`. Instead, use a protected environment in your CI/CD or Vercel with restricted access and approvals.
