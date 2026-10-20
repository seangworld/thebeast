# Taylor quality follow-up — October 20

Tracking: #270 / draft PR #271. Sean authorized continuing the no-paid-call calculation correction and fallback review after the October 20 PARTIAL-PASS handoff. Application/evidence base: `a7e5d8f1241c1720a156c700f51214ed9cc2c9f7`.

## Changes

- Added pure arithmetic for explicitly dated, same-title saved blood-pressure ranges. The original H-B ranges produce lower/upper systolic endpoint shifts of 14/14 and diastolic shifts of 8/8 mmHg. Paired reading changes remain unknown. No diagnosis, average, significance or cause is computed.
- Supplies the canonical arithmetic to Health planning and contextual synthesis with instructions against mixed-endpoint calculations. Unsupported formats, units, missing measurement dates, overlapping/competing periods and conflicting range fields produce no comparison. Record update times, goals and claim allegations cannot supply measurement evidence. Inputs are not mutated.
- Replaced the generic whole-answer claim-theory fallback with conservative section withholding. Unaffected paragraphs remain verbatim, including letter findings, laterality, evidence gaps, source links and preparation steps when separated from the contaminated section. Contaminated paragraphs and dependent prose are withheld intact until a new peer/higher section. No sentence fragments are recombined into a new assertion.
- The answer explicitly says content was withheld and the review may be incomplete. Mixed fact/theory paragraphs may lose facts; that limitation is visible rather than presented as a complete answer.
- Retained prose now passes the normal deterministic and semantic output safety checks before streaming. Grounding intervention remains recorded even if a later verifier rejects the retained prose. No retry/regeneration loop or new provider phase was introduced; the previously skipped output check now also runs on a filtered candidate.

## Evidence limits

The new tests are deterministic arithmetic and mocked-provider runtime tests, not fresh model evaluation or independent grading. They cover both direct-plan and research-synthesis paths, acceptance and rejection by the output verifier, source/detail retention, conservative mixed-paragraph withholding, unchanged explicit secondary requests, and exclusion of ambiguous comparison data.

Canonical input reduces arithmetic work for the model but is not an output numeric-claim validator: the model can still ignore supplied values. The section filter is not an exhaustive semantic grounding detector, cannot verify retained facts against PDF contents, and cannot guarantee complete letter-detail retention in arbitrary prose. A semantic safety pass is not factual certification.

The original regression evidence, prompts, grading and accounting remain unchanged. The prior 9 PASS / 1 PARTIAL result remains the latest live-model grade. No new provider inference, ledger access, production data access, merge or deployment occurred. Prior cumulative conservative accounting remains $3.71624224; this follow-up incurred $0 in model inference.

## Verification

- `npm test`: 2,509 passed, zero failed (14 added tests).
- Final source build/type/lint results will be recorded in the PR verification comment.
- `git diff --check` passes; the prior regression evidence and private ledgers were not modified.

Keep PR #271 draft pending review and any separately authorized targeted model evaluation. Unused prior budget does not authorize another paid cycle.
