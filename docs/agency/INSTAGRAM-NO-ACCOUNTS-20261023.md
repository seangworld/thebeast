# Cole Instagram no_accounts investigation — 2026-10-23 (America/New_York)

## Verified callback boundary

The existing owner browser tab is on Agency with `connection=no_accounts`, showing no eligible linked professional Instagram account and no connection/binding. Production source remains #295 merge `a543f39`; the actual deployed scope/purpose trace is recorded separately in `INSTAGRAM-PRODUCTION-TRACE-20261023.md`. No new authorization attempt was initiated for this investigation.

At that source version, an Agency `no_accounts` result occurs after the owner-bound, cookie-matched, expiring, single-use state claim; both token exchanges; and the unique/granted four-permission check. A provider exception or pagination marker would instead return `failed`. The callback requests `me/accounts` fields `id,name,access_token,instagram_business_account{id,username}`, then skips rows without a numeric Page ID or Page token and creates Instagram rows only for numeric `instagram_business_account.id`. It returns `no_accounts` if no Instagram rows survive. No connection upsert occurs on that path.

This establishes successful progression through those checks, not what the Page discovery payload contained. The callback does not log sanitized counts or retained discovery diagnostics and does not persist its temporary user token on this path. No raw provider body, token, OAuth state or cookie was retrieved.

## Existing logs

Authenticated Vercel runtime-log queries scoped to this production project returned no matching callback entries in the recent two-hour window and no entries in an additional recent 30-minute query. Absence of logs is not evidence of an empty Meta response. No provider payload or historical grant target list is available in those results.

## Read-only Meta UI findings

- Business portfolio: `sean.after.hours`.
- Existing Facebook Page: **Cole After Hours**, ID `1266254166581850`.
- Page People tab: **Sean Gatewood (You)** has **Full access**.
- Page Connected assets tab: **1 asset is connected**, Instagram account **cole.after.hours**.
- Personal Facebook Business Integrations: **SEANGWORLD Agency**, **Active**, added Oct 23, 2026.
- Its View and edit dialog shows enabled switches for Instagram profile/posts, Instagram media/post creation, Page content reading and managed Page listing. The dialog exposes no per-Page checklist, selected Page count, or current/future Page-selection record. Cancel closed it without saving.
- Business portfolio Connected apps lists no integrations, but explicitly warns that some apps may be absent there and directs users to personal Business Integrations. This is not proof of a missing Page grant.

No permission switch, Page assignment, linked asset, credential, application setting, or business integration was changed. No Remove, Save, Connect, Disconnect, posting, paid call, scheduler or authorization action was performed.

## What cannot be determined from this completed attempt

| Candidate cause | Finding |
| --- | --- |
| Meta returned zero Pages | Unverified: no retained discovery count/payload |
| Meta returned Pages but omitted Cole | Unverified: no returned Page identities retained |
| Cole was returned without a Page access token | Unverified: no token-presence boolean retained |
| Cole was returned without instagram_business_account | Unverified: no returned-link boolean retained; UI confirms a link currently exists |
| All-current/future Pages consent included existing Cole Page | Unverified: existing settings expose permission switches, not asset selections |

The requested single exact Meta correction is **not established**. Do not prescribe selecting Cole again, changing permissions, resetting credentials, removing the app, or repeating setup based on this evidence. No functional application defect has been demonstrated; there is a confirmed diagnostic gap because distinct discovery failures share one status without a retained sanitized breakdown. Adding diagnostics now would not reconstruct the completed attempt, and no fresh attempt is authorized.

Cole's canonical dossier records these verified facts and unresolved limits without claiming account readiness or changing his Virtual Talent status. Hosted HQ synchronization remains pending release of this evidence-only PR. Publishing remains paused, automation and DMs remain off, and no paid calls occurred.

## Prior scope failure is a separate finding

The preceding browser comparison inspected the retained 9:46:03 p.m. EDT failing Meta screen: same app `1437303488549044`, same v26.0 endpoint and callback, but with the extra `pages_manage_posts` scope and its exact rejection. Social Accounts immediately preceded it in history; its released source submits only `provider: meta`. The actual failed POST body and historical Facebook identity were not retained. Current Facebook showed Sean Gatewood, matching the Agency consent screen. The latest Agency `no_accounts` result progresses beyond that scope-rejection stage; do not conflate the two failures.

## Patch validation

`npm test`: 2,648 passed, zero failures. Both dossier digest/history gates pass. Required production build passes, including lint/type validation, 22 fork security regressions and npm audit with zero vulnerabilities. No application runtime code or dependency/configuration/schema changes. These checks validate the evidence-only patch, not a recovered discovery response or successful account connection.
