# Exact additional DEV assessment proposal — not authorized

Application/remediation candidate: `54e99fe9` (full commit pinned in manifest). Proposed manifest SHA256:

`cf4ffc18bae7aa744e0ec2103faedad7667954310148275e175cff33fd5859db`

[Proposed executable manifest](proposed-dispatch-manifest.json) and [offline preflight](preflight.json). No approval receipt, new ledger or provider request has been created for this proposal. It is a separate new assessment, not a retry or restart of the halted run.

| Scope | Exact proposal |
| --- | --- |
| Original frozen turns | GC-01-T1/T2; GC-04-T1; GC-05-T1/T2/T3; GC-06-T1; GC-07-T1 |
| Families / turns / criteria |5 /8 /19 original selected-family criteria |
| Models | GC-01/06/07: `gpt-5.6-luna`, Medium. GC-04/05: `gpt-5`, Medium except existing semantic checks Low. Returned IDs recorded, not preclaimed. |
| New inference attempts | Expected44, maximum64; all phases/failures count |
| New metadata attempts | Maximum2 free GET model-availability checks after approval, durably recorded before inference; no retries |
| New direct requests | Maximum66 |
| New hard spending cap | **$9.43**, reserve before each dispatch |
| Prior conservative settled amount |$0.05162867 |
| Prior unresolved full reservation |**$0.514**, unchanged and not released |
| Prior total accounted |**$0.56562867**, separate immutable ledger |
| Combined maximum accounted |**$9.99562867**, below original$10 |
| Combined maximum requests |82 inference /86 direct including four metadata attempts across both runs |
| Retries/restarts/extra cycles | None |
| Time/output/tool limits | Same as original protocol;170s turn;25s private,45s public,60s streaming plan/synthesis;1,400/3,600/4,800 output tokens;4 web actions/public call |
| Pricing expiry | October23,2026 04:00UTC (midnight EDT); expired policy blocks execution |

Fresh histories for every family, genuine new model replies/state on follow-ups. Do not insert answers from the halted run. The original revision2 packet, rubric and source baseline remain unchanged; the selected subset is explicit. Reused development fixtures are not held-out independent competency proof. Do not repeat GC02/03 merely to inflate a pass count.

A private exact-hash owner-approval receipt is required before transport. The dispatcher verifies source/compiled/script/fixture fingerprints, prior halted ledger SHA/balance, selected-history prerequisites and cumulative cap. Fresh model metadata is checked only after that approval, once, and a failed/uncertain check stops before inference. Actual completed diagnostics/usage are captured; any incomplete/failed/disconnected/uncertain-usage response retains its full reservation and halts. No automatic retry or presumed zero cost.

The raw sum of all44 expected-call maxima is$40.532048; **$9.43 is a hard cap, not a guarantee all turns complete**. The old failure's cause remains unknown. Existing brief output/time ceilings are unchanged; no claim these diagnostic fixes prevent another incomplete event. Actual successful cost/latency must be measured. No extra paid requests to diagnose or reconcile the prior unknown call.

After actual owner approval, record a new private0600 receipt containing owner `Sean`, approved `true`, the above manifest SHA, capNanoUsd `9430000000`, maximumInferenceAttempts `64`, and runId `gc-20261021-pr273-remediation-assessment`. Old approval does not cover this manifest. Run from the candidate worktree:

```sh
npm test
node --test scripts/test-guidance-evaluation-budget.mjs
node scripts/verify-guidance-evaluation-preparation.mjs --fixtures-only
node scripts/guidance-evaluation-dispatch.mjs --check docs/guidance-counselor-upgrade/evaluation/remediation-20261021/proposed-dispatch-manifest.json
# ONLY AFTER NEW OWNER APPROVAL:
python3 scripts/run-guidance-evaluation-dev.py --execute docs/guidance-counselor-upgrade/evaluation/remediation-20261021/proposed-dispatch-manifest.json /absolute/private/new-owner-approval.json
```

This proposal does not authorize paid calls, merge or deployment. Keep original ledgers/evidence intact, report unfinished criteria NOT TESTED, and provide ungraded packets before separate executor grading and independent review. Owner decision: approve or decline this exact one-run proposal.
