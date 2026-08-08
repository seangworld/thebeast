# AP-105 Digital Staff Response Experience

## Request lifecycle

The shared runtime records request acceptance, authentication, parallel conversation/memory/structured-record retrieval, context assembly, initial model work, first model output, optional research, source validation, persistence, and completion. Logs contain a generated request ID, professional ID, and numeric durations only. They never include prompts, member messages, records, provider payloads, or credentials.

The client requests `application/x-ndjson`. The route first acknowledges the accepted member message, then emits only stages entered by the runtime, safe response deltas, and one durable completion payload. Errors retain the SEC-002 generic message and correlation ID.

## Activity states

The shared states are Sending, Thinking, Checking Beast information, Checking current sources, Comparing current sources, Preparing the answer, Updating the conversation, and Complete. Sending ends at server acknowledgment. Research and source-validation states originate from the actual research branch; they are not timer-driven or inferred in the UI.

All specialist screens optimistically render the member message. A failed turn remains visible with a retry action. The retry replaces the failed optimistic turn instead of adding another visible member message; canonical user and professional messages are still inserted together only after a successful runtime result, preserving the existing no-partial-write behavior.

## Streaming architecture

OpenAI Responses API server-sent events are decoded by the SEC-002 provider wrapper. Research answer text is forwarded as it arrives. The first model request remains a strict JSON-schema plan because tool selection, proposals, scope, and research policy must be validated before the result is authoritative. For non-research turns, the validated response is emitted immediately after plan validation. Proposals, citations, provenance, and persistence settle in the final event and remain the durable conversation contract.

## Research policy

Research remains model-led within each professional's allowlisted domains. Deterministic boundaries require research only when a message combines a freshness or authority request with an external authority topic appropriate to the professional, such as OPM requirements, IRS limits, or FDA medication guidance. References to the member's current medications, debts, goals, records, plan, or priorities do not independently trigger external research. Queries remain minimum-necessary and de-identified; sources, retrieval dates, limitations, and professional safety boundaries are preserved.

## Context and concurrency

Independent history, memory, and structured-record reads remain concurrent. Structured writes remain ordered. Normal turns now send at most eight recent messages, eight relevant memories, and twenty structured records. Deterministic product-navigation questions retain four recent messages and omit unrelated memory and structured records entirely.

## Timeouts and targets

The interface never uses Sending to represent a whole model turn. Long turns retain truthful activity. Provider or stream failures use the generic SEC-002 error, keep the optimistic member message, and offer retry without exposing provider details.

Targets remain: immediate optimistic member display; acknowledgment and visible activity within one second where practical; first useful content in one to three seconds; and ordinary completion within ten to fifteen seconds. Research-heavy turns may exceed those targets. Compliance is based on recorded live timings, never UI timers.

## Measurement

`RuntimeResult.timings` reports total, context assembly, initial model, first model output, research, source validation, and persistence durations. Authentication and context-load durations are included in the server lifecycle log. Production latency must be re-measured with authenticated member conversations after deployment; local API-key connectivity alone does not represent database, browser-rendering, or end-to-end production latency.

The reported pre-change production baseline was approximately 30–60 seconds with no intermediate content. The runtime model remains `OPENAI_DIGITAL_STAFF_MODEL` when configured and otherwise `gpt-5`; AP-105 does not change it. On 2026-08-08, a controlled member-data-free streamed request using that local configuration returned HTTP 200 with first response bytes at 0.555 seconds and completion at 1.122 seconds. This validates provider streaming connectivity only, not the authenticated Beast lifecycle or answer-quality targets.
