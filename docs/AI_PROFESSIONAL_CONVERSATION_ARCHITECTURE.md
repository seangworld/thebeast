# AI Professional conversation identity

Beast uses one shared conversation presentation for every member-facing AI Professional. Domain modules continue to own reasoning, recommendations, safety rules, persistence, and permissions; the shared layer owns identity and message presentation only.

## Registry

`src/lib/digitalStaff.ts` is the canonical professional registry. Each member-facing entry supplies a stable ID and canonical ID, display name, role and title, module/team association, and versioned portrait assets.

`src/app/components/agents/ProfessionalConversationIdentity.tsx` projects those entries into `professionalConversationRegistry`. The projection adds conversation accent metadata, accessible avatar descriptions, and professional-specific fallback initials. Money Coach, Guidance Counselor, and Health Advisor are registered through this path. Unknown IDs fail closed instead of borrowing another professional’s identity.

To add a future professional:

1. Add the complete professional to `digitalProfessionalRegistry` with a unique stable and canonical ID.
2. Add the versioned portrait and avatar asset under `public/digital-staff/` and reference it from the portrait metadata.
3. Associate the professional with its product team. Known teams receive their product accent; new teams safely use the neutral presentation until an accent is registered.
4. Resolve the identity with `getProfessionalConversationIdentity` and pass it to the shared conversation timeline.
5. Add tests proving the new identity cannot leak into another professional’s conversation.

## Shared message architecture

`ProfessionalConversationWorkspace` owns the responsive history/content layout. `ProfessionalConversationTimeline` owns message authorship, avatar placement, names and roles, timestamps, streaming state, scrolling, wrapping, and focus when the active thread changes. `ProfessionalConversationComposer` standardizes the input surface.

Modules provide `AgentConversationMessage` values and their registered `professionalIdentity`. Stored, reloaded, resumed, opening, system-generated, and streaming professional messages all render through the same timeline. Member messages remain visually and semantically distinct.

Selecting **New conversation** remains module-owned because each module owns its repository and conversation ID. Every implementation must create a new repository thread, clear only the active message list, preserve history, and pass the new thread ID to the shared timeline. The timeline moves screen-reader and keyboard focus to the Conversation heading when that ID changes.

## Avatar requirements

- Every professional message uses the registered avatar, name, and role.
- Avatar containers have a useful accessible description; the image itself is decorative to avoid duplicate announcements.
- A missing or failed image renders the registered professional’s initials, never a blank or broken image.
- Avatars remain fixed-size and non-shrinking while message content uses bounded, wrapping containers.
- Portrait files are versioned application assets; runtime modules must not substitute another professional’s image.

## Boundaries

The shared components do not change conversation ownership, RLS, durable memory, recommendation logic, financial calculations, education or career reasoning, Health Advisor medical safeguards, or module navigation.

## BF-AGT-014 member-specialist context and safety contract

Guidance Counselor, Money Coach, Health Advisor, and AI Tutor reuse one
capability-assessment and context-boundary architecture. The server derives the
professional purpose, age band (never raw birthday), entitlement decision,
allowed data domains and tools, provenance, freshness, and explicit
completeness/truncation before invoking a specialist. Client-provided text may
not change identity, age, entitlement, canonical records, or authority.

Canonical Product Truth and current owner-scoped records have precedence.
Current member corrections are surfaced as pending confirmation and cannot
silently replace canonical data. Current-agent memory is contextual evidence
only and never overrides canonical records. A specialist receives only its own
memory and conversation; another specialist's sensitive context is not copied.

Guidance Counselor may direct a learner to Tutor through an allowlisted
navigation-only handoff. The target route rechecks entitlement and receives no
copied conversation, memory, or sensitive record context. Money Coach directs
members to existing BeastMoney surfaces rather than performing financial
actions. Health Advisor's future Fitness Trainer extension is explicitly
unavailable with handoff and data transfer disabled.

Member-specialist input passes deterministic screening and a separate,
tool-less semantic verification call before primary generation. Generated and
researched responses remain buffered, pass deterministic validation, and then
receive an independent semantic verification of the actual final prose. The
generating model's response contract is defense-in-depth, not self-approval.
Unsafe, uncertain, malformed, or unavailable verification produces a bounded
deterministic replacement before any member-visible output. The safety layers
reject protected-instruction extraction, financial execution claims, false
professional claims, diagnosis or medication-change direction, missing health
emergency escalation, dishonest Tutor completion, unsupported image-reading
claims, and incomplete Homework Check/Review behavior.

The verifier uses the already-authorized provider and model policy with
`store: false`, receives only the minimum member text, candidate response,
specialist boundary, and routed learning intent, and has no tools or execution
authority. It never receives canonical records, conversation history, uploaded
image bytes, credentials, or cross-specialist context.

Runtime JSON and NDJSON responses are private and no-store. First-party Outcome
telemetry records only the governed started/completed/failed event taxonomy,
specialist ID, result, route class, error category, and latency bucket. It does
not store prompts, responses, homework, financial values, health content, or
member identity.
