# Taylor approved quality regression — October20,2026

**Completed once; focused executor result PASS,10/10 original criteria.** Four original H-B/H-C turns returned using fresh scenario histories and genuine preceding replies. No additional evaluation cycle, merge, deployment, production/member writes, new service or credential change. PR271 remains draft. Owner approved the prepared20-attempt/$6.28 proposal directly; activation was frozen at `e137ca52`, application corrections at `e04db05b`.

## Calls, tokens, latency and cost

| Metric | Actual |
| --- | --- |
| Direct provider requests |16/20:14 inference +2 free model-availability GETs |
| Inference phases |4 input checks,4 plans,4 output checks,1 research,1 synthesis |
| Attempts settled / unknown / retries |14 /0 /0 |
| Actual returned models |6 `gpt-5.6-luna`;8 `gpt-5-2025-08-07` |
| Input / output tokens |49,069 /9,994 |
| Cached input / cache-write input |2,946 /8,610; subsets of input |
| Reasoning tokens |6,377; subset of output |
| Completed search actions |3; maximum tool fees retained |
| New conservative accounted cost |$0.16930923, within $6.28 |
| Usage estimate at published rates + maximum tool fees |$0.16342947; invoice not reconciled |
| Prior accounted cost, unchanged |$3.71624224, including unresolved $3.31 |
| Aggregate conservative accounted cost |$3.88555147, within original $10 |
| Turn latency |13.504s,9.341s,20.270s,79.632s; mean30.68675s |

H-B used Luna Medium throughout. H-C retained existing GPT5 policy: Low safety checks/research planning/research; default Medium original-document planning and synthesis. Exact requested effort and returned IDs are in `call-accounting.json`; this is not a new candidate comparison.

The profile counts the two free preflight metadata requests toward20, permitting at most18 inference dispatches. Every inference reserved maximum input/output/tool cost before dispatch. Unknown pricing/usage, timeout, ceiling breach and duplicate scenarios fail closed; no retry. All14 reservations fit the remaining new and aggregate ceilings. New private ledger uses `taylor-20261020-quality-regression-pr271`; all three prior receipt hashes remain byte-identical. No old ledger was reopened for execution or reset. The original unresolved reservation was not released. See `guard-postrun-verification.json` for receipt hashes, each reservation and exact integer accounting.

## Quality and evidence limits

[Grading](GRADING.md) records each original criterion. H-B numerical wording is corrected in this sample; preparation-only model plans propose no record writes. H-C preserves source details, laterality, current official evidence and two steps without unsupported secondary theories. Raw outputs and delivered responses are identical, with no validation failures. **Live fallback unexercised**, because no intervention was needed; deterministic injected-failure tests are not substituted for model evidence.

Packets preserve original prompts/PDF/criteria, complete model-visible phase inputs, verbatim returned text, actual search evidence and follow-up history. Model/cost/implementer-grade metadata is separated from `review-packets.json`; do not claim genuinely blinded or independent grading after exposure to implementation. `raw-guard-delivered.json` separates proposals, raw answers, feedback/intervention and final answers. SHA receipts cover exported evidence; full private ledgers remain private, with no credentials committed.

## No-cost validation and remaining action

Before paid execution:2,512/2,512 tests, lint, TypeScript and required security-gated build passed. Full npm audit reported zero vulnerabilities; all22 maintained-braces tests passed. Final guard tests include stop-before-cap, unknown pricing/missing usage, prior receipt/cap integrity and20-total-attempt ceiling. No security gate bypass. No unrelated application changes.

**Recommendation:** accept this focused quality regression for owner/independent review; keep PR draft pending release decision and any previously documented DEV integration/release gates. This run has no new execution blocker. Remaining evidence limits are unexercised live fallback, small reused development sample, research latency and lack of independent/clinical certification. Original halted-run $3.31 usage remains unresolved and fully budgeted. No further paid calls are authorized or necessary for completing this handoff. Do not convert unused budget into another cycle.
