# AP-100 — AI-Native Digital Staff Runtime

## Status

AP-100A introduces the shared server-side semantic runtime and marks the legacy per-professional semantic engines as deprecated. Existing conversation tables, RLS, owner scoping, module records, deterministic calculations, safety policies, and AP-001 conversation surfaces remain authoritative. Production SQL is not required for this additive phase.

## Existing architecture audit

| Professional | Previous message lifecycle | Root cause | Disposition |
| --- | --- | --- | --- |
| Avery Stone | `DirectorExperience` → `/api/director/conversations` → owner-scoped record loaders → deterministic `buildDirectorRecommendation` → conversation rows | No model-led intent, continuity, tool planning, or structured knowledge layer | Preserve persistence/context loaders; bypass deterministic response builder |
| Money Coach | `MoneyCoachExperience` → client `answerMoneyCoachQuestion` → regex/branch intent and deterministic response document → browser/server conversation repository | A reply to the coach's question was reclassified without explicit conversational state; memory capture depended on keyword regex | Preserve canonical calculations, evidence, safety, and repository; retire client semantic branching and regex memory extraction |
| Guidance Counselor | `GuidanceCounselorConversation` → `learnFromDiscoveryTurn` and `buildGuidanceCounselorConversationTurn` → direct profile-item writes → repository | Scripted discovery chose follow-ups, duplicated response framing, and reduced natural statements to verbatim label/value items | Preserve education records and approval/owner boundaries; bypass discovery and response templates; replace direct extraction with structured proposals |
| Health Advisor | `HealthAdvisorWorkspace` → `/api/health/advisor` → owner-scoped evidence selection → mandatory provider-specific consent → separate model/research response | Questions could enter discovery extraction; health entities were stored as blobs; research was a permanent provider UI mode rather than a planned capability | Preserve medical scope, evidence allowlist, owner scoping, and citations; consolidate reasoning/research into shared runtime |

## Shared flow

`Member message → authenticated owner-scoped API → professional configuration → explicit conversation state → recent history + relevant memory + structured records → model plan → server validation → optional tools/research/handoff → structured proposals → natural response`

The model owns ordinary semantic understanding. Deterministic code owns authentication, owner checks, tool allowlists, schemas, navigation validation, approval requirements, professional scope, research domains, calculations, provenance, and safe failure.

## Professional configuration

All four professionals use `ProfessionalConfig`. It defines canonical identity, mission, scope, prohibited actions, tools, accessible data domains, research sources, handoffs, tone, workspaces, and approval-gated actions. Registering future Digital Staff requires configuration and tools, not a new conversation engine.

## Context, memory, and continuity

`ConversationState` explicitly records topic, workspace, last professional question, unresolved questions, corrections, approvals, goal, and decisions. The runtime receives only recent conversation turns and bounded relevant memory. Raw chat is evidence; it never outranks module records.

## Structured knowledge

The model emits separate proposals for each entity. Proposals include domain, entity type, structured fields, source message, confidence, missing fields, contradictions, approval state, related record, and proposed action. Server validation rejects proposals from clarification questions, proposals not tied to the current message, and proposals that attempt to skip approval. No AP-100A code writes proposals into authoritative module tables.

## Tools and approvals

Each tool call is checked against the professional's allowlist. Malformed, out-of-scope, or unknown calls are rejected before execution. Record updates and other consequential operations remain approval-gated. Canonical BeastMoney engines remain the only source for deterministic financial calculations.

## Product expertise

Navigation answers use the existing module registry plus explicit professional workspaces. Unknown or hallucinated routes are rejected. Product-support questions can return a validated internal route such as `/dashboard/education/education-planning`.

## Research and privacy

Research is a runtime decision, not a permanent provider-specific conversation mode. Queries are minimum-necessary and de-identified, and requested domains are intersected with professional policy. Provider names belong in transparency documentation, not ordinary capability copy. Source execution and attributable claim persistence remain follow-on integration work; uncited claims must not be presented as researched facts.

## Safety, handoffs, and observability

Health cannot diagnose, prescribe, or direct medication changes. Money preserves existing high-impact financial boundaries. Education cannot guarantee outcomes. Avery cannot bypass specialist scope. Handoffs are allowed only to configured professionals and carry a reason; conversation and proposal provenance remains attached to the source IDs.

The runtime result exposes model, latency, validation failures, tools, research, handoff, and proposal counts without exposing raw prompts or unrelated private records. A production event sink for BeastAdmin is deferred until its retention and privacy policy is approved.

## Deprecated layers

The following remain readable for compatibility but are no longer the target semantic architecture: Money Coach `answerMoneyCoachQuestion`, Guidance Counselor discovery/question sequencing and response templates, Health discovery blob extraction, and Director deterministic response generation. UI cutover must use `/api/digital-staff/runtime`; delete legacy functions only after preserved conversation replay and release verification.

## AP-100B

AP-100B converts all four live message paths to the shared runtime. Authoritative professional prompts now harden continuity, product-support classification, structured extraction, tone, research, and professional scope. The shared route loads bounded owner-scoped records and memories, validates routes/tools/proposals/handoffs, performs de-identified allowlisted research when planned, persists both turns plus runtime provenance, and stores explicit continuity state in the existing conversation summary.

Legacy semantic functions remain in the repository only for saved-response compatibility and non-live regression evidence. They are no longer called by the active Money Coach, Guidance Counselor, Health Advisor, or Director message paths. The legacy `/api/health/advisor` route remains temporarily available for compatibility but is not called by the Health Advisor workspace.

Structured proposals are durable inside the source assistant message, including source message ID, confidence, contradictions, missing fields, approval state, and proposed action. The owner-scoped runtime route exposes explicit Accept/Reject decisions; Accept validates provenance and writes structured records through existing contracts (`beast_health_records`, `education_career_profile_items`, or `beast_goals`), while Reject is recorded without a write. Health, Education, and Money writes remain behind the existing authorization/RLS boundaries. No schema change or production SQL is required for this conversion.

Operational metadata is limited to professional, model, latency, tool names, research citations, handoff, proposal metadata, and validation failures stored with the owner-scoped conversation. Raw prompts, secrets, and unrelated member records are not exposed to normal members.
