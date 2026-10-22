# Riley Chen — bounded Tutor reliability release

Date: October 22, 2026. Executor review, not independent certification or a new competency assessment. Baseline: current main `9f1cbe1295e5d9d7c8e9ebb67e013d963b48f1e2`; existing PR #275 audit findings reconfirmed against that source. No VA application changes, model migration, new service/framework, paid calls or real learner fixtures.

## Demonstrated defects corrected

- One shared 150-second Tutor provider-work deadline and caller cancellation cover the two semantic checks, worksheet extraction (if any), teaching and context reads. Each generation/transcription call also has a45-second deadline. The route's host allowance is180 seconds; remaining time is never reset between calls. Text ordinarily uses3 calls, image uses4, with no loops/retries/tools. The total route budget may stop an image turn before every stage can consume its individual allowance. Auth and entitlement retain their existing server checks before any model work.
- Chat Completions uses `max_completion_tokens`: worksheet2,000 and teaching3,000; semantic Responses checks use `max_output_tokens`1,200 each. The adapter also rejects bodies over96,000bytes and transcriptions over8,000characters. A finite limit is not a promise that every possible worksheet fits. Provider documentation: [Chat completion contract](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
- Only `finish_reason=stop`, nonempty content and a valid required Tutor envelope can become a teaching response. Truncation, filtering, refusal, missing terminal reason, malformed/disconnected bodies, deadline or cancellation stop that path without another dispatch. Reported usage is retained even when output is incomplete; missing/invalid usage staysnull/unknown. Bounded receipts contain stage, model identifier, terminal reason, outcome, latency and numeric usage only. No learner identity, academic content, image, filename or answer text is logged.
- Completion telemetry is emitted only after the validated HTTP reply is prepared. Input/output safety failure, provider error and cancellation are failed outcomes, including when a protective fallback is returned. A `completed` event is not proof of client receipt, persistence, learning or independent teaching correctness.
- The client sends an AbortSignal, aborts on unmount, offers an accessible Stop tutoring button and prevents overlapping dispatch while cancelling. The4,000-character composer limit now agrees with the server. A stopped question may remain in its private session; no automatic retry or manufactured answer is saved.

## Final checker and privacy

The checker receives the same bounded/sanitized private teaching-history slice used by generation and the ephemeral worksheet transcription. These are necessary to compare a latest correction against prior work and avoid grading unseen work from candidate prose alone. They are explicitly untrusted evidence. No extra profile, contact data, birthday, raw image, filename or unrelated product data is added. Evidence is confined to the existing private provider request, excluded from analytics/client response and not persisted as a separate transcription. Extraction is instructed to omit nonacademic identifiers; this is an instruction, not a claim of perfect model redaction.

The final checker cannot independently prove the transcription matches the original image because it does not see that image. Unknown/blurry work must remain insufficient evidence. No public search, school integration, institutional grading or new authority is added. Owner-scoped queries/RLS and entitlement checks remain; supported Supabase [abortSignal](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal) is attached to the existing private context reads. Local fake-query fixtures verify the route contract; no hosted member records were queried by these tests.

Cancellation is best-effort for upstream work already accepted; it is not a refund guarantee. Unknown usage is never recorded as zero or used to reconcile any historical ledger.

## Historical binding and role-specific L3 review

Preserve the original **7/7 accepted source turns on08/30/2026**, its original result, strengths and assessment date. Source: [BF-AGT-016-PROD-EVAL-001](https://github.com/seangworld/beastfusion/blob/7437aed/evidence/member-ai/BF-AGT-016-PROD-EVAL-001.json), SHA256 `79f69aa4e768154522c13eb54b4839d9ccacbb938045213d5d6178e0ae31128b`, application commit `c24dd3e1c83903aabf1557edfdde66754e4720ca`.

That record reports22 gpt-5.6-luna and3 gpt-5 returned models across all25 specialist turns. It does not bind individual Tutor turns to one of those model IDs. Historical and current source both resolve `OPENAI_LEARNING_MODEL || gpt-4.1-mini` with transcription temperature0 / teaching0.4; no model setting or credential is changed here. The historical fallback is not proof of which environment override ran. Since the historical candidate, Tutor alternate-method prompting, contextual presentation/style/mastery inputs, and now runtime limits/checker evidence have changed. Current hosted effective model values were not extracted from secrets; the alias/configuration cannot be equated to an immutable tested snapshot.

| Role-specific L3 requirement | Evidence-supported conclusion |
| --- | --- |
| Contextual shown-work review and learner corrections | Historical strength; current private evidence plumbing demonstrated locally. Current semantic accuracy unverified. |
| First supported error, equivalent methods, one correction step and targeted practice | Historical7/7 addresses these behaviors at its bound candidate; no fresh current-model PASS. |
| Insufficient-evidence, academic integrity and privacy boundaries | Historical boundary evidence and retained deterministic protections; current visual judgment and live safety performance not newly certified. |
| Bounded work, cancellation and incomplete-response handling | Actual adapter/route mechanics verified with offline fixtures. |
| Truthful completion and learner control | Final-outcome telemetry/cancellation verified locally; not proof of learning or receipt. |

**Release the useful bounded guided-tutoring capability; do not claim full current L3 certification.** L3 is Riley's role requirement. Current demonstrated/released numeric mapping stays pending because changed behavior cannot inherit the historical score. Knight L2 remains a separate framework. The dossier's Last evaluated remains08/30; code review and Dossier updated are10/22.

## Operating cost and deferred work

This engineering/release work makes zero paid inference/metadata calls and creates no new service cost. Engineering labor is not priced. Future per-turn input/image usage and the effective hosted model are not established, so no actual per-objective price is invented. As a conditional illustration only, official [gpt-4.1-mini pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini) is$0.40/M input and$1.60/M output:4,000 input plus1,000 output tokens cost$0.0032; a four-call output ceiling of7,400 tokens alone would cost at most$0.01184 in output at that rate, excluding input/image processing. This is not a whole-turn dollar cap or evidence the hosted configuration uses that model.

Deferred: reconcile any already-existing per-turn model/config receipts; review legitimate teaching feedback and original academic evidence locally, including transcription uncertainty. No new paid assessment cycle is proposed. Broad subject accuracy, live image transcription, hosted cancellation/client persistence and the current model's teaching competence remain explicitly unverified. No new institutional authority should be added to close a competency gap.

## Verification and release

Node's existing test runner exercises bounded calls; caller/deadline abort; cancellation between stages; malformed/refused/empty/oversized/disconnected/incomplete output; known/unknown usage; private checker inputs; semantic failure/cancellation; final telemetry; lease cleanup. Existing Tutor context, alternate-method, age/privacy, conversation and scrolling checks are retained. Local fixture answers are authored test data, not model performance evidence.

Full audit/build, regression suite, TypeScript/lint, responsive fixture results, exact release SHA/deployment and access verification are appended to PR #275 and the SW HQ tracking issue after completion. The prior audit is retained unchanged as historical evidence. No hosted owner walkthrough or new agent assessment is inferred from a build or deployment.

### Completed local verification

- Clean install from unchanged current-main lockfile; full security audit zero vulnerabilities; 22 maintained-fork checks PASS; required `npm run build` PASS on Next15.5.28.
- Full application suite2,569 PASS; maintenance guard2 PASS; TypeScript and lint PASS. Existing success fixtures were updated to include actual provider terminal metadata; rejection expectations were not relaxed.
- Actual TutorWorkspace in an isolated browser fixture at1440px and390px: Stop aborts the request; no automatic retry or answer persistence;4,000-character input bound; no horizontal overflow. Avatar/auth/repository are synthetic fixture substitutes; all HTTP traffic blocked. This is not a hosted owner walkthrough or real model response.
- Dossier source/history completion check against main PASS; historical assessment snapshot unchanged; no historical ledger files touched.
