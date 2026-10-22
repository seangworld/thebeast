# Native Jordan research — implemented locally, paid regression proposed only

Owner rejected Serper and the separate search-service proposal. **Those proposals are superseded and must not be activated or implemented.** No new search vendor, user account, API key, catalog requirement, direct website crawler, paid service, production change or model substitution is introduced here. Jordan continues using the existing OpenAI Responses web_search integration.

## Intended experience and implemented changes

A student can supply a goal, study location, constraints and format preferences. Goal/location-led requests now route to research without a named school, URL or the word current. The existing strict private brief accepts an empty organization with a generic study topic/degree/format and explicitly requested coarse study city/region. It never invents a chosen institution. Public search can discover unfamiliar institutions and official program pages. Saved-record-only reads remain ordinary guidance.

The separate private privacy review still precedes public discovery. Requested study city is distinct from home street address; home/contact identifiers and financial/health/caregiving circumstances cannot enter the public brief. Private time/budget/experience constraints remain available for final synthesis, not public query payloads. Scope/relevance/uniqueness validation and FSA/FAFSA handling remain. This privacy decision is model-assisted, not a claim that regex/schema checks prove exclusion of every possible identifier.

Native discovery remains unrestricted by a school catalog. Verification receives candidate hosts plus official directory hosts, checks institution/campus/program/year/credential identity, and accepts finding URLs only from completed tool-source traces matching the accepted host. Multiple newly discovered schools may share one public study-goal target. Identity records can retain official institution names for readable source titles. Verification now requests concise public source excerpts and retains them where supplied. Those are **provider-reported excerpts**, not independently downloaded/byte-verified page bodies or independent certification. Missing excerpts do not silently change the original grading criteria; material claims still need actual official-source support.

Private contextual synthesis now explicitly produces a practical schooling plan: compare options against goal/location/format, honor current time and total budget, distinguish published full-time duration from a feasible part-time path, explain fee scope/residency/intake, suggest ordered preparation/advising/application next steps and preserve unknowns. No enrollment, submission, profile edit or eligibility/award/transfer guarantee. Existing source/citation and final semantic safety checks still gate buffered delivery; evaluation results settle and persist before observer delivery.

## Correcting the hosted-search validation assumption

Official documents read October21,2026:

