# Prelaunch marketing schedule pause — 2026-10-22

Owner decision: marketing has not launched. Remove `/api/cron/marketing-social` (`* * * * *`) and `/api/cron/marketing-growth` (`20 10 * * *`) from deployment configuration. Preserve the handlers, publisher, runner, saved settings, data, approval and authorization rules, and manual controls. No database/settings changes, job invocation, paid tests, activation or dependency upgrades.

The sole remaining Beast cron is `/api/cron/orchestrator-observation` (`0 10 * * *`). Atlas remains paused. News is a separate project; its headline desk remains every 15 minutes at :00/:15/:30/:45. Source Scout and Geo Scout remain paused.

Existing callers: Vercel was invoking social every minute and growth once daily. Growth also has an admin-authorized manual POST (`action: run`), while its panel reads history on mount/action without a timer. Social retains explicit manual actions plus initial/focus/manual workspace reads and visible-only polling when enabled scheduled/in-flight jobs exist (30 seconds for in-flight; up to five minutes for scheduled). No recurring growth/social calls were found in the unrelated orchestrator observation handler. Saved enabled settings cannot restore a removed deployment schedule. Queued social work/recovery will not execute automatically until schedules are explicitly restored by an owner-authorized release at launch. UI notices now state this; controls are retained.

Estimated removed dispatches: 1,440 social + 1 growth = 1,441 scheduler requests per full day, before retries or platform behavior. Database request reduction depends on eligibility and job state; this is not measured traffic, bandwidth or billing savings. Manual/visible workspace traffic can remain. Prior October 21 counts and the earlier optimization report remain historical evidence, not a post-release baseline.

Release gate correction: adding raw `vercel.json` to the dossier content digest caused the first hosted preview to fail although the local digest passed. Remove that newly introduced watch entry; retain all existing source watches plus the added growth sources. Schedule behavior is covered by the exact configuration regression and post-release hosted configuration assertion. No production change occurred from the failed preview. One corrected preview is required; no receipt deployment.

Validation: offline scheduling regression, existing marketing approval/publisher/growth tests, dossier/history guard, full test suite, TypeScript, lint, security audit and production build. No live publishing probe. Single preview and main production release; verify actual deployed schedules using the project configuration API. Confirm live owner-only Marketing dossier synchronization. Exact results and deployment identity are updated in the permanent handoff without a receipt deployment:
https://github.com/seangworld/thebeast/issues/274#issuecomment-6354572829

Canonical dossier: https://thebeast.seangworld.com/dashboard/operations/staff/beastfusion.policy.marketing_specialist
