# Jordan — consolidated engineering handoff

PR #273 / Issue #272. No-cost review after the quota-halted GC-05 regression. No new inference, metadata requests, external search service, spending or assessment framework. Original scenario prompts and 24 role-specific criteria unchanged. This is an engineering assessment by the executor, not independent certification.

## Outcome and exact blocker

The existing native-research implementation can traverse the complete request-to-delivered-answer path under controlled local transport. No demonstrated contract mismatch remains in those reviewed cases. That is not proof that the model will return accurate, useful researched answers within the limits. **Jordan has still not delivered a live researched answer in the retained assessments.** Live performance, full-route latency, evidence quality and practical usefulness remain unverified.

The last real attempt failed before research: the OpenAI project returned HTTP429 `insufficient_quota` / `credit_balance_exhausted` on the first safety call. A model metadata HTTP200 did not establish funded inference access. No-cost engineering cannot resolve that account balance. Owner account access/funding must be resolved outside this work before further live inference can succeed. No purchase, new spending approval request or automatic future run is made here. All halted runs remain closed; any later assessment requires a fresh, separately authorized dispatch for the revised candidate, not an old manifest restart.

No hosted release or authenticated member end-to-end verification was performed in this task. This development PR remains unmerged and undeployed. Do not treat the funding fix alone as a release-readiness or competency certificate.

## Whole-flow review and corrections

| Stage | Current responsibility and bound | Evidence / conclusion |
|---|---|---|
| Owner/member request | Existing authentication, entitlement and owner-scoped record loading in app route; sanitize untrusted context | No auth/tenant changes; synthetic runtime tests do not establish hosted auth |
| Input safety | Deterministic check then isolated semantic classifier, Low on selected gpt-5, 45s phase ceiling | Fixed: Jordan's actual app calls now have the same 4,800 output-token ceiling as guarded evaluations; previously the harness alone supplied it |
| Mandatory research routing | Deterministic plan marker bypasses initial substantive answer generation | Preserved: no full unsupported answer before research; ordinary guidance retains normal plan path |
| Private brief | Minimal for gpt-5, 1,400 output tokens /25s; at most2 targets, 1–6 unique relevant categories | Preserved successful FAFSA/public-authority handling and request-scoped category validation; no silent output truncation or replacement |
| Separate privacy review | Medium, 1,400 /25s; private context compared to public brief | Preserved: learner identifiers, address, finances and caregiving remain private; public requested study area/topic may be searched |
| Native source discovery | Medium, 3,600 /45s, at most4 processed built-in actions | Supports unfamiliar schools without catalog/URLs/user accounts; completed tool provenance required; no separate vendor |
| Official identity and evidence verification | Medium, 3,600 /45s, at most4 processed actions; bounded identities/findings | Official host/proof and consulted URLs checked; intake/residency/fee applicability and unknowns preserved; provider-assisted excerpts are not independent page-byte verification |
| Private contextual synthesis | Medium, 4,800 /60s | Uses private time/budget and verified findings, practical next steps and citation URLs; no tool/write authority |
| Citation and final safety | Citation membership plus semantic claim-to-evidence check, Low/4,800 /45s | Preserved blocking of unsupported/unsafe outputs before delivery; safety verdict does not certify all claims true |
| Delivery/persistence | Buffered until validation; evaluation accounting settled and result durably captured before delivery | Existing completed-turn history/state reused for correction; unknown usage retains full reservation and halts |

**Deadline alignment:** the app route and synthetic session already imposed170s. Jordan's runtime now enforces that same total even when invoked without those wrappers; an earlier caller deadline still wins. Individual phase ceilings above are maxima within170s, not a promise that all maxima fit (they sum290s). No timeout/token increase, model switch or extra call was introduced. The route has180s maximum duration; route setup/persistence consume some headroom, so successful hosted timing is still unverified. Slow stages can exhaust the deadline; a complete answer within it is not proven by mocked responses.

**Stop-before-dispatch:** both streaming and nonstream provider entry points now reject a pre-aborted caller before creating an evaluation reservation or invoking fetch. This prevents a known-expired turn from spending another attempt merely to discover its cancellation. In-flight failures still remain unknown and retain the full reservation; no retrospective release.

