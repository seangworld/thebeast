# Consolidated research runtime and harness review

## Conclusion — option 2

**The current hosted agentic research approach cannot yet be validated reliably for this strict evaluation contract. Do not conduct another paid probe or assessment on it.** Recommend replacing its two opaque hosted web loops with application-controlled, fixed-count public-page retrieval and retained source contents, followed by text-only evidence extraction, contextual synthesis and final safety. Preserve the successful brief extraction and separate privacy review. This is a concrete replacement recommendation, not an implemented retriever or request for approval/spending.

This review establishes engineering behavior only. Jordan has not delivered a live end-to-end answer in the consolidated assessment; all 16 original criteria remain NOT TESTED. No modeled/mocked answer is a competency grade.

## Starting evidence and documented distinctions

Read-only replay input is `../consolidated-execution-20261021/call-accounting.json` from evidence commit **52b9bbd3**, specifically the fourth provider response, without editing its visible output, usage, statuses or tool items. The original full response remains private; its public copy omits only opaque encrypted reasoning. The replay compares the retained response exactly against the new temporary mock ledger. No historical ledger is opened for writing.

| Concept | Meaning / supported conclusion | Captured value |
| --- | --- | ---: |
| Emitted web-call items | Entries in `response.output`; includes unfinished attempts, not automatically executions or charges |5 |
| Completed actions | Items with status `completed`; execution observations, not independently reconciled billable units |4 |
| Completed search actions | Completed items whose action is `search`; one action can contain several query strings |3 |
| Completed page opens | Completed `open_page`; not a search action |1 |
| In-page find | Separate supported action type |0 |
| Unfinished item | Search item still `searching` inside a completed response; not proof it executed, was ignored or was billed |1 |
| Reported search meter | `tool_usage.web_search.num_requests`; provider-reported field, not an independently verified invoice |3 |
| `max_tool_calls` | API reference says maximum total built-in calls **processed**, with further attempts ignored; not documented as maximum emitted output-array length |4 |

Official documentation reviewed October 21, 2026:

