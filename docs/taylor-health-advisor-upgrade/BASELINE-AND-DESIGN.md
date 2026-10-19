# Taylor Health Advisor upgrade — baseline and design

**Audit date:** 2026-10-19  
**Base commit:** `0a22a7ef460513c2c3573267ea24502736b1a2a4`  
**Tracking:** [Issue #270](https://github.com/seangworld/thebeast/issues/270)

## Existing system verified in source

- Taylor uses the shared Digital Staff runtime and its structured response contract, input/output safety checks, owner-scoped context loader, persistent conversation state, and bounded research path.
- Health context is limited to 200 saved records and 20 goals. Original documents are member-selected, owner-checked, limited to two and 10 MB combined, and passed only to the private model request. The web-research request receives a minimum-necessary query, not private record or document contents; a separate private synthesis combines retrieved public evidence with the permitted context.
- Health document extraction creates review proposals and preserves excerpts; it does not write clinical facts until the member confirms them.
- Veteran claim context is loaded only by selected claim ID and owner ID. It is explicitly labeled unverified and remains separate from `beast_health_records`. Avery's Health assignment recomputes an appointment-preparation model from the current owner-scoped snapshot and verifies it deterministically.
- Medical boundaries include no diagnosis, prescribing, medication direction, filing, representation, guaranteed ratings, or unsupported nexus conclusion. Emergency escalation is enforced by the response contract and fallback.
- Existing BF-AGT-016 evidence reports six controlled synthetic Health Advisor turns passing. That prior assessment does not validate this change or replace independent grading.

## Demonstrated gap

The shared prompt tells Taylor to identify conflicting, incomplete, and stale evidence, and all authorized records are available to the model. However, the runtime did not produce a deterministic, compact cross-record quality index. Taylor had to infer possible medication dose or same-date measurement discrepancies from raw record text, and record age was not summarized consistently. The pre-existing synthetic Health suite also lacked a dedicated medication-list discrepancy followed by a user correction.

This is an evidence-triage gap. The code cannot determine which entry is medically correct, whether an old record is clinically stale, or whether a member report is verified.

## Change prepared on this branch

`src/lib/health/evidenceQuality.ts` adds metadata-only triage for health records:

- Flags missing source labels and event dates, and reports days since an old record update without calling it medically stale.
- Surfaces possible discrepancies between active same-name medication entries when dose, strength, frequency, schedule, or route differs.
- Surfaces same-date, same-name measurement value or unit differences only when both event dates are present and match.
- Emits record IDs and field names, not duplicate clinical values. It labels every difference unresolved and never selects a winning record.
- Excludes member-reported VA claim context from clinical discrepancy checks.
- Adds a clear boundary to the Health model input: source labels are unverified, age is not clinical currency, and claims remain separate.

The pre-existing raw record inputs and authorization flow remain authoritative. This is a prompt-supporting index, not a new database, retrieval system, clinical reconciliation engine, or VCA Advisor.

## Scope boundaries and remaining proof

- No real member records were loaded, changed, or tested.
- No paid model calls were made. Mock-based contract tests and deterministic triage cannot prove model judgment.
- The new synthetic scenario tests conflict handling, claim separation, correction continuity, and no-write behavior in the evaluation harness. It has not been run against a live model.
- No production database or deployment action is included.
