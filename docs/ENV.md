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

SEANGWORLD Intelligence connects to analytics only from the owner-authorized
server route. Google service-account credentials and provider identifiers must
never use the `NEXT_PUBLIC_` prefix and are never serialized to the browser.

Google Analytics 4 uses `SEANGWORLD_GA4_PROPERTY_ID`,
`SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL`, and
`SEANGWORLD_GOOGLE_PRIVATE_KEY`. Search Console uses
`SEANGWORLD_SEARCH_CONSOLE_SITE_URL` with the same service account. Use the
numeric GA4 property ID, not a measurement ID. Use the exact Search Console
property identifier (`sc-domain:example.com` or a URL-prefix property including
its trailing slash). First-party telemetry is enabled explicitly with
`SEANGWORLD_FIRST_PARTY_ANALYTICS_ENABLED=true`.

The Google Analytics Data API and Search Console API must be enabled in the
service account's Google Cloud project. Grant the service-account email:

- Viewer access to the GA4 property.
- Search Console user access to the exact configured property.

Store the PKCS8 private key as its PEM content. Hosts that require a single-line
value may preserve line breaks as literal `\n` sequences. Never commit the key.

The owner dashboard synchronizes a 30-day reporting window and its preceding
30-day comparison window. Requests use bounded concurrency, retry transient
Google responses, and retain a short server cache to protect provider quotas.
Missing credentials, denied permissions, provider outages, and empty reporting
periods return safe provider states instead of failing the application.

The `*_STATUS`, `*_SNAPSHOT_JSON`, and synchronization timestamp values remain
as a compatibility fallback for verified server-generated snapshots. Do not
manually invent snapshots. AdSense is intentionally not connected in
2.3.0-alpha1.

Setup:

1. Enable the Google Analytics Data API and Google Search Console API.
2. Create a dedicated service account and securely retain its JSON private key.
3. Add the service-account email to the GA4 property and Search Console property
   with the minimum read permissions above.
4. Set the four `SEANGWORLD_*` live-provider variables in the protected server
   environment.
5. Open BeastAdmin → SEANGWORLD Intelligence as an owner and confirm each
   provider reports Connected, a recent Last Sync, and current Data Freshness.

Quick steps for local setup:

1. Create a development Supabase project (if you don't have one).
2. Copy `.env.local.example` -> `.env.local` and set the values to your DEV project.
3. Run the app locally: `npm run dev`.

Before deploying production, validate against `the-beast-dev` and confirm every required migration has been applied there first. Production deploys must not be used as the first test of a database migration.

If you need to run against production for any reason, do NOT set production creds in `.env.local`. Instead, use a protected environment in your CI/CD or Vercel with restricted access and approvals.
