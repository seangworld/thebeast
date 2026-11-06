# BeastGuide blank embedded PWA — Preview correction

Owner authorized investigation, smallest fix, tests and Preview only. No Production merge/deployment, credential/role/data changes or account-mail activation.

## Reproduction and root cause

Live signed-in Chrome: BeastOS Applications → Open BeastGuide changed the URL to /dashboard/beastguide, passed account/entitlement gates, and created the Guide iframe, but Chrome displayed “This content is blocked.” The failure is therefore not exclusive to iPhone and not an empty/lost library. Safari/WebKit can show the same blocked frame as blank space.

The initial Applications/PWA-start/login HTML has Content-Security-Policy frame-src none. Next App Router client navigation retains that DOCUMENT policy. The previous Guide-only frame-src self RESPONSE override cannot replace the policy of an already loaded Applications document. The browser blocks /beastguide-app/index.html before its app starts. Local real WebKit and Chromium counterexamples retain the Applications document through pushState, reproduce the blocked frame, and load the exact same child when only parent frame permission is corrected.

A live hard reload was not sufficient evidence of a fully working signed-in workspace during this investigation: the frame appeared blank and no library was confirmed there. The verified route-transition CSP blocker is directly reproduced; do not claim every possible white-screen cause or a physical iPhone result was independently observed.

## Release, assets, redirects and cache comparison

Production remains 24d4a9e87e09e230d2507d19f3875ca8d2b305ec / dpl_FrXerDEXGfEofbFRrqnucEDXDeZC. Compared against pre-mail baseline a2e76db3: Guide workspace, Applications, embedded assets, next.config, middleware/browser auth, manifest and push worker are identical. Frame overrides originated in the initial integration; this is a latent entry-document/navigation defect, not a demonstrated new mail-release regression. The exact installed iPhone build/cache version is unavailable.

Public reads confirm embedded index/current JS/CSS are HTTP 200 with correct MIME types and max-age=0,must-revalidate; child frame-ancestors self / X-Frame-Options SAMEORIGIN are present. Direct standalone Guide renders in WebKit and Chromium. Existing push service worker handles notification delivery/clicks only, with no fetch handler/page cache. Manifest retains scope /, standalone display and /dashboard/today start. Signed-in Applications navigation reaches the Guide host without an authentication redirect. No cache clearing, worker replacement, credential change or identity redesign is justified by this verified blocker.

## Smallest correction and security boundaries

Only runtime change is next.config.js: shared entry-document CSP permits frame-src self before any client navigation, replacing the ineffective Guide-only override. No external iframe origins are allowed. Generic documents retain frame-ancestors none and X-Frame-Options DENY. Only the existing /beastguide-app child override permits same-origin framing; its frame-src none still prevents nested frames. Script/connect/form/object/worker permissions and child TVMaze allowance are unchanged. No iframe tokens, new cookies, auth handoff or session storage change.

This document-level fix applies on a newly loaded entry document. An already-open old PWA document retains its old policy until reload/reopen; do not erase website data or unregister service workers as a substitute. No Production action is authorized yet.

## Validation

- 2,740 full-suite tests pass, including two new executable header/security regression tests.
- Required Production build passed staff/history, imported Guide artifact/provenance, existing mail gates, audit zero vulnerabilities, Next compilation, lint and TypeScript.
- node scripts/test-beastguide-frame-policy.mjs: WebKit and Chromium with iPhone viewport/user agent, navigator.standalone and display-mode flags. Counterexample reproduces old CSP failure. Corrected headers plus exact shipped Guide JS/CSS render My Library through Applications/Today/login client navigation and reload, retain fixture watched progress and account isolation, show Bookmark instructions, and deny both external and nested frames. The synthetic gateway rejects all writes; no hosted identity/data requests or emails.
- Existing real PostgreSQL/PGlite identity suite: 6 groups pass, including owner keys/RLS, isolation and synthetic recovery preservation.
- Read-only Production: 15 accounts, 15 profiles, 5 username mappings; profile/username fingerprints match prior accepted baselines. All 17 Guide library/progress/preferences/identity dataset fingerprints exactly match the previous preserved snapshot. No real data modified/exported.
- Existing imported Guide checksums unchanged. Mail code/flags, pending receipt, SMTP/Supabase/Auth configuration, account roles and worker cache behavior remain untouched.

Evidence logs: /private/tmp/beastguide-frame-browser-20261105.log, beastguide-pwa-full-20261105.log, beastguide-pwa-build-20261105.log and beastguide-pwa-isolation-20261105.log. Synthetic screenshots: /private/tmp/beastguide-frame-evidence/{webkit,chromium}-{before,after}.png. They are not physical iPhone screenshots.

## Acceptance limit / Preview handoff

No reachable physical iPhone/standalone session was available. Mac native inspection reported locked state; simulator/device discovery did not provide an available test device. Therefore actual installed iPhone Home Screen acceptance remains UNVERIFIED. Requested affected iOS version and whether the whole app or only Guide becomes blank; do not invent an answer. Real WebKit standalone-flag emulation and live signed-in Chrome reproduce the CSP blocker but do not establish physical-device acceptance.

Prepare a protected exact-source Preview and verify its response headers/assets. Do not copy Production secrets or enable authentication/data/mail flags for Preview. Physical iPhone acceptance should verify a fresh entry-document load, BeastOS → Applications → BeastGuide, direct Guide access and existing account/library readback. Existing users must not re-register. Review any remaining error before expanding the fix.

Production release requires separate exact-source approval after validation; retain dpl_FrXerDEXGfEofbFRrqnucEDXDeZC and prior dpl_6XGtB7duMH5Dv9iopwKcRzrF8Gs2 for rollback. Reverting only the header change restores the prior behavior without touching user data. Account mail stays paused; unrelated draft PR #318 remains separate and unmerged.

Primary policy reference: https://www.w3.org/TR/CSP3/#directive-frame-src (document CSP restricts nested browsing-context navigation).
