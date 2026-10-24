# Instagram discovery diagnostics — 2026-10-24

PR #296 adds safe diagnostics to the existing Agency callback before one authorized fresh owner connection attempt. Earlier no_accounts responses cannot be reconstructed retroactively.

## Recorded fields

The `agency_instagram_discovery` event projects only `reason`, `pagesReturned`, `pagesWithToken`, `pagesWithLinkedInstagram`, `eligibleInstagramPages`, `expectedPageMatches`, `expectedPagePresent`, `expectedPageTokenPresent`, `expectedPageLinkedInstagramPresent`, and `expectedInstagramUsernameMatches`. There is no provider object spread, Page/account name or identifier, username, token, state, code, error body, request URL or raw response in the event. Counts are array-derived; indicators are booleans. Only a fixed reason code is included in an Agency no_accounts redirect, and UI copy comes from a fixed allowlist.

Reasons are ordered: invalid response, zero Pages, expected Page absent, ambiguous expected Page, missing Page token, missing linked Instagram account, Instagram username mismatch, ready. Invalid/ambiguous discovery fails closed without saving. A returned Page missing both token and Instagram is classified missing token; the booleans identify both absences. Pagination retains its existing refusal. Normal Instagram discovery saves existing eligible Instagram rows only; diagnostics do not authorize binding. A different returned account is not evidence of Cole success.

Server-side discovery hints are the owner-verified Cole After Hours Page and `cole.after.hours` username from the prior read-only investigation. They select diagnostic matches only, never authorization or binding. The existing binding endpoint independently verifies the live account identity and stores the expected account/connection version. Facebook scope/task handling and X PKCE are unchanged; no schema/dependency/configuration change.

## Safeguards and authorized sequence

Existing four permissions, owner-bound state, cookie match, expiry/single-use claim, secure cookie deletion, encryption, explicit account binding, revision approval, publication and scheduler boundaries remain. No paid testing, posts, DMs or automation activation.

Run focused route/redaction tests and required full gates; release PR296 once. Verify the actual production SHA and Agency page. Guide the owner through exactly one fresh authorization. Inspect only the structured event and safe callback reason; no raw callback URL/HAR/response. Read back saved Instagram identity and explicitly verify Cole's binding. A consent screen, `connected` query flag or a saved unrelated account is not completion. If the single attempt fails, use its precise diagnostic and read-only evidence to identify/correct the actual cause without starting another authorization under this cap. Record confirmed release and live findings in PR296, linked from Cole's dossier, without a second receipt deployment.

## Pre-release verification

13 focused actual-route diagnostics/OAuth tests passed. Full suite: 2,651 passed, 0 failed. Standalone typecheck, lint (no ESLint warnings/errors), both dossier digest/history gates, two dossier-gate regression tests and production build passed. Required npm audit reports zero vulnerabilities; all 22 fork security regressions passed. No paid provider/model evaluation. Hosted preview and production receipt are recorded in PR296 after confirmation.
