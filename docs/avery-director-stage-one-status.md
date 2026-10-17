# Stage 1: approved budget, waiting for independent scenario review

2026-10-17. Branch `codex/avery-director-capability`, draft PR #265, tracker #264.

The owner approved **Stage 1 only: 24 model calls maximum and $3 total maximum**
in Issue #264 comment 6236922578. The owner subsequently designated **ChatGPT** as
independent semantic/novelty reviewer and explicitly instructed Codex to wait until
scenario-novelty review is complete before paid evaluation.

**Paid inference executed: 0 calls / $0.** No accuracy, response latency, generation
tokens, generated model snapshots or winner exists yet. Avery remains partial-pass.
Stage 2 remains unauthorized; no merge or deployment.

## Materials for ChatGPT

- [Eight proposed screening scenarios](avery-director-stage-one-scenarios-review.md).
- [Exact model-visible instructions, schema, contexts, inputs and hashes](avery-director-stage-one-scenarios-review.json).
- [Prior scenarios and all 16 prior sent contexts for novelty comparison](avery-director-stage-one-novelty-reference.json), excluding prior identities and grades.
- [Blinded result-packet templates](avery-director-stage-one-blinded-packets.json): eight scenarios x Candidate A/B/C, with original-response and actual-execution fields null because nothing has run.

The standalone review packets exclude model identities, Codex grades, cost/latency
signals and preferred candidates. Screening criteria are shared across candidates.
Original generated responses will be included verbatim when they exist. Future
packets must also contain actual tool/runner/verifier/persistence evidence and safe
validation feedback; no corrected/fabricated response may replace a model response.
No candidate-to-model mapping has been created or disclosed in these templates.

Independent reviewer response needed: per-scenario novelty/fairness findings,
classification of known regression overlap, required edits if any, and approval of
the exact frozen hashes below. Do not claim repeated development/regression examples
as independent competency proof. No independent review is presumed complete.

- Prompt SHA-256: `55e31473b4ec1addfaace65585cfcdd4646923da83b81d543f14835aec0c1d9f`
- Schema SHA-256: `c4d21982ca409bb5b0281006670ef9dbba451525feea27f8870e4b7580cd5596`
- All prepared scenario fixtures SHA-256: `0e20d529f0bef217a933adf859376879dd3708ec55442080cd095c39cef8a446`

The fixture hash covers the original 16-case artifact; only its eight `screen`
cases are proposed for Stage 1. No Stage 2 execution or confirmation outcomes exist.

## Completed security and budget checks

Two **free authenticated model-metadata GET requests** to api.openai.com returned
HTTP 200 for the exact approved model IDs, `gpt-6-luna` and `gpt-6.1-sol`.
These are availability IDs, **not returned generation snapshots or benchmark calls**.
The reusable development credential was read only from its existing owner-only
regular file, used in memory, never printed/committed/changed/deleted, and verified
unchanged with the same inode, owner and mode afterward. No production/preview
credential or customer record was accessed. Sanitized evidence:
`avery-director-stage-one-preflight.json`.

Official model documentation was refreshed and supports the prepared efforts and
rates. Proposed Stage 1 requests retain standard tier, store:false, no hosted tools,
20KB request envelope, 65,536 conservative input-token reservation and 2,400 total
output-token cap. Worst-case reservations remain **$2.8064256**: eight Luna low,
eight Luna medium and eight Sol high. This is below $3 with no cache discounts and
an input-plus-cache-write contingency. No dollars have actually been reserved for
inference or spent.

The existing `director-evaluation-budget.mjs` now includes a distinct Stage 1
reservation profile bound to the approved models, efforts and eight case IDs:

- 24 total attempts maximum, eight per configuration, no repeated configuration/case
  pair, no held-out B requests or silent model/effort substitution.
- Every attempt consumes its permanent conservative reservation, including failures;
  reject model changes, tools/history, premiums, excess input/output and corrupt totals.
- Exclusive ledger lock and atomic write/fsync persist the reservation before a
  future dispatcher sends a request. Concurrent execution refuses the second lock.
- A stale crash lock or unsettled/unknown charge refuses restart; no blind retry,
  ledger reset or reservation release. Known settled usage retains consumed cases.
- Validate provider usage and output bounds, count reasoning within output, and keep
  separately reported cache-write contingency in conservative estimates. Unknown
  usage halts evaluation and retains the full reservation.

These primitives were exercised offline, including simulated crash/restart and
concurrency. No paid runner was invoked. Before future dispatch, bind the reviewed
request hashes to the dispatcher and actual synthetic execution adapter, and exercise
that integration offline; never infer scenario approval from this preparation.

**94/94 targeted no-cost checks pass**, preserving the previous 83 and adding eight
budget/durability checks and three blinding/input-fidelity checks. Lint and application
TypeScript pass. Full suite: **2,406 total / 2,388 pass / same 18 failing names**,
tracked separately in #266. No production runtime, source prompt, capability registry,
scenario fixtures or dependency files changed.

The previously approved full npm audit found seven high development-tree alerts and
zero production-only findings; no compatible complete remediation was established.
Package/lockfile remain unchanged from that audited state. The unchanged security
build gate remains a release blocker. No new audit, package installation or gate waiver
is claimed during this preflight.

## Exact resumption point

Wait for ChatGPT's independent novelty/fairness review of the eight scenarios and
frozen hashes. If changes are required, prepare/re-freeze and validate them without
paid calls. Once review is complete, integrate/test the approved request hash and
reservation boundary with the existing provider/runner, run only Stage 1 within
**24 calls/$3**, preserve original responses, prepare blinded semantic packets for
ChatGPT, and publish measured results. The best-performing configuration cannot yet
be recommended without those results and independent grades. Stage 2, merging and
deployment remain outside authorization.
