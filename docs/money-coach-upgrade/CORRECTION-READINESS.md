# Money Coach consolidated correction and release readiness

Owner authorization: [Issue #268 correction approval](https://github.com/seangworld/thebeast/issues/268#issuecomment-6256234491). Independent historical review: [locked FAIL for release and diagnostic family grades](https://github.com/seangworld/thebeast/issues/268#issuecomment-6256226860). This work makes no paid inference calls and does not revise those grades.

## Root cause and correction

The old prompt asked for relative database-like paths while the response schema allowed arbitrary path strings. The validator traversed exact dotted own-property paths, disallowing the model's bracket selectors, expressions and invented aliases. Valid narrative arithmetic could therefore fail its structured evidence contract. Other failures were substantive: unavailable totals asserted as known, unsupported promotional-field proposals, and two frozen multi-turn fixtures containing later-mutated raw rows alongside earlier calculations.

The no-cost claim audit classifies all **64 claims from 11 original plans**:

| Classification | Claims | Meaning |
| --- | ---: | --- |
| Exact old path and value | 21 | These individual claims already matched; other claims caused whole-response rejection. |
| Supported value, unsupported representation | 20 | Explicit offline diagnosis maps the representation to the corresponding canonical fact; runtime aliases are not accepted. |
| Incorrect/unavailable value at the mapped fact | 4 | Totals were deliberately null under incomplete/disputed evidence; claimed numeric rent/minimums may exist as raw row facts, but cannot certify the withheld total. |
| Unsupported reference/computation | 19 | Expressions, invented fields/selectors or unsupported numeric object/boolean claims are not certified. Do not label all nineteen arithmetic mistakes. |

The audit records every original claim, original feedback, source conflicts and diagnostic candidate in [historical-replay.json](evaluation/revision-2/historical-replay.json). The diagnostic translation is confined to an offline report; no equivalent fallback exists in production validation.

Implemented:

- A typed, machine-generated catalog names permitted current canonical cash facts, strategy results and bounded numeric source-row facts. Strategy selectors are explicitly emitted from canonical engine results; arbitrary paths are never traversed. Known rent/APR/source amounts remain available even if overall affordability is unknown. Unknown totals stay null.
- Each request has an opaque evidence snapshot ID. The strict output schema enumerates current selectors and the snapshot ID. Runtime validation checks exact selector/value pairs against the server-generated catalog. A changed context/source or another tenant cannot reuse a previous assessment. This token is not a replacement for authentication/RLS or an authority grant.
- Complete sampled income/bill source sets are checked against their canonical monthly totals using the existing frequency normalizer. Contradictions block delivery instead of silently picking a value. Existing incompleteness/cash-verification checks remain in force.
- The Money-specific output schema and prompt expose only the existing priority/goal/preference write contract. Runtime and approval-time persistence reject debt/APR/income/bill/payment/account operations and unknown fields. Useful explanation can survive a rejected proposal. No transaction tool or financial-write authority was added.
- Supporting source rows are cloned on construction, and per-turn packets are deep-cloned before later source mutations. Separate **v2** fixtures fix folios 67/93 chronology. Original v1 fixture, preflight, packets, raw responses and completed assessment artifacts are byte-for-byte unchanged from `3c477e19`.
- The old preparation entry point refuses to overwrite historical v1 artifacts. Revision-2 preparation is explicit and no-network; it does not grant paid execution. Its larger catalog body is separately reported, not silently admitted under the consumed v1 budget.

The structured schema uses supported object/array/enum/null constructs from [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs). Provider acceptance and actual model compliance with the revised schema remain untested without new approved inference.

## Before/after evidence and limits

**Verbatim historical replay:** all eleven old plans remain rejected. They lack the new snapshot contract and retain their original problematic claims. No response is silently repaired, no historical failure is converted into a pass, and no new AI reasoning is claimed.

**Authored contract adaptation:** folio 24's original narrative, unchanged, can reach the user when a separately authored assessment references only correct current catalog facts. Changing a value to 99,999 fails closed. This proves runtime delivery plumbing with correct typed inputs; it is not proof that Luna will generate that assessment itself.

**Authored security/regression tests:** correct values pass; wrong values, arithmetic expressions, bracket aliases, prototype paths, unknown-to-zero coercion, stale snapshots, cross-tenant assessment reuse, contradictory rows and unsupported promotional writes fail. Existing tenant/authentication, semantic classifiers, owner approval, recovery, cancellation and checkpoint tests remain active. Current financial outputs come from existing BeastMoney engines. Avery's receipt recomputes correctly after source correction, rejects stale evidence and retains historical receipts/checkpoint identity.

Numeric grounding verifies declared numeric evidence, not the entire free-text judgment, omitted facts, financial suitability, or the truth of every sentence. Existing semantic safeguards and independent grading remain necessary. Model-generated safety judgment on the prior attack remains unmeasured because its input classifier preempted the plan.

## Verification

Final local results: **2,465/2,465 regression tests**, including thirteen new contract tests; **5/5** budget guards; TypeScript and lint pass. Required `npm run build` passes its unchanged `audit:ci` gate, **zero npm vulnerabilities** and **22/22** dependency-fork checks. No package/lockfile or toolchain changes.

Exact application candidate **8cb4ccf254b4f6f1efba7dbab894782aa8a107c4**, Ready preview **dpl_CZAkzUBYwmJtzBwuZs6BeptNT2PV**, passed all **12** focused hosted DEV events: real GoTrue auth, browser approval, Health→Money dependency, actual canonical execution/independent verification, same-checkpoint source correction, lease recovery, cancellation/revocation, tenant/minor isolation, reimbursement correction and Money Coach availability/identity boundaries. Inference was confirmed disabled before testing. Director 1440/390/375 and Money Coach 1440/375 layouts had no horizontal overflow; screenshots were inspected. An initial test-driver preflight accidentally continued against an older URL while the new preview built; that run was stopped and excluded, then the exact Ready candidate was verified and passed. Three task-only DEV accounts were signed out/banned with login denial confirmed, goals archived and module access disabled. Temporary DEV key/password files were removed; immutable audit retained. No real customer records, production data or schema changed. See [hosted result](evidence/correction-20261018/hosted-dev-results.json), [cleanup](evidence/correction-20261018/cleanup.json), and [verification receipt](evidence/correction-20261018/verification-summary.json). No local result is substituted for hosted execution or model competence. Production remains outside this scope.

## Release decision and next action

**Not ready for production approval.** Engineering contract defects are corrected and no-cost tests demonstrate acceptance/rejection behavior, but the revised model-facing contract has not received actual model testing. The historical independent release verdict remains FAIL. A new model could still choose irrelevant evidence, misinterpret a correct calculation, omit material uncertainty, produce unsupported prose, or fail the snapshot/schema contract.

One bounded proposal, **not authorized or executed**: one revised nine-family/twelve-interaction Luna Medium assessment, maximum **36 attempted calls / $1.60 estimated spend**, including Low classifiers and failures, no retries/tools/fallback/extra cycle. Preserve the original acceptance thresholds and independently review only the corrected fixture/contract differences before execution. Bound each request to 40,000 UTF-8 bytes, reserve 80,000 input tokens and at most 4,800 output tokens per attempt; conservative all-calls-at-plan-limit ceiling is **$1.50336** at the October 18 verified rates (80,000 × ($0.20+$0.25) + 4,800 × $1.20 per million, multiplied by 36). Reverify pricing/availability, freeze the new manifest, and prepare fresh reservation/ledger authorization before any dispatch. Existing v1 caps are not reusable. Current v2 initial largest body is about 35 KB; actual follow-up history must be checked without truncation. This proposal tests actual selector/snapshot compliance, usable delivered financial reasoning, corrected chronology, unsupported proposals and Avery stale-review interpretation. Input-classifier rejection still does not establish plan-model attack competence. Stop at critical unsafe behavior; independent ChatGPT grades before release decision.

After independently accepted evidence, Sean must separately authorize production release. Proposed release plan: pin the exact reviewed commit and Money-only configuration, reconfirm a fresh verified private backup/rollback point, confirm clean audit/tests/build and DEV evidence, then authorize merge/deploy separately. No database migration is proposed. Preserve Avery's Sol High configuration, permissions and history. Post-release verification must use existing auth/tenant checks, current saved-data/evidence rendering and observability, with no unapproved paid test calls or real financial changes. Roll back code and Money-only configuration to the previously verified production artifact if any financial-grounding, authority or tenant regression occurs; retain audit/checkpoint history and do not run destructive database reversals.
