# AP-104 — Historical Digital Staff Knowledge Reconciliation

## Dependency and scope

AP-104 extends the released AP-100 runtime in commits `b1a70c1`, `7b7755e`, and `60f5f6f`. It does not create a second extraction engine. The shared professional configurations, prompts, runtime validation, proposal contract, approval boundary, canonical writers, and navigation remain authoritative.

AP-104 performs no automatic canonical writes. It never updates or deletes a historical conversation message. Historical conversation remains immutable evidence and never becomes authoritative merely because it was processed.

## Historical-data audit

The repository currently stores Digital Staff history in owner-scoped `agent_conversations` and `agent_conversation_messages`. `agent_memories` stores professional memory with conversation/message provenance. Older Education discovery data can exist in `education_profiles`, including `discovery_answers`, career, military, employment, certification, preference, constraint, and free-context fields. Health onboarding state exists in `beast_health_discovery`; confirmed Health context and older conversation-shaped details exist in `beast_health_records`. Money conversations can contain priorities, assumptions, preferences, decisions, and outcomes, while debts, bills, accounts, payments, balances, and calculations remain canonical outside chat. Avery summaries and memories can contain cross-module priorities and dependencies.

AP-100 proposals already persist inside assistant message runtime metadata and are written only after review through `applyApprovedKnowledgeProposal`. Before AP-104, that decision route only reviewed the latest assistant message and had no historical cursor, deterministic reconciliation identity, canonical comparison, conflict classification, or pause/resume controls.

The audit is schema-and-code based. AP-104 does not use a service-role credential to inspect production member content and does not alter production data during implementation or testing.

## Architecture

The reusable pipeline is:

`historical owner message → AP-100 runtime in historical_reconciliation mode → validated structured proposals → canonical comparison → duplicate/conflict classification → owner review → existing canonical writer → retained provenance`

One dedicated owner/professional reconciliation conversation stores AP-104 state in the existing `agent_conversations.summary.ap104Reconciliation` object. Bounded result batches are stored as new assistant messages in that reconciliation conversation. Source conversations and messages remain unchanged.

The four professional boundaries remain distinct:

- Avery Stone extracts cross-module priorities, preferences, decisions, dependencies, and outcomes. Health, Education/Career, and Money facts route to those canonical domains; Avery-owned whole-member priorities use Beast Goals.
- Money Coach extracts goals, priorities, preferences, approved assumptions, rejected paths, outcomes, and unresolved questions. Mentions of transactions, accounts, bills, debts, balances, or calculations do not supersede canonical BeastMoney records.
- Guidance Counselor separates schools, degrees, completion, credits, certifications, military, employment, skills, interests, preferences, constraints, goals, decisions, rejected paths, and outcomes into distinct proposals.
- Health Advisor separates medications, supplements, allergies, conditions, procedures, providers, measurements, family history, vaccinations, appointments, treatments, and outcomes while retaining medical safety boundaries.

## Batching, cost, and failure recovery

Each professional captures a start-time high-water mark and processes at most four historical member messages per request. Conversation and professional boundaries are preserved. Internet research is disabled in historical reconciliation mode. The member explicitly starts each professional and can process the next batch, pause, resume, or skip.

The cursor advances only after the deterministic result batch is durable. A failed model or persistence request records a failure and leaves the batch resumable. Batch message IDs and proposal IDs derive from professional, source conversation/message, entity type, domain, fields, and offset. Retrying the same batch therefore does not create another proposal.

## Deduplication, conflicts, and stale information

Before presenting a proposal, AP-104 compares normalized entity identity, record type, structured fields, dates, and existing pending reconciliation proposals with canonical records. Exact supported matches are counted and ignored. A probable match with insufficient overlapping detail becomes a Merge review. A matching entity with differing structured values becomes a conflict and includes both historical and canonical values.

AP-104 never silently merges or overwrites. Conflict and merge candidates require the owner to choose Merge, optionally after editing fields. A new unmatched item can be Accepted. Any item can be Rejected.

Historical language and timestamps classify proposals as Current, Historical, Unknown current status, or Needs confirmation. Missing dosage, frequency, dates, prescriber, credential, status, or other meaningful fields remain missing; they are not invented. Approval remains the member's explicit confirmation.

## Review and professional understanding

The Digital Staff hub links to a shared reconciliation workspace. Findings are grouped by domain and provide Accept, Edit, Reject, and Merge controls. Bulk acceptance is server-limited to unmatched create proposals with confidence of at least 0.90, no missing fields, and no contradictions. Reconciliation is never required to continue normal AP-100 conversations.

Accepted records flow into the existing canonical Health, Education/Career, BeastMoney/Beast Goals, or Avery/Beast Goals contract. Those records then feed existing What I Know models. Reconciled entity and field keys are retained in summary state so derived What I Still Need models can suppress questions already answered historically; interpretations remain separate from facts and require confirmation before becoming canonical.

## Provenance and privacy

Every review proposal retains professional ID, source conversation ID, source message ID, original timestamp, reconciliation timestamp, confidence, approval status, candidate record ID, and eventual canonical record ID. Original text is retained only in the original owner-scoped conversation, not copied into operational telemetry.

All reads and writes use the authenticated user ID and existing owner-scoped RLS. Reconciliation conversation IDs include the owner and professional. The pipeline rejects mixed-owner or mixed-professional batches. Household information is not used as an alternate identity or scope. External research receives no historical archive.

Operational visibility exposes only professional, status, timestamps, and counts for conversations scanned, messages scanned, proposals, duplicates, conflicts, decisions, failures, and completion. Raw prompts and private conversation content are excluded.

## Migration status

No AP-104 migration is required. The implementation reuses `agent_conversations.summary`, `agent_conversation_messages.content`, `agent_memories`, AP-100 proposals, and existing canonical tables with owner-scoped RLS. No production SQL or unrelated migration reconciliation is part of AP-104.
