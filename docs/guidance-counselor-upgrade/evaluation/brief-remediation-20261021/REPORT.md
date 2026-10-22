# GC private research brief — no-cost correction, October 21, 2026

## Retained evidence and diagnosis

The exact immutable GC04 terminal event reports `response.incomplete`, reason `max_output_tokens`, requested GPT-5 Medium, 1,400 maximum output tokens, 1,111 input tokens and 1,344 output tokens, all 1,344 classified as reasoning, with no brief text. This establishes this call's provider-reported output-limit termination. It does not explain either earlier halted failure, prove why reasoning consumed the available allowance, or establish that every request needs more tokens/time. No private reasoning was decrypted or inferred.

The brief previously inherited Medium because it specified no effort and the evaluation guard supplies Medium when absent. This narrow schema task needs only public target extraction, not eligibility decisions, research, a plan or factual prose. The wording was also restricted to school/issuer/credential/occupation targets, leaving a FAFSA public-authority request insufficiently explicit. That mismatch is a contract weakness; retained evidence does not prove it caused the incomplete stream.

## Justified correction

OpenAI's current [GPT-5 parameters guidance](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools) specifically recommends explicit Minimal for lightweight extraction and notes that unspecified effort defaults to Medium. The private brief now explicitly uses **Minimal for GPT-5 and its 2025-08-07 snapshot**, with **Low for other existing configured reasoning models** (avoiding assuming they support GPT-5's Minimal value). No model is replaced. The guard already preserves explicit efforts; a regression assertion verifies Minimal survives reservation preparation. Privacy review, discovery, verification and synthesis retain their existing settings.

The extraction instruction now states one limited task: schema-only public lookup fields/question categories, no research, factual explanation, advice or eligibility judgment. It preserves actual private context, recent user follow-ups, institution location versus learner-home separation, private-attribute exclusion, public eponyms, no invented school, empty unknown year/version and no unconfirmed assistant selections. Ambiguous/too-many targets produce empty fields and stop before search; the safe fallback explicitly asks the member to clarify the target/year when unclear.

Public education authorities/programs are expressly allowed. **FAFSA → organization Federal Student Aid, program FAFSA** is a named public alias, not a selected school or inferred learner attribute. The official [Federal Student Aid toolkit](https://financialaidtoolkit.ed.gov/tk/about) identifies FSA as an office of the U.S. Department of Education and responsible for developing FAFSA. The alias does not assert current eligibility/requirements, identify an award year, prove a domain's official identity or bypass subsequent discovery. No learner name, phone/address, caregiving or capacity is added to the public alias. The attempted ED office page fetch returned403; the successfully fetched toolkit establishes the public relationship, not current application rules.

**Separate private privacy review is retained** with the full original private context and proposed brief. It must still reject personal data, uncertain/ambiguous or invented targets, and unsafe abbreviations; only the explicit public FAFSA alias is explained. Unsafe or uncertain review stops before public tools. Public official-source discovery and independent source-identity verification remain required. No deterministic regex is represented as a complete PII detector.

Output and time limits remain unchanged: private 1,400/25s, public 3,600/45s, synthesis/semantic ceilings and whole-turn timeout unchanged. No accounting, guard settlement, retry, source validation, owner approval or authentication relaxation. Ordinary nonresearch guidance and current-capacity handling are untouched.

## Verification

- Fresh `npm test`: **2,536/2,536 PASS**, rebuilding compiled runtime.
- Guard/integration suite: **22/22 PASS**, including preservation of explicit Minimal, full-reservation unknown handling, current $3 next-call reservation and seven-attempt ceiling tests. Existing incomplete/failed/disconnected diagnostics tests remain passing.
- Focused mocked discovery checks: institution, credential and public-authority briefs; explicit Minimal and 1,400 ceiling; original private identifiers retained privately; independent privacy stage; only safe public brief reaches discovery; FAFSA public input includes no fabricated institution or academic year; personal-name brief rejected by semantic privacy, contact-number brief rejected structurally; ambiguous empty targets stop with clarification available; provider incomplete/max-output event with reported reasoning usage stops before privacy/public search. Existing unsafe/uncertain privacy checks and source-validation/full-runtime tests remain passing.
- Lint /TypeScript: PASS. Required security-gated build: PASS, **22/22 fork security regressions**, full npm audit **zero vulnerabilities**, 221 pages generated.
- Frozen packets/criteria/source baseline verifier: PASS in fixtures-only mode, correctly noting changed application source. No old source pin or manifest rewritten to make it appear valid for this correction.
- [Preservation receipts](preservation-verification.json): all three halted private GC ledgers and all three historical published evidence hash maps unchanged; four Taylor ledger receipts unchanged.

These mocked tests supply provider outputs to verify contract transport, privacy ordering and fail-closed behavior; they do not prove a live model will select the correct alias, protect privacy semantically or complete a brief. No live outputs or old grades were revised. Four original GC04 criteria remain NOT TESTED. No UI change/visual claim.

## Accounting and remaining uncertainty

Conservative historical accounting remains **$1.64070013 = $0.06470013 settled conservative + $1.576 full unresolved reservations**. No reported incomplete usage was converted into settlement or released. New paid calls/spending: **0/$0**. Three halted runs remain permanently preserved. No retry, restart, new model metadata call, merge, deployment, production action or credential change.

Minimal is justified for this task, but its live accuracy, privacy and completion/latency remain unverified. A model may still emit ambiguous/malformed/unsafe output or fail; existing validation must stop. The broader research and synthesis stages remain unproven. GPT-5 was marked deprecated in the preceding official model review; a future availability failure must halt, not silently substitute another model. Any new source invalidates the old approved manifest for another run.

## Smallest useful next test — recommendation only

Recommend a **private-stage GC04 probe**, using the unchanged original GC-04-T1 prompt, synthetic record and actual context construction:

1. Existing input semantic safety, GPT-5 Low.
2. Private brief, GPT-5 Minimal, existing 1,400/25s.
3. Separate privacy review, existing GPT-5 Medium, 1,400/25s.

Maximum **three inference attempts plus one free availability check**, no retries, proposed **$1.58 new hard cap**; the current per-call maxima sum to **$1.576** ($0.548 + $0.514 + $0.514). Combined ceiling would be **$3.22070013**, retaining the complete prior balance/reservations. Halt on incomplete/unknown usage, unsafe/uncertain privacy or any maximum that cannot fit. No public search or member factual answer in this probe. Inspect genuine brief output for correct FSA/FAFSA target, no invented school/year/private attributes and genuine privacy-review evidence. This measures the demonstrated blocker only; original four end-to-end criteria remain ungraded/NOT TESTED until actual research/synthesis exists.

This is **not an executable approval request**: before spending, prepare a small explicit stop-after-private-review boundary reusing the existing stages (no duplicate pipeline), mocked verification that no public call dispatches, a new manifest/candidate/compiled/script hashes, refreshed pricing/visibility, a fresh ledger and read-only verification of **all three** prior receipt balances. Require separate owner approval of that exact run. The old dispatcher/approval must not be reused. No assessment is executed or authorized by this recommendation.
