# BO-503 — Digital Staff Director

## Existing-system audit

BO-503 restores the existing `fusion-director` professional. It does not create
a second Director, registry, hierarchy, conversation store, memory store, or
routing platform.

The retained identity is:

- Stable ID: `fusion-director`
- Canonical ID: `beastfusion.fusion-director`
- Name: Avery Stone
- Portrait: `/digital-staff/fusion-director.webp`
- Existing profile route: `/dashboard/digital-staff/fusion-director`

Before restoration, `src/lib/digitalStaff.ts` still contained the profile,
portrait, responsibilities, and all three specialist relationships. The
member-facing registry filtered the record out as `internal-only`, all three
specialists reported directly to the owner, and the profile route therefore
returned not found. Digital Staff navigation remained available, but no
member-facing Director destination or conversation entry existed.

The existing `agent_conversations`, `agent_conversation_messages`, and
`agent_memories` tables already provide owner-scoped conversation and memory
persistence with RLS. BO-503 reuses them unchanged. Existing Director rows that
use `beastfusion.fusion-director` remain addressable.

## Hierarchy

The canonical member registry now models:

```text
Digital Staff Director (Avery Stone)
├── Money Coach (Morgan Reed)
├── Guidance Counselor (Jordan Ellis)
└── Health Advisor (Taylor Brooks)
```

Every professional registers `reportsToId`, assigned modules, capabilities,
boundaries, status, activity copy, profile route, and conversation route. A
future professional joins by adding one registry entry with
`reportsToId: "fusion-director"`; the hierarchy does not need a redesign.

## Responsibilities and routing

The Director chooses one cross-module priority and identifies the right next
professional or workspace. Detailed finance questions route to Money Coach,
education and career questions route to Guidance Counselor, and health
questions route to Health Advisor. Questions involving multiple areas preserve
each specialist's contribution and identify timing, cost, priority, or safety
conflicts.

The member experience uses plain language. Internal concepts such as model
delegation, context graphs, and prompt routing are not displayed.

## Approved context and provenance

The Director route authenticates the member, then reads only owner-scoped,
minimum-necessary summary fields from Goals, debt records, health records,
education roadmaps, document metadata, and saved specialist conversation
summaries. RLS and explicit owner filters remain in force.

Every specialist contribution includes:

- contributing professional;
- supporting goal, record, or saved summary;
- source and date;
- confidence;
- important limitation;
- destination workspace.

Unavailable sources are reported as unavailable. Raw document contents,
medical details, tokens, prompts, private reasoning, and administrative
telemetry are not returned to the member surface.

## Safety boundaries

The Director cannot diagnose, prescribe, change medication, provide
individualized investment or tax advice, guarantee education or employment
outcomes, override specialist safety rules, present assumptions as facts,
modify authoritative records without approval, or expose another household
member's information.

Specialist routes remain authoritative for detailed guidance. The Director
coordinates; it does not impersonate them.

## Conversation behavior

`/dashboard/director` uses the AP-001 shared professional identity, avatar,
message timeline, responsive history drawer, and conversation composer. New
Conversation creates a separate persisted thread. Prior threads can be resumed
without merging their messages. Escape closes the mobile history drawer and
focus returns to its trigger.

## Data and rollback

No migration is required. BO-503 changes application registry, routing,
presentation, and deterministic coordination logic only. Rolling back the
application leaves existing Director conversations and memory intact because
the shared persistence schema and identifiers are unchanged.