**Failure evidence:** the latest quota error's sanitized type/code appeared only in its execution log because nonstream unknown accounting omitted diagnostics. Future nonstream failures now retain HTTP status, provider request ID and sanitized error type/code in their unknown receipt, without raw error text/credentials. Existing stream terminal/error/usage capture is preserved. No historical receipt was edited to add or infer usage.

**Complexity removed / avoided:** mandatory research has seven calls, not the old eight-call full-plan-first flow; stale evaluation-plan prose now says so. One native provider, no catalog constraint, separate privacy gate, no new crawler, service or framework. Retained source verification and final safety are distinct safeguards, not duplicate school-answer generators. No evidence justifies dropping them to chase delivery.

**Accounting distinctions remain:** emitted web items, completed actions and reported searches are separate observations. New-run processed-action policy uses documented processed-call limits; conservatively charges every configured search fee plus validated tokens rather than treating a lower reported meter as an invoice. Missing/incomplete usage or contract violations halt with the full reservation. All original reservations remain unchanged. Successful native-web billing bounds still rely on provider contracts, not a local meter of internal searches or invoice reconciliation.

## What local verification demonstrates

- Fresh compiled application suite: **2,551 passing**, zero failures. Includes complete mocked goals-to-schools and named-school correction flows, ordinary guidance/capacity, privacy rejection, evidence/citation mismatch, incomplete stream handling, no unsupported pre-research delivery and no mutation authority.
- Existing guard/replay suite: **53 passing**, including exact retained discovery replay, real over-limit/unknown usage rejection, durable answer/history reuse and stop-before-cap. These are controlled transport checks, not authored model competency grades.
- New provider checks: pre-aborted streaming and nonstream requests create zero reservations/requests; quota rejection captures sanitized diagnostics, never settles/retries, and excludes raw error body. Both input and output safety requests assert the app-side token ceiling without a harness hook.
- TypeScript and lint pass. Required security-gated build passes, including22 fork security regressions and npm audit reporting **zero vulnerabilities**. No layout/component changes; no new visual claims.
- Frozen fixture/criteria verifier passes (`--fixtures-only`). Old executable manifests remain historical receipts and do not authorize execution of this changed candidate.
- Seven GC ledgers, all seven historical evidence integrity maps and Taylor receipts verified unchanged. **$4.79959388** total conservative accounting, including **$4.70000000** unresolved reservations; no new costs.

Commands: `npm test`; `node --test scripts/test-guidance-evaluation-budget.mjs scripts/test-guidance-research-contract.mjs scripts/test-guidance-school-regression.mjs`; `node scripts/verify-guidance-evaluation-preparation.mjs --fixtures-only`; `npx tsc --noEmit`; `npm run lint`; `npm run build`; `git diff --check`.

## Actual answers available for inspection

[Seven verbatim historical answers](existing-actual-answers.md) consolidate5 first-run ordinary/capacity/qualification answers and2 later capacity answers. They were genuinely delivered by the model, are labeled by run, and have not been edited. Example from the later GC-01-T2:

> Understood—sales is excluded, and I’ll fit this to **two hours now**, not the older four-hour estimate. Don’t enroll or spend money yet.

It ends:

> This creates a clearer next step without committing your budget. Your two-hour limit is being used for this plan only; it does not update your saved weekly availability.

These provide inspectable evidence of ordinary guidance/correction only. They do not establish FAFSA correctness, a supported TCC/VPCC comparison, credential research, application drafting, Tutor handoff or independent school discovery. No completed researched schooling plan exists to attach. The latest GC-05 T1/T2 retain all six criteria **NOT TESTED**; no new live grades or PASS verdict assigned.

**Recommendation:** keep the existing scoped native flow and current safeguards. Do not commission another isolated paid probe or add infrastructure. Engineering/local checks are complete for this review; the remaining decision is whether to restore authorized provider inference access and later obtain a real complete researched answer under the existing criteria. Until that evidence exists, Jordan's research competency and release fitness remain unestablished.
