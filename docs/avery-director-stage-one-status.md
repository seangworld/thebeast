# Stage 1 comparison complete after locked grading (2026-10-17)

Independent grades are locked in Issue #264 comment 6237688638. **A = Luna Low (7 pass/1 partial); B = Sol High (8 pass); C = Luna Medium (7 pass/1 fail).** Provisional recommendation: **gpt-6.1-sol with high reasoning**, the only configuration meeting Stage 1 criteria. No production switch is made; no additional paid calls or credential access occurred. [Read the published comparison, timing, usage and cost](avery-director-stage-one-comparison.md). Original blind evidence and grades are preserved. Stage 2 remains unauthorized and its two-qualified-finalist gate is not met. Earlier pending-grading notes below are historical.

# Stage 1 execution complete; independent blinded grading pending

2026-10-17. Existing branch `codex/avery-director-capability`, draft PR #265,
tracker #264. Owner authorization: comment 6236922578, **24 calls/$3 maximum**.
Independent ChatGPT scenario review: comment 6237368187, approved **regression
screening/model comparison only**, not independently novel competency certification.
The reviewed prompt/schema/case hashes were recomputed and matched before execution.

## Actual execution and spending

**24/24 API model requests completed, with zero retries or Stage 2 calls.**
Permanent conservative reservations total **$2.8064256**, below $3. Every dispatch
persisted its reservation under the exclusive ledger lock before transport. No
additional model, paid grader, external tool, premium service tier or follow-up call.

Provider-reported usage totals:

| Input | Cached input subset | Cache-write input subset | Output | Reasoning subset of output |
| --- | --- | --- | --- | --- |
| 43,875 | 31,500 | 12,303 | 11,902 | 4,383 |

Published-rate **usage-derived estimated cost: $0.06797005**. This is not independently
invoice verified. Input categories are disjoint: ordinary noncached/nonwrite input,
cached input, and cache-write input are charged once at their respective rates;
reasoning tokens are included in total output. An initial conservative usage formula
also charged the ordinary input rate on cache writes; that was corrected during
reconciliation, retaining the original conservative estimates privately. The
pre-dispatch reservation/caps were unchanged and remained safe throughout.

Aggregate response latency: **8.6666s average, 21.1252s worst, 20.7492s nearest-rank
p95**. This measures the existing Responses transport through parsed response receipt,
not the entire objective or human review. Full per-request and per-configuration
usage, timing, requested/returned model IDs and response metadata are retained
privately until grading is locked. They are withheld from grading packets to avoid
identity/performance cues. The reviewed exact three configurations were used; no
unexpected returned model or service tier was observed.

The existing reusable development credential was read from the owner-controlled,
owner-only regular file, used in memory and checked unchanged after **every** request
(content, inode, owner and mode). It was never printed, copied into configuration,
committed, modified or deleted. Original visible model responses and actual returned
IDs remain preserved privately; candidate A/B/C assignment was randomized before
execution and is consistent across all eight cases.

## Evidence for independent ChatGPT grading

**Start here: [per-scenario grading index](avery-director-stage-one-grading-index.md).**
Each of eight files contains the exact model-visible instructions/schema/input and
relevant checkpoint evidence, expected responsibilities/criteria, all three verbatim
responses under Candidate A/B/C, response hashes, validator feedback and actual
persisted synthetic runner outputs/source snapshots. No model names, API IDs, request
order, costs, timing, implementer grades or preferred candidates appear in packets.
[Combined packet](avery-director-stage-one-blinded-packets.json) is also available.

All 24 responses passed runtime validation. This is **not 24 semantic passes**.
Fourteen decisions invoked the existing runner against private synthetic records;
one decision's execution blockers caused correction to be withheld, with original
response and actual withheld-execution evidence retained unchanged. Previously
verified checkpoint rows were seeded using actual synthetic specialist functions,
not attributed to model execution. Claims of external truth, clinical/financial
outcomes, appointment attendance or live bank availability are not established.
Tenant scenarios test claims/refusal boundaries, not hosted database isolation.
One-response screening does not test model judgment after execution.

**Accuracy, semantic completion/reliability, unnecessary blockers, false-completion
and critical-failure rates, cost per successful objective and best configuration are
pending independent grades.** No final Director acceptance or production model change
is recommended from schema/transport success alone. Once ChatGPT records locked
candidate/case grades, unblind the private identity/metrics table, compute the accepted
comparison and recommend the cheapest qualifying configuration. Do not unblind early.

## No-cost verification and remaining gates

**101/101 targeted checks pass** (prior 94 plus four dispatcher/execution and three
completed-packet checks). These verify reservation-before-transport, hash binding,
unknown-charge halt, rejected-output execution withholding, actual same-checkpoint
correction/recovery and exact original-response preservation/blinding. Lint and
application TypeScript pass. Full suite remains **2,406 tests / 2,388 pass / same 18
failing names**, separately tracked in #266.

Original production prompt/schema, scenario fixture contents, runtime infrastructure
and dependency files are unchanged. The previously verified seven-high dependency
security gate remains unresolved; no new build/audit pass is claimed. No merge,
deployment, hosted mutation, other-agent upgrade or Stage 2 execution occurred.

Current resumption point: **independent ChatGPT semantic grading of completed blinded
packets**. Stage 1 spending authorization is exhausted by call count. Stage 2 remains
unauthorized regardless of unused dollars. Broader held-out competency/reliability,
security gate and existing hosted/release verification remain later blockers.

Machine-readable aggregate evidence: `avery-director-stage-one-results-summary.json`.
Private originals, identity map and detailed model/usage records remain in the owner-only
`/private/tmp/avery-stage-one-private/ledger.json` (0600; directory 0700), excluded from
GitHub until independent grading is locked. No credential is stored in that ledger.
