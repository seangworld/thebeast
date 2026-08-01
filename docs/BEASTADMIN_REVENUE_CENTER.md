# BeastAdmin Revenue Center

BA-ADS-201 introduces the Generation 1 owner workspace for revenue reporting
and advertising governance. BA-ADS-202 adds production Google OAuth.

## Boundaries

- Google AdSense is the only connected-source adapter in Generation 1.
- Earnings, page views, impressions, clicks, CTR, and page RPM come only from
  aggregate AdSense Management API reports.
- Current-period values and the monthly pace projection are labeled estimated.
- Lifetime reporting remains unavailable until an approved reporting start date
  is configured.
- Query strings and URL fragments are removed before page labels reach the UI.
- Affiliate revenue, digital products, courses, memberships, sponsors,
  consulting, donations, and merchandise are registered as future sources, not
  reported as zero.

## Placement contract

Beast renders at most one shared responsive ad component, at the page footer.
The component fails closed unless all of these are true:

1. the route is explicitly eligible;
2. the owner has released the placement through the existing feature-flag
   system;
3. the production client and slot are configured;
4. advertising consent is explicitly enabled; and
5. the lazy-loaded placement enters the viewport.

The shared component requests non-personalized ads (`data-npa="1"`); advertising
personalization is not enabled by this capability.

Conversations, professional workspaces, messages, forms, financial records,
education records, health records, documents, and every BeastAdmin workspace
are permanently ineligible. Ad blockers and script failures collapse the
placement without blocking page content.

SEANGWORLD is a separate application. Its inventory is labeled as an external
adapter here and must be governed in the SEANGWORLD repository and with Google
page exclusions. Future products should register stable product, module,
placement, route, and feature-flag identifiers before rendering an ad.

## Provider setup

The server adapter uses the Google web-server OAuth flow with offline access,
PKCE, a short-lived HTTP-only state cookie, and the
`adsense.readonly` scope. Connect, callback, status, and disconnect routes are
owner-only. The callback validates state before exchanging the authorization
code. Access tokens are refreshed automatically and never persisted.

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and
`GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` as documented in `docs/ENV.md`. Do not store
a refresh token manually in Vercel. Refresh tokens are encrypted with
AES-256-GCM before being stored in the owner-scoped
`google_oauth_connections` table. Browser responses contain only connection
metadata, never credentials, token ciphertext, or raw provider errors.

The forward-only BA-ADS-202 migration creates `google_oauth_connections` with
RLS requiring the authenticated owner and an admin profile. The architecture
registers stable provider identifiers for future Analytics, Search Console,
Drive, Calendar, and Gmail integrations without granting those scopes today.
Beast placement state remains persisted through the existing feature-flag
capability.
