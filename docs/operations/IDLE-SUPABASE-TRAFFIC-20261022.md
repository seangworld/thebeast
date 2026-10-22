# Idle Supabase request reduction — October 22, 2026

Executor: Codex. Source baseline: The Beast main `952638e634aad8cbdb9c937c9b09bad10739da44`. One batch release; no dependency changes, new services, paid AI/testing, purchases, agent activation or database/schema mutations. Permanent release verification: https://github.com/seangworld/thebeast/issues/274#issuecomment-6353916826 (updated after release; not a pre-release claim).

## Traced causes before changes

Owner-provided October 21 counts: unread 8,389 across production/DEV; Atlas 2,874 production; social controls/posts 2,870 production. These are request counts, not bytes, bandwidth, invoice charges or measured savings. Exact per-request attribution for October 21 is not available from this audit.

- **Unread:** the only application caller of `get_beast_admin_message_unread_count` is `src/app/dashboard/layout.tsx`. It starts on mount and every pathname change, polls every 60 seconds even while hidden, and refreshes on `BEAST_ADMIN_MESSAGE_UNREAD_EVENT`. Desktop/mobile badges use the same state; they are not two separate pollers. Multiple open dashboard tabs and route restarts multiply calls. HQ's OperationsFrame does not render the unread badge, yet the parent layout still polls. The RPC uses existing authenticated actor/role and member ownership checks; no RLS/function change is needed.
- **Open DEV:** Chrome contained an evaluation dashboard at `http://localhost:3127/dashboard/admin/member-ai-production-evaluation`, left open since October 19. Its rendered banner explicitly identifies the DEV project `zvzcojwjgnedrouilovc`, not production. It showed Ready, with no evaluation results or run in progress. Existing hydrated browser code can continue direct Supabase RPC polling independently of whether its old local web server is running. The tab is a verified plausible DEV caller, not exact proof of its October 21 request share. No evaluation button was clicked. After confirming it was idle with no results, the existing DEV tab was parked on `about:blank` to stop its already-loaded polling code; its prior URL remains recorded here.
- **Atlas:** hosted The Beast cron definitions confirm `/api/cron/atlas` every minute. Each invocation performs an unconditional stale-processing UPDATE followed by a queued-turn SELECT, even with an empty queue. An open Atlas workspace separately fetches its multi-query snapshot every four seconds, irrespective of idle/hidden state. Current production and DEV aggregate reads found no Atlas turns. The backburner decision existed in the HQ dossier, but did not gate these runtime paths.
- **Social:** hosted `/api/cron/marketing-social` also runs every minute. It performs an unconditional stale-publishing UPDATE, then reads enabled controls. When there are no enabled controls this is still two Data API requests per tick. Current production and DEV each had zero control rows and zero post rows. Thus there are no active scheduled jobs in the inspected snapshot; this does not mean future authorized scheduling should stop. A SocialWorkspace with any scheduled/publishing/processing row polls its five-read GET every 30 seconds, including hidden and paused queues. Clicking Refresh also causes two GETs because `run(refresh)` refreshes again after its task.
- **Other schedules:** production and DEV `cron.job` each contain only the existing five-minute device-reminder job, not Atlas/social/news. The Vercel jobs above are the relevant recurring Atlas/social callers. Reminder/auth/device behavior is unchanged.

The Atlas/social counts are close to two requests × 1,440 minute ticks/day (2,880); that is strong schedule/code consistency, not measured log-level attribution.

## Changes

### Unread

One user-scoped subscription in each browser realm owns the lifecycle, one serialized request and one timer. Route changes within badge-bearing screens do not restart it. No unread subscription exists on HQ screens without a badge. Hidden documents and unmounted consumers stop timers and abort in-flight requests; late aborted results are ignored. Visible polling uses five minutes; focus/return-to-visible and existing read/send/notification user-action events refresh promptly. Focus/visibility bursts and overlapping requests coalesce; an action during a check gets a trailing refresh so it cannot be lost. Strict Mode setup/cleanup probes cannot send an initial request. Transient failures retain the last confirmed count instead of manufacturing zero. No private message bodies, credentials or cross-user count cache are added. Distinct simultaneously visible windows still each poll; no cross-origin coordination service is introduced.

### Atlas

`src/lib/atlas/operatingPolicy.ts` sets `ATLAS_PAUSED = true`, honoring the owner backburner decision. Remove only the Atlas Vercel recurring schedule. Its cron route still verifies the cron secret, then returns paused before database construction. Existing API routes return a generic 423 paused denial before authentication/database/provider work and reveal no owner records; all active-path authorization remains preserved. The database factory and worker also fail closed while paused, covering stale clients, paired devices and direct worker entry points. The paused workspace starts no polling, microphone, speech or turn request. Existing records, turns, usage, device grants and implementation are retained; no mutation/migration is performed.

**Manual reactivation:** a separate explicit owner-approved source/release change sets the policy false, reviews existing queued/processing turns and costs, and restores a cron only if background processing is authorized. Existing owner-only manual turn dispatch and device/revocation mechanics remain in the source. No UI/dossier action reactivates Atlas automatically.

