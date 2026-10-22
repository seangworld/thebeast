# GC brief category contract correction — October 21, 2026

Candidate **075cdb0917698e003a9db5b374c1dfd38b0c4372**, existing PR273. No paid calls or historical evidence changes.

The actual prior Minimal response completed with correct FSA/FAFSA identity but every one of nine categories. The old schema had no question count bound, the prompt omitted the six-category maximum, and the runtime enforced six but did not reject duplicate categories. The existing evidence remains verbatim; privacy review did not run and is not retroactively claimed completed.

## Correction and provider support

Shared `guidanceQuestionCategories` and `guidanceQuestionLimits` supply the prompt, provider schema and parser. A valid brief requires **one to six unique relevant categories**. The prompt explicitly forbids selecting the entire enum by default or padding with unrelated topics. Runtime validation rejects an invalid entire response unchanged: no truncation, deduplication, category replacement or corrective retry.

The official [Structured Outputs supported-schema documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses#supported-schemas) lists `minItems` and `maxItems` for arrays; the additional fine-tuned-model restrictions do not apply to this standard GPT-5 request. Provider questions now carry documented `minItems:1` /`maxItems:6`. The official supported list does **not** establish `uniqueItems` support, so it is deliberately not sent. Uniqueness is instructed and enforced with runtime rejection. Documentation support is verified; no paid schema-acceptance check was made. Any future API schema rejection remains a guarded failed attempt, not grounds for a silent fallback.

Request-scoped allowed categories are derived from the actual current member request and, for an explicit follow-up, its preceding genuine user message. Private saved-record keywords and assistant suggestions cannot broaden the schema. Recognized request topics narrow both the provider enum and runtime allowlist. **Original FAFSA requirements → `funding` only**, which covers federal aid requirements; unrelated exams/version, renewal, accreditation, tuition and other topics require corresponding explicit requests. No academic year, institution or personal eligibility is inferred. Federal Student Aid/FAFSA public-authority handling is preserved.

For unclassified wording, the general category vocabulary remains available to avoid pretending a keyword map fully understands language. The **separate private privacy review now explicitly checks category relevance against the actual request**, including overbroad selections of six or fewer, as well as existing privacy/target/ambiguity checks. This remains model-assisted semantic validation, not a claimed complete deterministic relevance detector. Unknown/private evidence still cannot be sent publicly. Ambiguous targets remain an early clarification path: empty targets are not a valid research brief. Whole actual context, ordinary guidance/capacity, Minimal extraction effort, independent privacy call and private-probe stop/transport restrictions are preserved.

## Regression and no-cost verification

- **2,539 application tests PASS**, fresh compiled runtime.
- **26 guard/integration checks PASS**, including unknown usage, incomplete/failed/disconnected streams, exact private stages/efforts and no public/later transport.
- The regression loads the **actual nine-category output from immutable published accounting**, verifies rejection and checks it is not mutated. It also rejects duplicate funding and irrelevant under-six FAFSA selections, and rejects an unrelated exam category for a tuition/deadline institution request. A mocked discovery transport confirms an irrelevant under-six brief stops before privacy/public calls, despite being valid JSON.
- Focused FAFSA funding, institution tuition/deadlines and credential exam-version/renewal selections pass; explicit extra FAFSA requests and genuine follow-ups retain their scoped categories. Positive mocked context examples use matching synthetic institution/credential requests; original evaluation fixtures are unchanged.
- Lint /TypeScript PASS. Required security-gated build PASS, **22 security regression checks**, audit **zero vulnerabilities**, 221 pages generated. Fixed a Set-iteration TypeScript compatibility error using Array.from; compiler settings unchanged.
- Frozen-fixtures verifier confirms both original packets/criteria/baseline unchanged, honestly reporting changed source and invalidity of old paid dispatch pins.

The fourth prior run ended with a recorded invalid-brief outcome and settled calls, rather than a transport/accounting halt. Continuation preflight now requires its **exact pinned private completion receipt**, matching manifest, call count and computed balance, as well as its immutable ledger digest. A new test rejects missing/tampered completion. Earlier unknown calls still charge full maxima. No ledger status/accounting rule was edited to make the prior probe appear successful.

All four private GC ledgers and four published evidence integrity maps match, as do all four Taylor ledger receipts. Accounting remains **$1.64541513**, including **$1.576 unresolved reservations**. Latest invalid-brief result is still unsuccessful; original four end-to-end GC04 criteria remain NOT TESTED. See verification.json.

## Remaining uncertainty and next action

These tests establish schema/validation/transport mechanics using mocked outputs, not live accuracy, schema acceptance, privacy reasoning or completion. Relevance for unclassified language still needs semantic review. Current FAFSA research/citations/contextual synthesis remain untested. GPT-5 availability is historical until the next separately authorized metadata check; no substitute allowed.

Smallest useful next assessment is the same unchanged original GC04 **private-only three-call probe**, on this corrected source, with input safety Low → brief Minimal → separate privacy Medium, then explicit stop. Proposed **$1.58** new cap; full three-call maxima total$1.576. Retain prior balance, producing a **$3.22541513 maximum combined ceiling**. No public search or later stages. Separate fresh manifest and owner approval required; no replay of the prior run. See READINESS.md for the exact frozen candidate, hash, criteria, limits and executable preflight.
