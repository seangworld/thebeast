# Cole bounded direct-Page fallback — 2026-10-24

## Verified reason for this correction

Read-only API Explorer checks reused an already-present grant, without generating/refreshing access. Issuing app ID/name matched SEANGWORLD Agency, administrator name matched Sean Gatewood, API v26.0/GET was verified, and granted permissions were the existing four plus public_profile (no ads_read or business_management). Basic me/accounts fields id,name,tasks returned two Pages, neither matching Cole's ID or name, with no pagination. Direct access to the fixed Cole Page matched its ID/name; a separate linked Instagram read returned a numeric ID and exact username cole.after.hours. No Page-token values were requested during those diagnostic checks. No account or binding was saved.

This demonstrates that relying solely on enumeration rejects a directly accessible Page. It does not justify a new permission. The implementation retains all four scopes and existing Facebook/X separation.

## Bounded callback sequence

Only a valid owner-bound, cookie-matched, expiring, single-use Agency Instagram state reaches this sequence. Granted permissions must still pass the same strict checks. Paginated/incomplete, malformed and ambiguous lists fail closed as before.

1. Select the fixed owner-verified Cole Page if the complete list contains it. Never substitute another Page or accept a Page ID from request/query input.
2. If absent (including a complete empty list), perform one direct read of that fixed Page: id,name,instagram_business_account{id,username} using the already-exchanged user authorization. Verify exact Page ID/name and exact linked Instagram username plus numeric account ID.
3. Only for the fallback, separately request id,access_token from the same fixed Page. If refused/unavailable, return page_credentials_unavailable. Missing/blank credential returns missing_page_token. Wrong identity fails closed. Identity reads alone never save.
4. Use that Page credential to independently reread the exact Page/name/link and the linked Instagram id,username. Both must match. Errors, unusable credentials and retargeted identities return page_credentials_unusable without sealing/saving.
5. Only after credential verification, seal the Page credential with the unchanged owner-bound encryption and upsert one Cole Instagram row through the existing connection table/on-conflict path. No unrelated account, Facebook row or talent binding is created by Agency.
6. Select only channel,account_id,label from the saved result and require exactly the expected Instagram identity before reporting connected. A write error, absent/wrong readback or uncertain request returns save_unconfirmed; inspect saved connections rather than blindly repeating sign-in.

Explicit owner account binding remains a separate action. Its existing live identity check, connection-version binding, brand/content approval and publishing guards remain. A connected redirect means a confirmed connection save, not a bound talent or permission to post.

## Sanitized outcomes

Existing discovery logs retain counts/reason/match indicators. Resolution logs add only fixed reasons and booleans (fallbackUsed, Page/name/link/username matches, credential presence/verification). Save logs retain saved/save_unconfirmed and a verified-connection count. No raw provider object, error message, token, OAuth state/code, URL, ID, username or name is logged. Provider credentials are retained only in the existing encrypted owner connection after verification; temporary user authorization is not separately persisted.

Failure UI distinguishes direct Page unavailable, Page identity mismatch, missing linked Instagram, wrong Instagram identity, credential retrieval unavailable, absent/blank credential, unusable credential and uncertain save. It never reports a successful connection from identity reads alone. Facebook's existing token/task/channel behavior and X PKCE remain unchanged.

## Release and owner verification

One coordinated release is authorized. Confirm exact preview/production SHA and live Agency/dossier, then guide the owner through connection and explicit same-account binding. Read back the saved connection and binding before claiming success. No paid testing/calls, added scopes, public posting, DMs, scheduler or automation activation. Preserve Beast AI Talent Agency / Cole Mercer / Cole After Hours / @cole.after.hours and all existing IDs.

Canonical Cole source dossier/history and maintenance receipt are updated with this bounded correction. The exact production receipt and owner verification are tracked in [Cole Issue292](https://github.com/seangworld/thebeast/issues/292) without a second receipt deployment. Until the live flow verifies usable Page credentials, confirmed save and binding, connection readiness remains unverified.

## Pre-release gates

18 focused actual-route OAuth/fallback/credential/save tests passed; full suite 2,656 passed, zero failures. Standalone typecheck, lint without ESLint warnings/errors, both dossier source/history gates, two dossier-gate regressions and final production build passed. Required npm audit: zero vulnerabilities; existing fork verification/security tests passed. Diff check passed. All provider execution in tests is synthetic; no paid provider/model evaluation. Hosted preview, exact production release and owner save/binding readback remain separate verification steps recorded in the linked Cole tracking record.