### Marketing

Keep the existing minute cron and publisher. An idle/future-only tick now performs one bounded eligibility SELECT of IDs only, then exits. Only when due work or stale publishing claims exist does it inspect recovery/control/due-job details. Recovery writes occur only for observed stale IDs, with status/time predicates protecting concurrent fresh claims. Recovery never automatically republishes an uncertain post. Enabled owners and their due jobs are queried independently of the initial eligibility row so paused-owner backlog cannot starve authorized work. Existing exact revision approval, role/pause/connection rechecks, paid-X opt-in, compare-and-set claim and uncertain-result behavior remain in the unchanged publisher. Active work may need extra eligibility/recovery reads; the reduction is specifically for idle behavior.

The visible workspace polls only an enabled queue with scheduled/in-flight jobs: in-flight work at 30 seconds, future work up to five minutes. Idle/paused queues have no polling timer, but focus, manual Refresh and relevant actions refresh state. Hidden/unmounted requests abort. The Refresh action issues one GET. This changes administrative workflow behavior, not the planned Marketing Specialist policy class into an operational agent.

### News preserved

Current news source main `f3d98289d1dded80363f0143e5fb303c7b04f1a8` and the hosted `seangworld` Vercel project both specify headline-desk `*/15 * * * *` (:00/:15/:30/:45), plus watchdog `7,27,47 * * * *`. Both scout routes import the owner-pause operating policy and return paused before discovery/activation. No news source/configuration, scout state, watchdog or schedule is changed in this release.

## Request-reduction estimates — not measured savings

| Caller | Conditional expected change |
| --- | --- |
| Unread timer on a continuously visible badge screen | 60s → 300s: about 80% fewer interval checks for the same visible duration; focus/action calls remain. Hidden, unmounted and HQ-without-badge interval checks fall to zero. October 21's total cannot be reliably extrapolated without tab-hours and action counts. |
| Atlas recurring queue | About 2,880 idle DB API calls/day → zero. If all 2,874 reported Atlas requests were this cron, roughly 2,874/day would be avoided. Any stale Atlas client reaching the new paused API also performs no Atlas DB work. |
| Social empty queue | Two calls/minute → one: 2,880 → 1,440/day, about 50% fewer idle scheduler requests; applying that assumption to 2,870 gives roughly 1,435 fewer/day. An essential minute eligibility read remains to preserve future scheduled publishing. Idle/paused workspace polling also stops. Active-job paths may use more reads. |

No bandwidth, dollar or invoice savings are claimed. Comparable post-release usage is required, using matched environment/time windows, foreground tab-hours, user actions, queue state and deploy identities. Observation requests and this audit's aggregate reads are not normal application polling. Existing already-loaded clients need navigation/reload or parking; an updated deployment cannot replace their running JavaScript automatically. DEV checkouts must use the updated source when restarted; an old unrelated working branch is not silently overwritten.

## Verification and release record

Focused deterministic fixtures cover hidden/visible/focus/unmount, serialized overlap and trailing action refresh, Strict Mode startup, per-user dedup/cache isolation, transient-error/late-result behavior, social idle/future/paused/in-flight intervals, cron authorization, idle read-only behavior, paused-owner queue starvation, stale-vs-fresh recovery and no repeat publication. Existing Atlas active-path fixtures explicitly inject an unpaused synthetic policy to preserve their authorization/receipt checks without activating runtime. Existing social publisher checks still cover owner/role/pause/revision/CAS/uncertain publication. The full required test/type/lint/security/build results, local browser checks and exact release identity are recorded at the permanent handoff above before/after the single release as appropriate.

Affected HQ dossier IDs: `atlas` and `beastfusion.policy.marketing_specialist`. Both retain existing lifecycle and competency/accounting; operating behavior, limitations, evidence and dated history are reconciled in this same batch. News/scout dossiers are unchanged because their duties and operating behavior are unchanged.


Local browser verification used actual Atlas/SocialWorkspace source components and React Strict Mode with synthetic localhost-only data. Social mounted with one UI fetch; manual Refresh added exactly one; paused Atlas added zero API fetches. Unmount worked; both workspaces had no horizontal overflow at 390px and 1440px. This verifies local lifecycle mechanics, not production usage savings or paid publishing. The first full production build exposed an ES5-target Set/Map iterator mismatch in new code; collection iteration was corrected without changing compiler settings or dependencies before final checks.

Final pre-push gates: 2,600 application tests passed; focused traffic/Atlas/social/messaging fixtures passed (including the later idempotent-cleanup regression); both offline dossier gates, two dossier-maintenance tests, TypeScript, lint and the required security-gated production build passed. npm audit found zero vulnerabilities and all 22 existing fork/security checks passed. `package.json` and lockfile are unchanged. The publisher, message RPC/RLS migration, device reminder scheduler and news repository are not modified. No branch was pushed until the complete batch and local verification were ready.
