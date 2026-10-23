# News identity and HQ operational evidence reconciliation — 2026-10-23

Executor: Codex News HQ worker; source/code review, not behavioral agent evaluation. HQ baseline `1b48c2b3`; News source reviewed from the lead's current source integration checkout. No dispatch, provider call, discovery, publication, database mutation or deployment performed.

## Existing identities and evidence

The canonical inventory contains nine News records. Preserve all nine IDs and aliases; do not create personas or additional staff. `news.source-scout` and `news.geo-scout` are implemented, owner-paused workflows with provider-capable code, already classified as supporting systems. The `news.workflow.source-scout` alias refers to the existing Source Scout. The other seven newsroom records are contract-only workflow descriptions, not seven independently deployed intelligent staff. The eight fictional display personas in `newsroom-profiles.ts` do not create additional staff. `newsroom-staff.ts` explicitly reports deployment mode `contract-only`, provider calls false, persistence false, publishing false and activation false for the role contract.

| Existing canonical ID | Actual duties / present operating status | Competency and exact remaining evidence gap |
| --- | --- | --- |
| news.source-scout | Source discovery/candidate qualification implementation retained; owner pause returns before registry/provider work. Existing headline refresh is separate. | Supporting workflow, L1–L5 not applicable. No attributable original discovery/correction packet with independently checked source qualification/outcome establishes editorial judgment. |
| news.geo-scout | Geography coverage calculation/discovery implementation retained; owner pause returns before registry/provider work. Paid subcity discovery also disabled in current route. | Supporting workflow, L1–L5 not applicable. Source implementation/coverage calculations do not establish demonstrated geographic research competence. |
| news.workflow.assignment-desk | Contract-only intake, coverage-gap and cluster routing role. | Contract record, L1–L5 not applicable; no separately attributed executed assignment/delivery assessment. |
| news.workflow.reporter-researcher | Contract-only bounded cited research role. | Contract record, L1–L5 not applicable; provider-backed Fact Desk components do not attribute research judgment to this persona. |
| news.workflow.fact-checker | Contract-only claim/evidence binding, contradiction and sufficiency role. | Contract record, L1–L5 not applicable; deterministic checks are not demonstrated agent verification judgment. |
| news.workflow.standards-editor | Contract-only rights/evidence standards blocking role. | Contract record, L1–L5 not applicable; policy gates do not establish intelligent standards review. |
| news.workflow.fact-desk-editor | Contract-only preparation/revision/review queue role. | Contract record, L1–L5 not applicable; actual Fact Desk runtime configuration/readiness does not establish this persona's competence. |
| news.workflow.copy-editor | Contract-only language/entity/facts-only QA role. | Contract record, L1–L5 not applicable; normalization rules and fixtures do not establish editorial accuracy. |
| news.workflow.publishing-gate | Contract-only approval/fingerprint eligibility role, with deterministic implementation bindings. | Contract record, L1–L5 not applicable; gate mechanics confer no intelligent staff or expanded publishing authority. |

Headline Desk and worker watchdog are deterministic jobs, not new intelligent staff identities. Fact Desk runtime has actual provider-capable evidence/candidate components, but the contract-only newsroom personas must not inherit a grade from that runtime. Do not introduce a new Fact Desk staff identity to grade it. The lead owns deployed-config reconciliation and may record those read-only observations separately.

Retained release evidence is credited, not reset: `docs/releases/news-us-scout-recovery-2026-10-08.md` documents PRs #329/#330, bounded review/backlog fixes and the fact that live counters still required observation. Its historical hourly scouts/five-minute headlines descriptions are release history, superseded by the current owner pause and quarter-hour headline policy; preserve rather than rewrite that history. `docs/news/sw-news-105-release-notes.md` preserves the rights-cleared evidence/HTML input protections and owner/publication gate. `docs/news/SW-NEWS-334-release.md` is a release checkpoint about telemetry/evidence; it is not an agent competency assessment. No historical L1–L5 assessment or role-attributed behavioral evaluation was found in the bounded current dossier/retained release records reviewed. Do not transfer routes' authority labels, test counts or percentages to competency.

## Concrete HQ corrections

`src/lib/newsSourceConcentration.ts` accepted 20 visible stories even though the current News source operating policy sets Top 15 per column. HQ now rejects observations with more than 15, preserving the existing fail-closed parser contract.

The HQ parser marked a source concentration snapshot stale after 15 minutes while News's existing `NEWS_HEADLINE_STALE_MINUTES` is 20 minutes (quarter-hour cadence plus worker runtime/jitter). HQ now uses the existing 20-minute boundary; this is a read-only observation correction, not a watchdog or scheduling change. Invalid local clocks now reject evidence rather than returning an apparently parsed observation with unreliable freshness.

Focused fixtures: exact 15/16 story boundary; exact 20-minute freshness boundary and first millisecond over it; invalid observation clock. Existing operational health checks remain unchanged and passed. `newsOperations.ts` remains read-only and makes one existing public status GET per fetch; no new polling, worker invocation, fetch endpoint or authority is introduced. This pass identifies no justified behavior change to its current Fact Desk healthy/degraded/stale/running/unknown assessment.

Verification: `npx tsc -p tsconfig.test.json` passed; `node --test .test-dist/tests/newsSourceConcentration.test.js .test-dist/tests/beastAdminNewsOperations.test.js` passed 14/14. Dependencies reused only after exact lockfile comparison; no upgrades. These checks establish projection mechanics, not live newsroom judgment. No request reduction is claimed from this read-only parser change.

## Canonical dossier integration recommendations

Lead updates the existing nine dossiers in the same batch, preserving original evidence/history, supporting-system classification, paused/planned status, aliases, permissions and costs. Use `reviewedAt: 2026-10-23` for this code/evidence review; keep `lastEvaluatedAt: null` absent an existing attributable behavioral evaluation. Target/demonstrated/released competency remain null for system/contract records, with explicit “Not applicable — supporting workflow/contract-only record” wording rather than generic mapping-pending or a staff intelligence grade.

Duties and limitations should reflect: quarter-hour headline refresh; Top 15; source/geography discovery paused; newsroom personas remain contracts; no new sources/geographies/permissions; watchdog unchanged; marketing/Atlas schedules remain disabled. Attach this report and the lead's exact released-source/config evidence; distinguish current code review from historical release descriptions and live configuration observations.

Deferred validation is existing retained-output observation only: any future editorial competency assessment needs an original attributed input, exact evidence/source material, output/corrections, independently checked defects/misses and resulting delivery, within approved scope. No activation or new paid evaluation requested. Future validation cost unknown. Existing accounting remains intact.
