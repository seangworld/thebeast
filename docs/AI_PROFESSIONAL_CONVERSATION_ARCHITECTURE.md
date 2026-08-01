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
