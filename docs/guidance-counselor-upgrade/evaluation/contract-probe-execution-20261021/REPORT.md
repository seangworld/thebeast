# Approved corrected-contract private probe — October 21, 2026

**Private-stage probe completed: executor PASS; independent review pending.** This is not an end-to-end GC04 pass or Jordan competency certification. **All four original end-to-end criteria remain NOT TESTED.**

Owner-approved candidate `075cdb0917698e003a9db5b374c1dfd38b0c4372`, preparation `bc30f1a0`, exact manifest `ec5c2028439143bc777b997f6542973d698c41c994f0a6305aa83a106d5e3c46`. Before one execution, offline checks verified unchanged source/compiled/scripts/fixture, unexpired pricing, exact private owner receipt and all four prior ledgers, including the fourth pinned completion receipt. Original GC04 prompt/synthetic record/history and original four criteria unchanged.

## Verbatim model text and actual stage results

One free GPT-5 metadata request returned200. All three inference calls completed and settled, with returned identity **`gpt-5-2025-08-07`**, no substitution.

Input safety — **Low**:

```json
{"verdict":"safe","categories":[]}
```

Private brief — **Minimal**:

```json
{"targets":[{"organization":"Federal Student Aid","program":"FAFSA","region":"","intake":""}],"questions":["funding"]}
```

Separate privacy review — **Medium**:

```json
{"verdict":"safe"}
```

The exact source strings are also in [verbatim text](verbatim-private-stage-output.md), [full request/accounting evidence](call-accounting.json) and the [blinded packet](blinded-review-packet.json). Original full provider responses remain privately retained; public output omits opaque encrypted reasoning ciphertext only, never member-visible output text.

**Executor semantic inspection:** Federal Student Aid/FAFSA faithfully identifies the requested public authority/program without inventing a school. The only selected category is funding, covering the requested FAFSA requirements; no unrelated exam-version, renewal, accreditation, tuition or other category. Region/intake remain empty, so no home location or award year is inferred. No synthetic learner name, phone, home address, caregiving, weekly capacity, sensitive attribute or other private record detail appears in the actual brief. It contains no eligibility/award judgment or unsupported factual explanation. Separate privacy review actually completed and returned safe; this is preserved model evidence, not independent privacy certification.

The brief passes the provider shape, shared count/scope rules and runtime uniqueness validation without repair. Runtime produced `kind:private-stage-probe`, `status:reviewed`, original parsed brief and `privacyVerdict:safe`, then the explicit typed stop returned only the private result. **No public search, source verification, synthesis, output-answer stage or member factual answer followed.** All three stored request IDs are exactly the approved input/brief/privacy stages. No retries or later transport attempts.

## Actual timing, tokens and accounting

| Stage | Effort | Latency | Input | Output | Reasoning subset | Conservative settled |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Input safety | Low | 3.511s | 696 | 194 | 128 | $0.00281000 |
| Private brief | Minimal | 2.107s | 1,180 | 54 | 0 | $0.00201500 |
| Separate privacy | Medium | 10.690s | 1,120 | 960 | 896 | $0.01100000 |
| **Total** | | **16.308s summed provider latency** | **2,996** | **1,208** | **1,024** | **$0.01582500** |

Reasoning is included in output tokens, not an additional charge. The summed per-call latency is not a measured end-to-end member objective latency; no member objective answer was delivered. No cached/write input or tool actions reported. Token-rate estimate equals conservative settlement for these calls; invoice reconciliation has not occurred.

- **Three inference attempts +one free metadata check =four direct requests**, exactly within the approved count limits.
- New settled conservative accounting **$0.01582500 /$1.58**, no new unresolved usage.
- Retained prior **$1.64541513**, including **$1.57600000 unresolved maxima**; unchanged.
- **Combined conservative accounting $1.66124013 /$3.22541513 ceiling**. Combined settled conservative total$0.08524013 plus full unknown maxima$1.57600000.
- Every full next-call reservation fit before dispatch; none exceeded the new or combined caps. Unused budget authorizes no extra calls/cycles.

One successful private-stage sample demonstrates this brief/review contract and stop behavior in this case. It does not establish general reliability, benchmark accuracy, a distribution of response times, or factual research competency. No model grade was substituted for the actual output.

## Preservation and evidence boundaries

New private ledger SHA256 **`73a359168b6e66dc89979fdb60635f8ddebf9acdb895af4b40a06f27abf46538`**. [Post-run verification](postrun-verification.json) confirms all four prior ledgers and all historical evidence maps unchanged, plus all four Taylor receipts. The new successful run has its own ledger and completion receipt; older halted/invalid outcomes were not overwritten or regraded. No prior unknown reservation released.

Frozen offline preflight passes after execution; no source/prompt/schema/settings/criteria/manifest changes. No new app regression/build claim for evidence-only exports: the frozen candidate's earlier2,539 application/26 guard/security-gated build results remain preparation evidence. No paid post-run checks, response retrieval or Support request.

[Executor assessment](executor-assessment.json) is explicitly by the same engineer who implemented/executed the change. [Blinded evidence](blinded-review-packet.json) omits model identities/settings and executor grades and is ready for independent ChatGPT review. It contains original context, complete model-visible input and verbatim output; no public source evidence or member answer exists. Four original end-to-end criteria remain **NOT TESTED**, even though the private-stage success definition passed executor inspection.

## Recommendation

Retain PR273 draft. Review this narrow private-stage evidence independently. The remaining live gate is actual privacy-approved source discovery, official-source verification and contextual synthesis; correctness, citations and member-context application remain unmeasured. Any future execution needs a separately frozen scope/manifest, all five prior ledger receipts/balances, refreshed pricing and new owner approval. Do not replay or extend this run under its unused budget.

No additional paid cycle, retry/restart, model substitution, public/later stage, real member read/write, credential change, merge, deployment or production action occurred. This approved private-stage execution and evidence publication are complete.
