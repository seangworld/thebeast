# Provider and SSO decision record — November 4, 2026

Research only: no new account, subscription, API key, provider activation, billing change or outreach. Existing BeastGuide feed gates stay closed. Directory was attempted first; no Stripe CLI is installed and stripe.directory returned an empty body through the available network path. This did not establish a Directory provider result. The findings below use the named providers' own documentation.

## Movies and popular/trending television

TMDB's FAQ defines its developer allowance as noncommercial with attribution and directs commercial users to its licensing/sales route. Advertising plans mean the free developer key alone does not settle BeastGuide's eligibility. Keep the existing token/commercial-approval gate closed until the actual intended use is cleared. No alternative with verified suitable rights, required coverage and a no-charge allowance has been established in this work. Manual movie entries and TVmaze title/actor discovery remain usable.

Source: [TMDB FAQ](https://developer.themoviedb.org/docs/faq). Contact/terms acceptance is an owner decision; no message has been sent.

## Concerts and ticketed events

Ticketmaster Discovery supports event, attraction and venue search and event images. Its documented default quota is 5,000 calls/day and 5 calls/second. It is a plausible concert discovery source, not evidence of complete live-event or PPV coverage. Its general terms restrict deriving revenue, require removal of requested event content within 24 hours, limit storage to reasonable periods and discourage polling unrelated to user actions. Before activation, confirm the proposed ad-supported library use, attribution/linkout, storage/removal behavior and actual granted access. Do not infer unrestricted commercial rights from an available developer key. No Ticketmaster credential is requested yet.

Sources: [Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/), [General terms](https://developer.ticketmaster.com/support/terms-of-use/).

## UFC / PPV and sports

TheSportsDB documents a public v1 quickstart and endpoint-specific free limits; its free allowance does not establish complete UFC, PPV, broadcast, home/away or artwork coverage. Dedicated premium v2 access is paid and outside this task's authority. Existing restricted sports adapters must not be enabled merely because a public demo request works. Keep manual game/event dates, notes and edits as the V1 coverage fallback. A paid provider, scraper, guessed PPV broadcast time or fictional schedule is not proposed.

Source: [TheSportsDB API](https://www.thesportsdb.com/api.php). Follow its linked endpoint-limit and licensing pages before a future access decision.

## Cross-application SSO

The same canonical Supabase project can provide OAuth 2.1/OIDC with authorization-code PKCE. Its documentation covers first-party mobile/desktop clients and existing RLS, with normal account MAU accounting. This is a candidate supported path, not an activated feature or a new identity project.

Proposed flow: register exact first-party clients/redirects in canonical Auth; use the BeastOS authorization UI with the existing username/password/session; issue only a single-use authorization code bound to a client, exact redirect, state and PKCE verifier; exchange the code through the supported endpoint. Never put access/refresh tokens in URLs, share broad parent-domain cookies, copy localStorage sessions, expose service keys, or replace explicit legacy-library dual-proof linking. Native clients would use the system authentication browser and Keychain custody.

Before implementation/activation, review hosted OAuth availability/settings, consent/authorization UI, exact redirect registration, logout/revocation semantics and the existing session-control/gateway checks. Verify actual OAuth JWT issuer, subject, session claims, client restrictions and RLS/entitlements against the current BeastGuide proof verifier. Do not assume shared account IDs alone create shared browser sessions. Cross-origin and embedded/native cases need separate real acceptance. No custom token broker or parallel identity database is authorized by this proposal.

Source: [Supabase OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server).

## Account email notifications

Existing SMTP and sender remain unchanged. Supabase supports project-level password/email/MFA/linked-identity security notifications; activation and the actual hosted template settings require review against shared BeastOS email traffic. Username assignment is an application event and needs an authenticated, idempotent application-mail delivery path using the already-approved sender. That path is not currently present in repository source. Do not claim an email was sent, infer delivery from a rendered template, expose registry lookups publicly or add a paid mail service. A concrete hosted settings/sender review is required before enabling these account notices.

Source: [Supabase email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates).
