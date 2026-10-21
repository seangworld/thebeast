# Approved consolidated assessment — halted safely

Executed once on October 21, 2026, candidate `81cea3560afb98df0d6bd1aa3c0443b9437c8a32`, frozen manifest `e4d27fc06d42c7de77df6311cd80e9b9d0984ae76ce0b17b419b98a4acf1e4be`. Owner approved the exact proposed run in the current conversation. No source, scenario, criteria, model settings or accounting changes during execution. Post-run offline preflight passed; that offline check dispatched zero additional requests.

**HALTED: zero delivered member answers, zero completed objectives, all 16 original end-to-end criteria NOT TESTED.** This is not a Jordan competency PASS or a demonstrated semantic failure. Codex reviewed the evidence as executor; independent review remains pending.

## Actual execution

Two free metadata checks returned HTTP 200 for `gpt-5` and `gpt-5.6-luna`. Four inference attempts, all returning `gpt-5-2025-08-07`; no Luna inference occurred. Six total direct requests; no retries, restarts, substitutions or further cycle.

| Stage | Effort | Latency | Input/output tokens | Reasoning subset | Conservative accounting |
| --- | --- | ---: | ---: | ---: | ---: |
| Input safety | Low | 3.082s | 696 /153 |128 |$0.002400 |
| Brief extraction | Minimal |1.785s |1,180 /61 |0 |$0.002085 |
| Separate privacy | Medium |6.918s |1,127 /846 |768 |$0.00986875 |
| Public discovery | Medium |29.682s |18,870 /2,956 reported |2,688 reported |**$2.576 full reservation retained** |

Sum provider latency 41.467s, not end-to-end answer latency. Total reported tokens 21,873 input /4,016 output; reasoning 3,584 is included in output. Settled calls alone: 3,003 input /1,060 output, 896 reasoning. Discovery usage is retained diagnostic evidence, not accepted settlement or reconciled invoice cost.

Actual brief:
```json
{"targets":[{"organization":"Federal Student Aid, U.S. Department of Education","program":"FAFSA","region":"","intake":""}],"questions":["funding"]}
```
Separate privacy returned `{"verdict":"safe"}`. Executor inspection confirms faithful FSA/FAFSA funding scope, empty location/intake and exclusion of learner name, phone, address and private circumstances from the brief and actual public discovery input. Public tool queries contain official-authority topics, not those private details. This preserves the narrow private-stage behavior; it does not pass the original end-to-end privacy criterion without the remaining flow.

## Exact stop evidence and uncertainty

Discovery returned HTTP 200, `response.completed`, status `completed`, usage and matching model/default service tier. No incomplete output, max-token termination, local timeout or provider outage is demonstrated here.

Its terminal output contains **five `web_search_call` items**: three completed searches, one completed `open_page`, and one search item left `searching`. The sent request and echoed response both specify **`max_tool_calls: 4`**. The separate `tool_usage.web_search.num_requests` reports **3**. The existing frozen guard counts all web-call output items and rejects five against the reserved four, producing `Unverified usage/model/tools` and retaining the entire reservation. The actual relationship among emitted items, executed tool actions and billable requests is unresolved. Do not silently reinterpret the five as three, settle from the lower field, or infer that five billable charges occurred.

Discovery text returned four candidate URLs, retained verbatim with full tool/source evidence. Those URLs have **not** passed the subsequent identity/evidence verification. No contextual synthesis, citations/member answer, final safety screen, school comparison/followup, credential research, application drafting or Tutor handoff ran. No manufactured follow-up history exists.

## Accounting and preservation

New settled estimate **$0.01435375** + unknown full reservation **$2.576** = **$2.59035375 /$8.33**. Prior **$1.66124013**, including **$1.576** unresolved reservations, unchanged. Combined **$4.25159388 /$9.99124013**; combined unresolved reservations **$4.152**. Each pre-dispatch maximum fit the cap; attempted counts 4/34 inference and 2/2 metadata. No actual invoice reconciliation. A token-only diagnostic calculation for discovery is $0.0531475 before disputed tool charges; it is excluded from settled costs and does not replace its reservation.

Private ledger SHA256: `837c5dbd38777b676ab2c00b9c85029a83613c14b41e7ca3a3ccd01f9ea08624`. Original full responses, encrypted reasoning payloads and terminal JSON retained privately with restricted permissions. Public evidence omits opaque encrypted reasoning and duplicate terminal JSON only, preserving verbatim visible outputs, complete requests, usage, source/tool traces and diagnostics. No credentials included.

All five previous GC ledger hashes/completion receipts, all five published evidence integrity maps and Taylor receipts verified unchanged. No real member data, database writes, production actions, merge or deployment. No new engineering changes or build claims: preparation's 2,546 application tests, 32 guard/integration checks and security-gated build remain historical verification, not live competence proof.

## Recommendation / release blocker

Keep PR273 draft. First perform a **no-cost contract review** of actual provider web-call item/action/billing semantics and current official guarantees for `max_tool_calls`; reproduce this exact completed payload with mocked transport. Determine whether a reliable maximum can be enforced before dispatch without weakening spend accounting. Preserve all six ledgers and unresolved reservations. Do not resume this run or spend its unused allocation. No further paid probe or assessment is proposed until that bound is established and a new executable manifest receives separate owner approval.

Independent reviewers can inspect `blinded-review-packet.json`; executor observations and NOT TESTED decisions are in `executor-assessment.json`. The packet is ungraded and excludes model identities/settings and executor preferences. Mocked fixes, if later authorized, must not be reported as live end-to-end competency.
