# News department bounded audit — October 23, 2026

Lead integrates three isolated Codex workers: headline processing, schedule/pause controls and HQ retained evidence. Workers committed locally and did not push/deploy. Source baseline main `f3d98289d1dded80363f0143e5fb303c7b04f1a8`; actual live News deployment before this batch was `8eb8c87d034ec4e379b0ae0ddcba241aad4581a6` (`dpl_7mtdjN4BGNU7VgeJQi2obDsbsPh1`). The newer main change was contributor documentation and its deployment was canceled; it was not claimed live. HQ baseline `1b48c2b343544c89b8146b7722b01225a3fac62f`.

## Reconciled operating inventory

- **Headline Desk:** currently deterministic feed collection, validation, normalization, clustering, retained-failure fallback and snapshot/status/heartbeat writes. Vercel `*/15 * * * *` is :00/:15/:30/:45; public columns use Top15, not the complete stored pool. Provider-capable rewrite implementation is retained, but `NEWS_AI_AUTOMATION_PAUSED=true` prevents eligible batches. The former status helper advertised AI mode from credential presence even while paused; it now reports deterministic fallback plus the explicit pause. This corrects observation, not activation or routing.
- **Watchdog:** existing deterministic health/recovery checks at `7,27,47 * * * *`. Its source, route, schedules, liveness membership and recovery policy are unchanged. Its use of compact headline freshness metrics now rejects impossible future timestamps instead of treating them as fresh; this is an explicit validation correction, not a new recovery policy. No watchdog was dispatched for this audit.
- **Source Scout and Geo Scout:** existing provider-capable discovery workflows, registered as supporting systems in HQ, paused by owner; routes stop before registry/provider/discovery work. No scout cron entries. Readiness helpers now also reflect paused/unscheduled status and deny Geo activation rather than inferring readiness from credentials. Historical resume cadences remain configuration metadata, not an active schedule.
- **Fact Desk:** evidence/candidate/provider components retained; AI automation, QA generation and automatic publishing paused; no Fact Desk cron. Read-only access to existing published Fact Briefs remains. No model competence is inferred from configuration or retained release receipts.
- **Seven other newsroom contracts:** Assignment Desk, Reporter/Researcher, Fact Checker, Standards Editor, Fact Desk Editor, Copy Editor, Publishing Gate. `newsroom-staff.ts` has eight contract entries including Source Scout, which aliases the existing scout. Fictional display personas do not create staff identities. Contract mode is explicitly non-executing; no independent intelligent staff or L1–L5 grade is supported. Preserve all nine existing HQ records and their null behavioral dates/grades/targets.
- **Weekly source-health workflow:** existing Monday07:17 UTC GitHub Actions probe checks approved active source feeds and writes a CI artifact; no provider call, database write or new source/geography activation. This remaining network activity is preserved. Reader requests use existing metadata/generation caches and do not dispatch collection or paid AI.

## Concrete corrections and evidence

[Headline worker](https://github.com/seangworld/seangworld.com/blob/76f9da4760738b1f001116b8e7e8cbcbd926210f/docs/news-department-20261023/HEADLINES.md): exclude fake item/entry markup inside comments/CDATA, isolate invalid Unicode entities rather than lose a valid feed, reuse the existing1MiB bounded stream reader for active feed downloads, and partition local duplicate groups by existing country/state/region/city so same-named cities in different states do not erase each other. Existing attribution, publication times, relevance filters and blocked-source policy remain.

[Schedule worker](https://github.com/seangworld/seangworld.com/blob/76f9da4760738b1f001116b8e7e8cbcbd926210f/docs/news-department-20261023/SCHEDULES-PAUSE.md): pause-aware scout readiness and correction of stale documentation claiming a query parameter could resume discovery. No scout or watchdog route changes.

Lead regression reproduced future generation metadata as `ready/fresh` with age0. Nonfinite clocks or generated/updated times over the existing one-minute skew allowance now return unavailable. Existing snapshot retention, metadata/generation caches, quarter-hour cadence and20-minute stale tolerance remain. The headline runtime status now distinguishes paused configured AI from active deterministic collection. Independent worker review found no actionable scope or regression issue.

HQ companion corrects read-only concentration observations from the obsolete Top20/15-minute threshold to existing Top15/20-minute source policy, rejects invalid observation clocks and updates all nine existing dossiers. No workflow is relabeled intelligent staff. Last behavioral evaluations remain unset; October23 is engineering/evidence review only. Historical scout recovery and release evidence is credited, not reset; role-specific missing attributable judgment evidence remains explicit.

## Usage and remaining limitations

Expected **additional scheduled request reduction: estimate0/day**; no schedule or cadence removed. The bounded feed reader limits pathological response consumption to1MiB plus at most one in-flight stream chunk, but does not promise fewer feed requests. Ordinary headline collection still reads configured feeds and writes existing source health/snapshot/heartbeat records. Watchdog, weekly health probes, status reads and cached reader traffic remain. These are not measured request/bandwidth/billing savings. Comparable post-release usage is required before claiming savings.

No live collection, scout, watchdog or publishing probe was run. Local fixtures establish mechanics, not live editorial relevance, source truth, semantic judgment or arbitrary feed compatibility. Oversized feeds now honestly fail and can retain eligible prior items under the existing transient-failure policy. No published content was created for testing. Future attributable agent validation requires original inputs/source material, exact output/corrections and independently checked outcomes; **cost unknown**. No paid evaluation is requested or scheduled.

The unchanged existing News dependency tree has pre-existing advisories (captured local `npm audit` snapshot:15, including1critical/10high/4moderate). No dependency or lockfile change is authorized in this batch. These are not claimed resolved. The repository's established required validation/type/lint/test/build/render/SEO gates are run without weakening them; its CI does not have a zero-advisory gate. HQ's existing security/build gate remains required. Dependency remediation remains a separate scope, not silently included or used to expand this department audit.

## Coordinated release

Run both repositories' combined required gates before pushing. News uses one integrated preview and governed `SW-NEWS:` production merge; HQ uses one companion preview/production merge. Workers never deploy. Confirm exact deployed commits, project cron definitions, public retained status (paused scouts/AI, Top15/freshness) and authenticated canonical HQ readback, without dispatching jobs. Source, hosted services and packaged installers are distinct; no installer is rebuilt or released by this batch. Marketing/Atlas schedules remain disabled; sources/geography and watchdog configuration remain unchanged.

Permanent same-batch release/live verification record (updated without a receipt deployment):
https://github.com/seangworld/thebeast/issues/274#issuecomment-6374912001

Finish this department and stop.

Canonical HQ evidence reconciliation: [nine existing records](EVIDENCE.md). Exact audited News source: 76f9da4760738b1f001116b8e7e8cbcbd926210f
