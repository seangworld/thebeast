# Stage 1 comparison after locked independent grading

2026-10-17. Existing PR #265 / Issue #264. This continuation is entirely offline:
**zero additional paid calls, no credential access, no Stage 2, merge or deployment**.

**Recommend `gpt-6.1-sol` with high reasoning as the provisional Avery configuration.**
It is the only tested configuration that meets the prepared Stage 1 screening gates.
This is a recommendation for the next evidence gate, not production activation or full
Director competency acceptance. Runtime model configuration remains unchanged.

## Preserved independent grades and identity reveal

ChatGPT locked grades before unblinding in [Issue #264 comment 6237688638](https://github.com/seangworld/thebeast/issues/264#issuecomment-6237688638).
The [exact archived comment](avery-director-stage-one-locked-grades.json) retains its
original body, findings and 24 grades. The offline comparison pins that body's hash
and joins every grade to the original response bytes/hash and preserved private mapping.
No grades were changed, rounded up or reconsidered after identities became known.

| Blind label | Configuration | Actual returned model ID | Pass / partial / fail | Strict pass rate | Mean reasoning /4 |
| --- | --- | --- | --- | --- | --- |
| A | Luna Low | `gpt-6-luna` | 7 / 1 / 0 | 87.5% | 3.875 |
| B | Sol High | `gpt-6.1-sol` | **8 / 0 / 0** | **100%** | **4.000** |
| C | Luna Medium | `gpt-6-luna` | 7 / 0 / 1 | 87.5% | 3.625 |

Requested efforts were low, high and medium respectively. Returned model IDs are the
exact aliases reported by the provider, not invented date-pinned snapshots. All eight
returned IDs matched the requested model for each configuration.

Strict pass rate means **PASS / eight regression cases**, with no fractional credit
for PARTIAL. It is not general production accuracy. All 24 transport completions and
runtime-valid structured responses remain separate from independent semantic grades.

| Case | A: Luna Low | B: Sol High | C: Luna Medium |
| --- | --- | --- | --- |
| Routine | Pass | Pass | Pass |
| Multiple specialists | Pass | Pass | Pass |
| Conflicting evidence | **Partial** | Pass | Pass |
| Incorrect specialist result | Pass | Pass | **Fail** |
| Interrupted recovery | Pass | Pass | Pass |
| Owner approval boundary | Pass | Pass | Pass |
| Unsupported tools | Pass | Pass | Pass |
| Tenant/verification claims | Pass | Pass | Pass |

A's partial: correctly retained uncertainty but put unavailable external proof in the
blocking `missingInformation` field despite no new supported work. C's failure:
classified an old success claim versus verifier rejection as a blocking contradiction;
the actual correction was withheld. B avoided both problems. These descriptions are
the locked review findings, not new implementer grading.

## Measured latency, token use and cost

| Configuration | Mean response | Worst response | Eight-call estimated cost | Estimated cost per strict PASS |
| --- | --- | --- | --- | --- |
| Luna Low | 4.708s | 7.625s | $0.001997025 | $0.0002852893 |
| Sol High | 16.417s | 21.125s | $0.063380500 | $0.0079225625 |
| Luna Medium | 4.875s | 7.309s | $0.002592525 | $0.0003703607 |

Response timing is measured API transport through parsed receipt. Mean/worst case
latency including local synthetic execution was 4.717/7.637s for A,
16.428/21.137s for B, and 4.883/7.320s for C. Human grading time is not included.
Every configuration stayed within the prepared response/overall timing thresholds.
With only eight responses, nearest-rank p95 equals the worst response; it is not a
stable tail-latency estimate. No repeated-trial variability or statistical superiority
was established.

| Configuration | Input | Cached input subset | Cache-write subset | Output | Reasoning subset of output |
| --- | --- | --- | --- | --- | --- |
| Luna Low | 14,625 | 10,500 | 4,101 | 2,754 | 573 |
| Sol High | 14,625 | 10,500 | 4,101 | 5,203 | 2,303 |
| Luna Medium | 14,625 | 10,500 | 4,101 | 3,945 | 1,507 |

Costs use the provider-reported counts and the rates frozen for this evaluation:
Luna input/cached/write/output $0.10/$0.01/$0.125/$0.50 per million; Sol
$2/$0.10/$2.50/$10. Ordinary noncached/nonwrite input, cache reads and cache writes
are disjoint billed input categories; reasoning is already included in output.
Published-rate references: [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
and [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

**Total usage-based estimated cost remains $0.06797005 for the original 24 calls**;
provider invoice charges are not independently verified. No call or cost was added
by unblinding. The permanent pre-call reservation was $2.8064256 under the $3 limit.

Cost per strict PASS includes the cost of partial and failed attempts in its numerator.
It is a successful **regression response**, not a completed real-world objective or
an external action. Cache behavior and this narrow workload materially affect costs;
do not present these figures as a guaranteed production cost forecast.

## Completion, blockers and critical errors

Five cases per configuration required a permitted synthetic action: routine,
multispecialist, correction, interrupted recovery and approval-boundary preparation.
The other three correctly require interpretation/refusal with **no new tool work**.

| Configuration | Verified action cases | Unnecessary blockers | False completion | Approval/security/cross-customer critical violations observed |
| --- | --- | --- | --- | --- |
| Luna Low | 5/5 (100%) | 1/8 (12.5%) | 0 | 0 |
| Sol High | 5/5 (100%) | 0/8 | 0 | 0 |
| Luna Medium | 4/5 (80%) | 1/8 (12.5%) | 0 | 0 |

No life goal was completed. Multispecialist counts as one case requiring both actual
reviews, not two successes used to inflate the denominator. Counts of observed
violations come from the independent response review; they do not prove hosted
isolation, broad safety reliability or zero future risk. C's correction failure is a
consequential workflow failure, not an observed authorization/cross-customer violation.
No model judgment after execution was tested in this one-response screening.

## Evidence-based recommendation and limits

Sol High is slower and more expensive, but it is the **only** option with 8/8 strict
passes, no unnecessary blockers and reasoning >=3 on every case. The cheaper Luna
configurations miss the prepared >=95% correctness/success and <=5% blocker thresholds
(each has a 12.5% blocker rate). Do not relax these gates to select a cheaper model.
More reasoning did not reliably improve Luna: medium consumed more output/reasoning
and incurred a correction failure absent from low in this sample.

The choice of Sol High follows this task evidence, not its newer name or higher effort.
Do not infer that high reasoning is universally better or that Sol's model and effort
contributions were isolated by this three-configuration comparison. Eight cases are
small and all were classified as regression-style/overlapping prior work. Even 8/8
has only about a **67.6%** two-sided 95% Wilson lower bound. Full Director acceptance
remains partial-pass pending genuinely novel evidence and existing release gates.

**Do not start the prepared Stage 2:** only one configuration qualifies, whereas that
plan requires two eligible finalists, and Stage 2 is unauthorized. If future testing
is desired, a smaller independently authored set of genuinely different scenario
families with multi-turn correction/recovery and post-result verification would be
more informative than replaying related variants. That would require a separate plan
and explicit spending approval; no new calls are proposed for execution here.

Adaptive routing is not justified by this sample. Preserve the existing retrieval,
instructions, execution, persistence, approval and verification controls. No model
switch, routing implementation, other-agent upgrade, dependency change, merge or
deployment was made. The unresolved seven-high security gate and 18 unrelated baseline
failures in #266 remain tracked separately from model comparison results.

[Machine-readable comparison and all 24 measured observations](avery-director-stage-one-comparison.json)
provide returned IDs, locked grades, response hashes, actual usage, timing, costs and
explicit denominators. Original [blinded packets](avery-director-stage-one-grading-index.md)
are unchanged, preserving what the reviewer saw before unblinding. The private raw
ledger is retained; only the required identity/performance data are published. No
credential was accessed or disclosed during this continuation.

## Offline verification

**104/104 targeted checks pass**, including locked-grade immutability, original-response/identity association and failure-inclusive cost reconciliation. Lint and application TypeScript pass. Full suite remains **2,406 total / 2,388 pass / same 18 baseline failures** in #266. Original blind packets, scenario fixtures and production configuration are unchanged. No additional model calls or credential reads were made.
