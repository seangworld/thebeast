# Approved GC private-stage probe — October 21, 2026

**UNSUCCESSFUL private-stage probe; safely stopped early at invalid brief. No retry/restart.** The original four end-to-end GC04 criteria remain **NOT TESTED**. Executor inspection below is not independent review.

Owner approved candidate `212d3cdd0e59b9f20cc145ff0bb030c624facb76`, exact manifest `56b9f68a3d34b5f5f98c0be3a033c9106ee56409a31a23320958e564367e8c64`, $1.58 new/three inference/one metadata maximum, combined ceiling $3.22070013. Frozen source/compiled/scripts/fixture/pricing, exact private owner receipt and all three prior ledger receipts reverified before the single dispatch. Original context, success definition and criteria unchanged.

## Verbatim evidence and inspection

Free GPT-5 metadata check returned HTTP200. Actual returned inference identity for both calls: **`gpt-5-2025-08-07`**, no substitution.

Input safety — requested Low, **4.381s**, 696 input/159 output tokens, including128 reasoning:

```json
{"verdict":"safe","categories":[]}
```

Brief extraction — requested Minimal, **1.525s**, 1,132 input/84 output tokens, **zero reasoning tokens**:

```json
{"targets":[{"organization":"Federal Student Aid","program":"FAFSA","region":"","intake":""}],"questions":["admissions","prerequisites","tuition_and_fees","deadlines","accreditation","exam_version","renewal","funding","career_requirements"]}
```

Both responses completed with usable reported usage. The brief produced text promptly in this one sample; no token exhaustion/incomplete stream occurred. This is evidence for this case, not a general latency/reliability conclusion or retrospective explanation of prior failures.

**Executor inspection:** the public authority/program labels correctly identify Federal Student Aid/FAFSA; region/year are empty; no school, eligibility finding, learner name, phone, address, caregiving or capacity appears. However, **all nine question categories were returned**, rather than a faithful narrow funding/requirements brief. Exam version, renewal, accreditation and tuition/fees are not justified by this request.

The provider schema permits these nine enum values with no array-count ceiling, while `parseGuidanceBrief` accepts at most six. The actual brief therefore matches the provider's schema but **fails the application contract**. The current brief prompt names question categories without explicitly stating the six-item maximum. This is a demonstrated contract mismatch, not a reason to weaken the parser, truncate the original result or declare success.

The runtime raised its typed early stop with `status: invalid-brief`, `brief: null`, `privacyVerdict: null`. **Separate privacy review was not attempted.** Public search and all later stages were not attempted; no answer was delivered. Consequently the defined successful three-stage probe did not complete. No safe privacy verdict can be claimed from manual inspection alone.

The completion receipt's `completedPrivateProbes: 1` counts a recorded probe outcome, including invalid outcomes; it is **not a successful probe count**. This report and execution summary explicitly record zero successful probes and zero completed runtime/member-answer turns. The ledger has no transport/accounting halt because both calls settled; exclusive ledger creation still permanently prevents restart.

## Timing, usage and accounting

| Measure | Actual |
| --- | ---: |
| Inference attempts /maximum | 2 /3 |
| Free metadata checks /maximum | 1 /1 |
| Total direct requests /maximum | 3 /4 |
| Separate privacy review calls | 0 |
| Public/later calls and delivered answers | 0 |
| Total input/output tokens | 1,828 /243 |
| Total reasoning tokens | 128; brief0 |
| Safety /brief latency | 4.381s /1.525s |
| Safety cost | $0.00246000 |
| Brief cost | $0.00225500 |
| **New conservative settled total /cap** | **$0.00471500 /$1.58** |
| New unresolved reservations | $0 |
| Retained prior conservative balance | $1.64070013 |
| **Combined conservative balance /ceiling** | **$1.64541513 /$3.22070013** |
| Retained prior unresolved reservations | $1.57600000 |
| Provider invoice reconciled | No |

No cached/write tokens or tool actions reported. Standard-rate token estimate equals new conservative settled accounting for these calls; prior unresolved maxima remain untouched. Both pre-dispatch maxima fit; cap/attempt limit was not the stopping cause. No unused budget authorizes another call, corrected retry or extra assessment cycle.

## Evidence and verification

[Accounting](call-accounting.json) preserves exact model-visible requests, verbatim output, returned identity/settings, token usage and latency. Original full provider responses remain in the private immutable ledger, SHA256 `ec0fd349708df9591edbad3b074cc8522bce1ca044df9641cdefd203a9c8e180`. Public evidence omits opaque encrypted reasoning ciphertext only, not output text. [Blinded review packet](blinded-review-packet.json) excludes model identities/settings and executor grades; [executor assessment](executor-assessment.json) remains separate. No independent review claimed.

Post-run frozen preflight passes. [Preservation verification](postrun-verification.json) confirms all three prior private GC ledgers, all original evidence export hashes and four Taylor ledgers unchanged. New result/accounting persisted before process exit. No application, prompt, schema, criteria, source, ledger or model change during/after execution. Prior2,536 application/25 guard/build checks remain preparation evidence; no new test run is misrepresented as live competency.

## Recommendation and boundary

Keep PR #273 draft. The narrow next engineering action is **no-cost alignment of brief question cardinality/relevance across prompt, provider schema and application validator**, with tests for the actual all-nine-category output and an overbroad but six-or-fewer selection. Preserve the rejection rule; do not blindly truncate categories or author replacement results. A later privacy review remains necessary even when this contract is repaired. Do not infer that an unrelated model/limit change is needed from this sample.

No additional implementation or paid assessment cycle was performed under this execution approval. Any future changed-source probe needs a new frozen candidate, all four prior ledger receipts, refreshed limits/pricing and separate owner approval. No retry, restart, model substitution, Support/response retrieval, real member access/write, credential change, merge, deployment or production action occurred.