- [Responses create](https://developers.openai.com/api/reference/python/resources/responses/methods/create): max_tool_calls limits total built-in calls processed; further attempts are ignored. max_output_tokens bounds generated output including reasoning.
- [Web search guide](https://developers.openai.com/api/docs/guides/tools-web-search): search/open_page/find_in_page actions have distinct meanings; search actions incur a tool-call charge. Multiple query strings in one action are not independently established charge units.
- [Pricing](https://developers.openai.com/api/docs/pricing) and [GPT5 model](https://developers.openai.com/api/docs/models/gpt-5): GPT5 standard input$1.25/M, output$10/M,400k model context; web search$0.01/call plus model input tokens. GPT5 is marked deprecated, so future execution must check availability and halt rather than substitute.

The response from52b9bbd3 contains five emitted web items, **four completed actions** (three search, one open) and one trailing searching item, plus reported search meter3. This does not prove five processed/billed calls or a limit violation. It also does not prove an invoice charge of3.

New manifests can explicitly select **processed-actions-conservative-v1**:

1. Require a completed overall response, valid complete token usage, expected model/service tier, priced tool/action types and no failed/error/incomplete terminal state.
2. Count completed web actions against the configured total processed ceiling. Accept extra in_progress/searching attempts only when they form a trailing suffix **after the entire processed quota has completed**. A failed action, unfinished work before quota, later completed action after an unfinished item, duplicate tool IDs, contradictory echoed ceiling, excess completed actions or reported meter beyond the reservation still rejects. This is a narrow interpretation consistent with the documented ignored-attempt contract, not a blanket acceptance of unfinished work.
3. Keep emitted/completed/search/open/find/meter observations separate. Never promote trailing unfinished sources into observed/verified evidence. Do not assert an ignored/billed status the payload does not establish.
4. Reserve the same full context-per-possible-tool-step and output/search maxima **before** dispatch. After validated completion, account complete input/output usage at reviewed rates plus **ALL configured search fees**, not the lower search meter. This is a conservative usage estimate, never invoice reconciliation. No cached-token discounts.
5. Missing/invalid usage, noncompleted stream, unknown model/price/tool or inconsistent counts retains the full reservation and halts. Next-call cap and attempt gates remain unchanged.

This policy relies on the provider's documented processed-call and token-limit contracts; it does not locally control each hosted tool action or prove the provider's internal billing algorithm. The context-per-step reservation remains a disclosed conservative calculation, not an independently measured invoice ceiling. We removed the unsupported inference that emitted array length alone defeats the processed limit. A vendor-independent absolute guarantee against billing outside the documented contract is not claimed.

The exact unchanged captured response now succeeds **in a fresh mocked ledger under the new policy**, accounting$0.0931475 (18,870 input/2,956 output plus four configured fees). That is a counterfactual policy replay, **not** a corrected charge or release in the original run. Its real$2.576 reservation remains untouched. Legacy policy tests keep the historical rejection; no old manifest or ledger is rewritten.

## Local verification versus live competence

The original full flow is preserved: input safety → private brief → separate privacy → public discovery → official-source verification → private practical synthesis → final safety → durable delivered answer. No initial full substantive answer before research, extra verification agent, new service or additional provider stage.

Local tests cover:

- Exact recorded discovery and recorded private responses flowing to a complete mocked contextual answer under the new policy, plus legacy rejection unchanged.
- Same response rejected for completed-action overflow, missing usage, unfinished-before-quota, failed actions, duplicate IDs, mismatched echo or excessive reported meter; unfinished source URLs never become evidence.
- Two unfamiliar mocked schools discovered from a goal/city/online-or-evening request without school names or user URLs; private identifiers/time/money/caregiving absent from public payloads; official identities/excerpts retained; practical cited plan and no unapproved actions.
- Unsafe privacy stops before search; forged/missing sources, unsupported citations, incomplete/failed/disconnected streams and unknown final-screen usage remain fail-closed.
- **Unchanged GC05T1/T2**, full seven stages per turn, actual returned T1 response/state used in T2, correction honored, private constraints included, no third turn permitted, result durable before observer delivery.
- Native$5.74 cap stops before a next maximum reservation; old reservations stay in the cumulative balance.

Final counts are in verification.json. All provider transports in these tests are replaced; synthetic keys/data only. No live model evaluation or free metadata request occurred. No authored mock is a competency PASS. **Goal-led school discovery is implemented and locally exercised but remains explicitly unverified live**, as Sean requested; GC05T1/T2 cannot certify that capability.

## ONE proposed end-to-end regression, not an isolated probe

Owner clarified the scope in the current conversation: unchanged **GC-05-T1 and GC-05-T2**. Source is the original frozen eleven-turn v2 packet. T1 compares TCC Virginia Beach Network Administration AAS and VPCC IT AAS forSpring2027; T2 corrects the intake toFall2027 using genuine new T1 reply/state. Do not add the credential turn, substitute a goals-discovery prompt, insert ideal history or repeat capacity/private-stage probes.

- Two complete researched turns, at most **14 inference attempts +1 free GPT5 metadata check =15 direct requests**.
- **$5.74 maximum NEW conservative API accounting**; six prior ledgers retain$4.25159388, giving **$9.99159388 combined ceiling**. This is a proposal, not approval.
- Request model gpt-5; returned allowlist gpt-5 / gpt-5-2025-08-07; Low input/output checks, Minimal brief, Medium privacy/discovery/verification/synthesis. No substitutions.
- Same ceilings: private1,400/25s, public3,600/45s/four processed web calls, synthesis4,800/60s, semantic guards4,800/45s, total170s/turn under180s route. No time/output increases. At most16 processed web actions across both turns; account all configured search fees.
- No retries, restarts, hidden grader calls or additional cycle. Reserve before every dispatch, halt before exceeding cap and on uncertain usage/status/price/availability or safety/citation rejection. May stop early; unused allocation cannot authorize an extension.
- Sum of all14 per-call maximum reservations is **$15.648**, not the approved/proposed spend and not a forecast. Sequential validated settlements must make each next maximum fit below$5.74. This arithmetic is explicitly checked; no claim all stages can always fit.
- Preserve actual requests, responses, tool traces, excerpts/citations, genuine history/state, validation/delivery evidence, token/cache/reasoning details, latency/model IDs and known-estimate versus unresolved accounting. Blinded packets omit model names and executor grades. Executor review is not independent grading.
- Grade the existing six original GC05 criteria across both relevant turns. Useful findings/correction, identity, scope/fees and source-supported claims are required; generic refusal is not a successful researched plan when evidence exists. Missing/unexecuted work stays NOT TESTED; critical privacy/authority/fabrication failures remain material. Assess whether the delivered plan is practically useful as an explicit outcome observation without rewriting the original criteria.

Known source limits remain: TCC's linked catalog previously403; exact prerequisites not established there; Fall2027 fees/application cutoffs not established; current source facts may change. New actual evidence must be inspected, not graded against obsolete rates or fabricated missing facts. Native source retrieval is model-assisted; independent semantic review is still necessary.

The exact candidate/manifest/pricing expiry are frozen in this directory after the no-cost checks. No private approval receipt or evaluation ledger is created by preparation. Future execution requires separate explicit approval of that frozen run. This task does not authorize any paid inference, purchase, merge or deployment.
