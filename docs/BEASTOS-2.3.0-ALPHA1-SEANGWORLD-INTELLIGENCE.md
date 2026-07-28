# BeastOS 2.3.0-alpha1 — SEANGWORLD Intelligence

BP-240 connects the existing owner-only SEANGWORLD Intelligence foundation to
Google Analytics 4 and Google Search Console.

## Release-candidate scope

- Server-only service-account authentication.
- Live GA4 visitors, users, sessions, views, engagement, geography, technology,
  traffic-source, landing-page, exit-page, and trend reporting.
- Live Search Console clicks, impressions, CTR, average position, top queries,
  and top landing pages.
- Provider connection, synchronization, freshness, no-data, unavailable, and
  failure states.
- Bounded provider concurrency, retry behavior, safe errors, five-minute
  server-side caching, and graceful operation without configured providers.
- Deterministic high-exit, low/falling CTR, rising-impression, mobile-engagement,
  and traffic-spike recommendations based only on verified provider values.

## Security boundary

All Google credentials remain in server environment variables. The provider
adapters run only from the owner-authorized Node.js API route and never return
credentials, access tokens, property identifiers, or raw provider errors to the
browser.

## Excluded

- Google AdSense.
- AI-generated analytics claims.
- Synthetic or placeholder analytics.
- Database migrations.
- Push, deployment, or release activity.

## Configuration

See `docs/ENV.md` and `.env.local.example` for environment variables, Google API
enablement, minimum property permissions, and connection verification.
