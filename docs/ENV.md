# Environment variable guidance

This project uses Supabase for backend services. Follow these rules to avoid accidental modification of production data.

- Local development: create a `.env.local` file (gitignored) with keys for a development/test Supabase project only.
  - Use `.env.local.example` as a template.
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set for local development.
  - `NEXT_PUBLIC_BEAST_SITE_URL` is the canonical callback origin. Set it to `https://thebeast.seangworld.com` in production; leave it blank for localhost or dynamic previews.
  - `NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED` controls whether BeastOS offers account creation. It defaults to enabled unless set to `false`.
  - `NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED` exposes password sign-in only when set to `true`; magic-link sign-in remains the default.
  - `NEXT_PUBLIC_BEAST_GOOGLE_AUTH_ENABLED` exposes Google sign-in only when set to `true` after that environment's Supabase Google provider is configured and verified. Unrelated Google integration credentials must not be reused implicitly.
  - `BEAST_INVITATION_EXPIRY_HOURS` controls the lifecycle timestamp shown by BeastAdmin for a newly sent invitation. Keep it aligned with the Supabase Auth Email OTP Expiration; both default to one hour.

- Dev/pre-production (Vercel/Supabase): use the existing `the-beast-dev` Supabase project and separate dev/preview Vercel environment variables. Follow `docs/DEV_ENVIRONMENT.md`.

- Production (Vercel): configure the same variables in the Vercel project settings for the `production` environment. Do NOT check production keys into source control.

- The application will refuse to start client-side if the Supabase env vars are not set. This prevents accidental writes to unintended projects.

- Scripts in `/scripts` also require these env vars and will abort if not set.

## SEANGWORLD Intelligence

SEANGWORLD Intelligence connects to analytics only from the owner-authorized
server route. Google workload-identity identifiers must never use the
`NEXT_PUBLIC_` prefix and are never serialized to the browser. No service-account
private key is created, stored, or accepted by this integration.

Google Analytics 4 uses `BEAST_ECOSYSTEM_GA4_PROPERTY_ID`,
`GOOGLE_WIF_PROVIDER_RESOURCE`, and
`GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL`. The Vercel runtime exchanges its OIDC
identity through Google Workload Identity Federation and impersonates the
dedicated read-only service account with short-lived tokens. Search Console can
use `SEANGWORLD_SEARCH_CONSOLE_SITE_URL` with the same federation identity. Use
the numeric GA4 property ID, not a measurement ID. Use the exact Search Console
property identifier (`sc-domain:example.com` or a URL-prefix property including
its trailing slash). First-party ecosystem telemetry does not require a third-
party credential or browser environment flag. It becomes available only when
the BA-TEL-001 database migration is present and the current authenticated user
passes the existing BeastAdmin owner check.

Privacy-first browser product analytics uses
`NEXT_PUBLIC_GA_MEASUREMENT_ID`. It must be a GA4 web-stream measurement ID such
as `G-XXXXXXXXXX`; do not confuse it with the numeric Data API property ID.
`NEXT_PUBLIC_ANALYTICS_CONSENT_DEFAULT` supports `pending`, `disabled`, or
`enabled` and defaults safely to `pending`. Collection is suppressed outside
production and GA4 does not load until consent is enabled. Beast configures
`send_page_view: false`, disables Google Signals and advertising
personalization, and emits only the allowlisted `bo404-v1` product-intelligence
contract. BeastAdmin treats `BEAST_ECOSYSTEM_GA4_PROPERTY_ID` as the numeric
property explicitly approved for cross-product aggregates. The legacy
`SEANGWORLD_GA4_PROPERTY_ID` is not assumed to have ecosystem-wide stream
coverage.

The Google Analytics Data API and, when used, Search Console API must be enabled
in the service account's Google Cloud project. Grant the service-account email:

- Viewer access to the GA4 property.
- Restricted Search Console user access to the exact configured property. A
  verified Domain property is preferred when the integration must cover the
  root domain and its subdomains.

Grant the WIF principal only `roles/iam.workloadIdentityUser` on this dedicated
service account, constrained to the approved Vercel project and Preview and
Production environments. Do not grant the service account project roles and do
not configure `VERCEL_OIDC_TOKEN` manually; Vercel supplies it per invocation.

The owner dashboard supports 7-, 30-, and 90-day reporting windows and matching
preceding comparison windows. Search Console first discovers the latest date
with finalized data, then labels the normal 2–3 day reporting delay explicitly.
Requests use bounded concurrency, retry transient Google responses, and retain
a 15-minute server cache to protect provider quotas.
Missing credentials, denied permissions, provider outages, and empty reporting
periods return safe provider states instead of failing the application.

First-party telemetry uses canonical Supabase product records plus a bounded
append-only operational-event table. Raw actor UUIDs stay server-side; the
owner RPC returns aggregate counts only. Production owner/admin activity is
classified separately from members, and Preview/DEV/test events never count in
Production operational telemetry. No first-party event is sent to GA4.

The `*_STATUS`, `*_SNAPSHOT_JSON`, and synchronization timestamp values remain
as a compatibility fallback for verified server-generated snapshots. Do not
manually invent snapshots. AdSense reporting is configured independently as
described below.

Setup:

1. Enable the Google Analytics Data API and, when used, Google Search Console API.
2. Create a dedicated service account without a JSON key and a Workload Identity
   Federation provider that trusts only the approved Vercel identity claims.
3. Grant the WIF principal service-account impersonation, then add the service
   account to GA4 as a restricted Viewer (and Search Console when used).
4. Set the three non-secret WIF/GA4 variables in the protected Vercel Preview and
   Production environments.
5. Open BeastAdmin → SEANGWORLD Intelligence as an owner and confirm each
   provider reports Connected, a recent Last Sync, and current Data Freshness.

Quick steps for local setup:

1. Create a development Supabase project (if you don't have one).
2. Copy `.env.local.example` -> `.env.local` and set the values to your DEV project.
3. Run the app locally: `npm run dev`.

Before deploying production, validate against `the-beast-dev` and confirm every required migration has been applied there first. Production deploys must not be used as the first test of a database migration.

If you need to run against production for any reason, do NOT set production creds in `.env.local`. Instead, use a protected environment in your CI/CD or Vercel with restricted access and approvals.
## Revenue Center and AdSense

Revenue Center reports aggregate AdSense data only when these server variables
are configured in the target environment:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (the exact production callback URL, for example
  `https://thebeast.seangworld.com/api/admin/revenue/google/callback`)
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` (32 random bytes encoded as base64 or
  64 hexadecimal characters; keep this stable and server-only)
- `GOOGLE_ADSENSE_REPORTING_START_DATE` (optional `YYYY-MM-DD`; required for
  the lifetime custom range)

The browser ad unit derives its `ca-pub-...` client identifier from the same
canonical publisher registry used by `/ads.txt`. It uses
`NEXT_PUBLIC_ADSENSE_FOOTER_SLOT` and
`NEXT_PUBLIC_ADSENSE_CONSENT_DEFAULT`. Consent defaults to `pending`; ads do not
load unless it is explicitly `enabled`, the runtime is production, the
placement feature flag is Released, and the current route is eligible.

OAuth credentials and token-encryption keys are server-only. Never prefix them
with `NEXT_PUBLIC_`. Refresh tokens are created through the owner Connect flow,
encrypted in `google_oauth_connections`, and must not be manually stored in
Vercel environment variables.
Revenue Center remains truthful and shows unavailable states when reporting is
not configured. SEANGWORLD placement is controlled in its own repository and
through approved Google page exclusions; this Beast workspace does not pretend
to modify an external site.