- [Responses API reference](https://developers.openai.com/api/reference/go/resources/responses/methods/cancel): `Response.MaxToolCalls` documents a total processed-call maximum across built-in tools and ignored further attempts. The create-response page also exposes the parameter, but the accessible Go reference provides its descriptive contract. This is a provider-side control, not a locally dispatched permit for each tool action.
- [Web search guide](https://developers.openai.com/api/docs/guides/tools-web-search): distinguishes search, open_page and find_in_page actions; states search actions incur a tool-call cost. Search queries and cited/observed URLs are not themselves separate proven billable calls. Clickable citations remain required.
- [Pricing](https://developers.openai.com/api/docs/pricing): hosted web search $10 per1,000 calls plus search content tokens at model rates. It does not document the captured `tool_usage.web_search.num_requests` field as an invoice-authoritative reconciliation contract or explain unfinished items inside a completed response.

**Correction to the earlier interpretation:** five emitted items do not prove the provider processed five calls or violated its processed-call cap. Four completed actions plus a fifth unfinished attempt are consistent with the documented ignored-attempt behavior, but the response does not explicitly identify that last item as ignored. Neither choose the lower meter to settle nor assert five billable charges. No timeout, token exhaustion or outage is demonstrated in this discovery response.

The original guard was intentionally more conservative than the documented processed-action limit: it rejected emitted count5 against4. This review does **not** weaken that check or release its reservation. A post-response rejection protects further dispatch, but does not locally limit provider actions already undertaken. The existing full-context-times-possible-tool-steps reservation is a conservative model of hosted internals, not a documented aggregate-token ceiling across all internal search processing. We cannot turn it into a proven local hard bound by passing more mocks or increasing the reservation. The documented processed-call cap is useful; claiming no provider-side bound exists would also be incorrect.

## Entire remaining path reviewed

| Stage | Actual contract and limits | Finding / resolution |
| --- | --- | --- |
| Input safety | Private text; Low GPT5, output capped4,800 by eval guard,45s | Guard now requires explicit completed response status rather than accepting absent status. Unknown usage remains fully reserved. |
| Private brief | Strict provider JSON schema; Minimal GPT5;1,400 output/25s; request-scoped1–6 unique categories | Existing live private-stage success preserved. Target schema now matches prompt/runtime:0–2 targets (0 is clarification sentinel; runtime rejects it as usable brief). Runtime uniqueness and relevance unchanged. |
| Separate privacy | Medium, strict safe/unsafe/uncertain schema;1,400/25s; no public tools | Remains separate and gates every public call; context stays private. Unsafe/uncertain/invalid cannot authorize research. |
| Discovery | Medium; JSON-in-prompt, not strict provider schema;3,600/45s; at most4 requested web actions; only public brief | Exact captured response still halts. JSON parser plus target/range/observed-URL validation reject bad candidates; no source identity is established merely by discovery. |
| Source verification/extraction | Medium;3,600/45s; second4-action hosted loop; domain filters;4 identities/16 findings at runtime | Same tool ambiguity applies here. Completed tool-source URL membership and host checks prevent obvious fabricated/unconsulted URLs; identity/claim text is still model-assisted. Search-result URLs are not retained fetched-page bodies. An identity assertion can pass without an auditable first-party page snapshot. Empty/invalid findings fall back; missing target/category evidence is explicit. |
| Contextual synthesis | Medium; plain text,4,800/60s; actual private context plus only accepted findings/sources | No public tools or writes. No initial substantive answer for mandatory research. All deltas buffered; citation membership checked before final screen. Exact year/residency/applicability remains semantic work, not proven by URL membership. |
| Citations and final safety | Citation allowlist includes finding URLs and identity-proof URLs; final Low screen45s sees actual context/findings/source metadata | Foreign/missing citations are rejected; model screen instructed to match claims to finding URLs and use identity URLs only for identity. Not independent truth certification. Unsupported claims and unsafe outputs have mocked rejection coverage. Source-body absence limits meaningful audit of upstream extracted facts. |
| Delivery and evaluation |170s whole-turn deadline under180s route; per-stage maxima sum290s, not an additive allowance; no retries | Mock exposed a real bug: unknown final-screen usage could let a safe fallback reach observer before `guard.ready()` rejected completion. Fixed DEV adapter: withhold all text until settled and result persisted; preserve failed fallback under `undeliveredResults`, never `results`. |

No timeout/token ceilings increased, no model substitutions and no scope expansion. Ordinary application drafting/Tutor/capacity behavior remains covered. Discovery/verification intentionally use runtime JSON validation rather than unsupported provider schema+tool assumptions; malformed output is not repaired. Scope/identity/claim extraction remains fallible even when JSON is valid.

Guard tightening also rejects non-text/multimodal input, unknown web-tool options, nonzero image-tool meters, unknown provider meters, unpriced output types, unfinished/unknown tool actions and absent completion status. Captured zero-valued image meter is diagnostic only and does not create a charge. The guard still reserves all allowed search fees for a settled tool request, never discounts from the lower search meter. No historical settlement was recomputed or edited.

## Recorded/mocked end-to-end verification

`node --test scripts/test-guidance-evaluation-budget.mjs scripts/test-guidance-research-contract.mjs`

The new replay suite runs with a synthetic key and replaces **all** transport. It uses actual recorded first-three private responses and the unchanged recorded discovery response for the exact-failure path. Separate clearly authored compliant responses test the rest of the runtime, not live model quality. No network/provider call occurs in these tests.

- Exact response:5 emitted /4 completed /3 completed searches /1 page open /1 unfinished; lower reported3 cannot settle. Full$2.576 reservation retained in a temporary test ledger; no verification/synthesis/delivery.
- Compliant mock: input→brief→privacy→discovery→identity/evidence verification→private contextual synthesis→final safety→delivered answer. Seven reservations settled, result durable before observer receives text, source metadata retained. No initial full-answer planning call.
- Verification missing usage, failed terminal event or abrupt stream end: full reservation retained, no synthesis/delivery.
- Source unavailability or forged unrelated proof: no synthesis; only evidence-unavailable fallback after known final-screen settlement. No false substantive success.
- Incomplete/missing-usage synthesis: no delivery or completed turn.
- Foreign citation: unsupported answer replaced; final safety still runs.
- Missing-usage final screen: no observer output or completed result; undelivered fallback evidence retained, full reservation held.
- Unsafe final screen: unsafe candidate suppressed; known safety fallback is not graded as correct research.
- Unknown completion status, unpriced meters/modalities/options or unfinished/unsupported tool actions: fail closed even below item ceiling.
- Existing school comparison/intake correction/credential/FSA/private-context/citation, ordinary guidance, capacity, drafting and Tutor tests remain passing. These are transport/control tests, not authored PASS grades.

See `verification.json` for final counts. The new replay suite has no dependency on reading real credentials, real accounts or mutable private ledgers.

## Concrete simplification recommendation

Replace **only the two public hosted web loops**, retaining current privacy, safety, private-context and ordinary guidance infrastructure:

1. Resolve public targets to a small reviewed official-source catalog or explicit publicly supplied source URLs. Source catalog stores identity/URLs, not expected answers; do not inject grading facts or silently change original prompts. For unresolved identities, request clarification rather than invent domains or declare eligibility.
2. Application controls a finite retrieval queue: e.g. maximum4 public pages, explicit per-page15s/64KiB and total192KiB/deadline bounds. No paid search vendor, hidden model tools, automatic retry or unbounded recursive link following. Reject private/local addresses at DNS and every redirect, credentials/tokenized URLs, unsupported content types and oversized responses. Fail clearly on403 or unsupported PDFs rather than bypassing challenges.
3. Preserve original/effective URLs, HTTP status, retrieval time, effective source dates, exact extracted public text and SHA256. Explicitly flag truncation/unsupported content. Do not call a search-result snippet verified page content.
4. Send retained bounded text to tool-free evidence extraction with explicit output limit. Require quotations/locations against source text and target/year applicability. Keep identity and claim support separate; preserve conflicting/missing evidence. Contextual synthesis and final safety consume that same retained evidence. No arbitrary source instruction reaches actions or private public queries.
5. Bound each paid request as text-only known model/context/output, include cache-write/tier pricing where applicable, reserve before dispatch, and keep unknown calls at full maximum. Local retrieval has zero paid tool charges. Six model stages can reuse the current ones: input, brief, privacy, evidence extraction, synthesis, output screen. A fresh full-flow DEV assessment is appropriate only after the replacement and its no-cost failure/cap/security checks exist; no further isolated paid probes.

Those numerical retrieval ceilings are implementation design targets, **not** an approved dispatch manifest or certification of all requested source availability. PDF-only/catalog403 and unpublished intake/fee data remain explicit evidence limitations. The replacement has not been implemented in this review. No new paid manifest or approval request is issued.

## Preservation and boundaries

`preservation.json` verifies all six original private ledger hashes and balances, historical published integrity maps and Taylor receipts unchanged. **$4.25159388 retained**, including **$4.152 unresolved reservations**; settled conservative estimates$0.09959388. No invoice claim, retroactive settlement, retry/restart, fresh evaluation ledger, provider metadata check or paid inference during review. Frozen original prompts, criteria and actual histories unchanged.

Old executable manifests pin earlier source/harness hashes and are no longer compatible with the changed candidate; they must not be reused. No new execution authority is inferred from unused budget. No production records, real member data, merge or deployment.
