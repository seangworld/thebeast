# Jordan — no-cost stream diagnostics and planning-state remediation

Issue272 / draft PR273. No paid inference, metadata provider requests, retry, restart, new live grade, merge or deployment. Halted run `gc-20261021-pr273-assessment-v2`, original evidence and accounting remain immutable: **$0.05162867 conservative settled +$0.514 full unknown reservation =$0.56562867**. Private ledger SHA256 remains `5dbbc8d18328d520c8070a681cd84c50bea5dc6781f117405b0f9005774abe2c`.

## Diagnosed facts versus uncertainty

The original adapter only recognized `response.completed`; it did not retain `response.incomplete`, `response.failed`, streamed `error`, incomplete terminal details, usage on noncompleted events or partial stream diagnostics. That is a demonstrated observability gap. The old brief call ended without a recognized completed payload at21.851s, before its25s deadline. The retained evidence **does not identify the event or cause**. Nothing proves a timeout, token exhaustion or provider outage; this remediation cannot reconstruct that lost evidence.

The [official streaming-event contract](https://developers.openai.com/api/reference/resources/responses/streaming-events) distinguishes completed, incomplete, failed and error events. The revised adapter recognizes them separately, supports CRLF and chunked/multiline SSE framing, and rejects malformed/unterminated streams. It preserves bounded terminal-event JSON, any reported usage, partial output, recent event types/count, HTTP status/provider request reference and bounded error name/message/unparsed tail. Truncation is explicit. Reader cleanup does not retry the request.

Diagnostics are sent only through the explicitly registered private evaluation reservation sink. No request Authorization headers, key values or diagnostic model text are added to global logs. Normal UI errors remain generic; raw diagnostics may contain synthetic/member text and must remain private unless independently reviewed for export. The terminal JSON is capped at262,144 characters, partial text16,384, tail4,096 and event-type list64; frame buffering is bounded. Reported usage is separately retained even when terminal capture is truncated. This is diagnostic evidence, not an invoice or a guarantee every transport failure has a provider payload.

**Fail-closed accounting remains:** only a completed response with verified model/tier/token/tool usage may settle. Incomplete, failed, explicit-error or disconnected streams stop and retain the entire reservation, even if they report some usage. Reported partial usage is evidence for later reconciliation, not permission to release the maximum or retry. A completed payload lacking valid usage also halts. No extra inference to diagnose the prior call.

## Capacity correction

See [same-executor review](REVIEW.md). The original two-hour reply fits the request; not overwriting the saved four-hour profile was appropriate. The demonstrated issue is competing allocation in returned conversational goal state, not an unauthorized database change or proven failure of the current two-hour plan.

Added a narrow guidance-only layer for explicit first-person hour constraints. It carries the latest genuine member wording into private planning context and conversational corrections, removes a competing weekly-hour allocation from the conversational goal summary, and retains the purpose/budget. It does not infer duration, change a saved profile, mutate original records, or rewrite delivered model prose. Assistant suggestions/conditional examples do not establish member capacity. Returned conversational state carries the constraint into follow-ups without needing a profile edit.

Professional instructions now require using the latest limit for current planning and clarifying temporary versus ongoing availability only when it materially changes a recurring commitment. The deterministic recognizer is not a general natural-language interpreter: limited English hour statements are covered; other phrasings still rely on the model. Historical saved-record truth remains visible separately. These no-cost fixes are **not fresh model-verified**, and no historical grade was upgraded.

## No-cost verification

- **2,532/2,532 application tests PASS**, zero skips/failures, freshly compiled runtime.
- **18/18 GC guard/integration tests PASS**, including actual provider adapter with mocked completed/incomplete/failed/error/disconnected/missing-usage streams, preserved usage/diagnostics and full unknown reservation; no retries.
- Tests also cover exact delta/CRLF/chunk handling, malformed/truncated frames, bounded diagnostics; real original capacity wording with saved records left unchanged, latest member priority, assistant/hypothetical exclusion, follow-up state and non-GC scope.
- Separate-run cumulative cost checks retain the prior halted balance. Future metadata attempts are durably counted once and a failed check stops before inference; tests use mocked fetch only.
- Lint, sequential TypeScript and required security-gated build PASS; full audit zero vulnerabilities;22 maintained-braces checks PASS. No weakened gate. Fixture-only verifier confirms both historical packet hashes and unchanged24 criteria. It explicitly does not certify the old application source unchanged: the authorized remediation changes source. Old frozen manifests are historical and cannot approve the new candidate.

## Proposed next assessment — approval required

A **new separate** run, not a retry/resume, is proposed: eight unchanged original turns in five families — GC01T1/T2 for the capacity fix; GC04T1; GC05T1/T2/T3; GC06T1; GC07T1. Do not repay for GC02/03 already completed. This covers19 original selected-family criteria; previous results stay separate. New families start fresh, and follow-ups use actual new replies/state, not old or authored answers. No novel/held-out generalization is claimed from reused fixtures.

**Proposed new cap $9.43, maximum64 inference attempts plus2 fresh free metadata checks (66 new direct requests), no retries/restart/additional cycle.** Expected44 inference calls if only the four explicit research turns research. Combined with the prior run: at most82 inference/86 direct requests and **$9.99562867 accounted** under a conservative original$10 aggregate, including the unchanged$0.514 unknown reservation. This arithmetic is not new spending authorization. The prior settled estimate and unknown reservation remain separate from new charges.

Models/routing and output/tool/time ceilings remain as previously disclosed: Luna Medium ordinary; GPT5 Medium main/private/public/synthesis and semantic Low;4,800 general output,1,400 private and3,600 public output; four web actions/request;170s turn and25/45/60s streaming phase limits. No assumption the old failure was caused by any ceiling, and no unverified ceiling increase. A new incomplete result may still occur; diagnostics improve observability, not proven model reliability.

Per-call maximum reservations remain GPT5$0.548 ordinary/$0.514 private/$2.576 public; Luna$0.587004/$0.580272/$2.934628. Whole44-call artificial maximum sum is$40.532048; the actual$9.43 guard stops before a next reservation crosses the cap. Completion of all eight turns is not guaranteed. Actual cost/latency is unmeasured for this candidate. Pricing expires October23,2026 at04:00UTC (midnight EDT); expiry requires reviewed refresh/refreeze before execution. Model visibility must be freshly checked only under the new approved protocol.

The exact candidate, original fixture/rubric/source hashes, selected turns, compiled/script fingerprints, prior-ledger SHA/balance and approval gate are frozen in the adjacent proposed manifest after the source commit. A separate private approval receipt matching that manifest/new run ID is required before any provider transport. No new ledger/approval receipt or real metadata request was created here. No paid call is authorized by this report.

Remaining limitations: prior cause/usage unresolved; corrections not model-retested; independent review pending; source catalog/prerequisite, Fall2027 fee/cutoff and regional exam-price gaps remain; full education-document/roadmap access and hosted integration remain outside scope. Keep draft. Owner may review the fix and accept/decline this one concrete proposal; do not spend unused funds automatically.
