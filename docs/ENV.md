# Environment variable guidance

This project uses Supabase for backend services. Follow these rules to avoid accidental modification of production data.

- Local development: create a `.env.local` file (gitignored) with keys for a development/test Supabase project only.
  - Use `.env.local.example` as a template.
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set for local development.
  - `NEXT_PUBLIC_BEAST_SITE_URL` is the canonical callback origin. Set it to `https://thebeast.seangworld.com` in production; leave it blank for localhost or dynamic previews.
  - `NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED` controls whether BeastOS offers account creation. It defaults to enabled unless set to `false`.
  - `NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED` exposes password sign-in only when set to `true`; magic-link sign-in remains the default.
  - `BEAST_INVITATION_EXPIRY_HOURS` controls the lifecycle timestamp shown by BeastAdmin for a newly sent invitation. Keep it aligned with the Supabase Auth Email OTP Expiration; both default to one hour.

- Dev/pre-production (Vercel/Supabase): use the existing `the-beast-dev` Supabase project and separate dev/preview Vercel environment variables. Follow `docs/DEV_ENVIRONMENT.md`.

- Production (Vercel): configure the same variables in the Vercel project settings for the `production` environment. Do NOT check production keys into source control.

- The application will refuse to start client-side if the Supabase env vars are not set. This prevents accidental writes to unintended projects.

- Scripts in `/scripts` also require these env vars and will abort if not set.

## SEANGWORLD Intelligence

SEANGWORLD Intelligence checks analytics configuration only in the owner-only
server route. Google service-account credentials, provider identifiers, status,
synchronization timestamps, and cached provider snapshots must never use the
`NEXT_PUBLIC_` prefix.

Google Analytics 4 uses `SEANGWORLD_GA4_PROPERTY_ID`,
`SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL`, and
`SEANGWORLD_GOOGLE_PRIVATE_KEY`. Search Console uses
`SEANGWORLD_SEARCH_CONSOLE_SITE_URL` with the same service account. First-party
telemetry is enabled explicitly with
`SEANGWORLD_FIRST_PARTY_ANALYTICS_ENABLED=true`.

The `*_SNAPSHOT_JSON` values are transport boundaries for verified output from
a server-side synchronization job. Do not manually invent snapshots. Without a
verified snapshot, the dashboard reports configuration and synchronization
guidance but does not display analytics totals or recommendations.

Quick steps for local setup:

1. Create a development Supabase project (if you don't have one).
2. Copy `.env.local.example` -> `.env.local` and set the values to your DEV project.
3. Run the app locally: `npm run dev`.

Before deploying production, validate against `the-beast-dev` and confirm every required migration has been applied there first. Production deploys must not be used as the first test of a database migration.

If you need to run against production for any reason, do NOT set production creds in `.env.local`. Instead, use a protected environment in your CI/CD or Vercel with restricted access and approvals.
