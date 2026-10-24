# Cole production Instagram OAuth trace — 2026-10-23 (America/New_York)

Owner reports `Invalid Scopes: pages_manage_posts` after [#295](https://github.com/seangworld/thebeast/pull/295). This follow-up traces the real production button rather than inferring behavior from source or asking the owner to repeat Meta setup.

## Confirmed deployed version

Authenticated Vercel inspection confirms `thebeast.seangworld.com` aliases to production deployment `dpl_H7sR4JVBPtBTJj9o6fcax5hp1wuR`, READY, URL `thebeast-3dodemyvl-seangworld-3898s-projects.vercel.app`, main commit `a543f39af354c9949fbd8a8f4ed006454900c299`, the merge of #295. The existing owner browser Agency page contains the new Connect Instagram control and Instagram-specific explanatory text. The production alias was not pointing to a pre-#295 deployment.

## Actual request and response

From `/dashboard/admin/agency/metrics`, clicked **Connect Instagram** in the owner's existing authenticated production browser. Chrome Network inspector captured the actual request, including its Payload and Response panels:

- POST `/api/admin/beast-marketing/social/connect`.
- Submitted JSON: `{"provider":"meta","purpose":"agency_instagram"}`.
- HTTP status: **200**.
- Response OAuth origin/path: `https://www.facebook.com/v26.0/dialog/oauth`.
- `response_type`: `code`.
- `redirect_uri`: `https://thebeast.seangworld.com/api/admin/beast-marketing/social/callback`.
- `scope`: `pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish`.
- `pages_manage_posts` is **absent**.

First button initiation was also checked at the actual Meta destination: the same four scopes and callback were present. Meta displayed **Continue as Sean Gatewood?**. A second initiation with Network capture reached the same consent screen. No Continue/permission grant was accepted, no callback completed, and no connection or account binding is established by this trace. Returned directly to Agency afterward.

Only allowlisted diagnostic fields are retained here. Do not attach raw URLs, response bodies, HAR, headers, cookies, tokens, OAuth state, or browser traces to this report or issue/PR records.

## Routing and source reconciliation

The released Agency handler submits `purpose: agency_instagram`; the deployed response proves it selected the four-scope branch. The matching connect source stores the Instagram intent in its versioned verifier metadata, and callback intent remains server-selected. Existing tests cover those persistence/callback mechanics; this inspection does not claim a real callback was exercised.

The separate Social Accounts Meta connector intentionally retains `pages_manage_posts`. Its source and the failed Social Accounts browser return path are consistent with the legacy flow, but neither proves which request caused the owner's earlier error. No retained request from that earlier attempt was available. Do not characterize this as owner error, claim the report is resolved, or claim Meta accepted/granted permissions.

No stale deployment, wrong routing, or connector scope defect was reproduced in the actual Agency flow. Consequently no functional change, redeploy, or Meta configuration change is justified by this trace. The earlier reported rejection remains an explicit unresolved limit.

## Preserved boundaries and dossier synchronization

Cole's canonical SW HQ dossier source now records the live initiation evidence separately from the older synthetic fixtures, without increasing competency or claiming publishing readiness. Its synchronization to hosted HQ remains pending until this dossier-only PR is released.

Production commit's `vercel.json` still contains only `/api/cron/orchestrator-observation` at `0 10 * * *`; no Marketing/Atlas schedule. Agency visibly states Marketing schedules disabled and DMs off. No scheduler/configuration, publication, content approval, saved draft, account binding, Meta setting, credential, or dependency was changed. No posts, DMs, paid calls or paid evaluations.

## Validation of this dossier-only patch

- `npm test`: 2,648 passed, 0 failed (including the existing actual-route synthetic OAuth regressions).
- `npx tsc --noEmit`: passed.
- `npm run lint`: no ESLint warnings or errors.
- `npm run check:staff-dossiers` and `node scripts/check-staff-dossiers.mjs --base origin/main`: passed.
- `node --test scripts/test-staff-dossier-check.mjs`: 2 passed.
- `npm run build`: passed, including the required fork verification, 22 security regression tests and npm audit (zero vulnerabilities). The initial restricted-network audit failed DNS; the authorized network retry passed.
- `git diff --check`: passed. No runtime code, dependencies, database or deployment configuration changed.
