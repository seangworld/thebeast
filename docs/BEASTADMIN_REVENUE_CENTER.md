# BeastAdmin Revenue Center

BA-ADS-201 introduces the Generation 1 owner workspace for revenue reporting
and advertising governance.

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

The server adapter uses OAuth read access to the AdSense Management API. Set the
variables documented in `docs/ENV.md` independently in development, preview,
and production. The owner-only route never returns OAuth credentials or raw
provider error payloads.

No database migration is required. Beast placement state is persisted through
the existing feature-flag capability.
