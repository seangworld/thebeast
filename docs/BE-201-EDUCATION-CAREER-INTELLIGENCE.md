# BE-201 — Education and Career Intelligence

## Product definition

BeastEducation is the member’s personalized education and career planning system. Its primary relationship is the Guidance Counselor. The active product understands the member’s past and present, clarifies goals, identifies gaps, researches credible current options, compares paths, and maintains a realistic member-approved roadmap.

There is no separate active BeastLearning product. BeastEducation now includes the released Riley Chen AI Tutor and Homework Helper for guided explanations, assignment help, homework review, examples, practice questions, and short quizzes. Riley supports the current learning plan; the Guidance Counselor remains responsible for education and career direction. The older course catalog, lesson engine, diagnostic-placement, mastery-progression, generalized instructional-content generation, and learning-game systems remain on hold. Historical records and compatibility routes are preserved without presenting those deferred systems as active capabilities.

## Guidance Counselor responsibilities

The Guidance Counselor conducts gradual conversations, uses saved conversation and profile evidence, avoids repeating answered questions, distinguishes facts from interpretations, identifies the highest-value missing context, explains tradeoffs, proposes goals and roadmap changes, and follows up on member-reported outcomes. It provides informational planning support and never guarantees admission, employment, promotion, compensation, eligibility, licensure, or certification.

Authoritative goals and material roadmap changes require member approval. The counselor must state when a requirement needs confirmation from an employer, school, certification body, licensing authority, HR office, or government agency.

## Education and Career Profile

`education_profiles` remains the conversational discovery summary. `education_career_profile_items` is the normalized Past, Present, and Goals record used by forms, document approvals, and conversation synchronization.

Each normalized item includes:

- owner, phase, category, label, and value;
- source type and source reference;
- verification status and confidence;
- relevant date, created date, updated date, and optional structured detail;
- an archive marker for non-destructive retention where appropriate.

Members can view, add, edit, correct, and remove records. Conversation-derived records are synchronized by stable source references so repeated conversations update rather than duplicate the same profile area.

## Understanding model

The existing shared `ProfessionalKnowledgeWorkspace` remains the three-column presentation:

- What I Know contains member-reported or verified profile evidence.
- What I Think contains clearly labeled working hypotheses, their evidence, explanation, and confidence.
- What I Still Need contains prioritized actions that launch a targeted Guidance Counselor conversation.

Direct profile forms and conversation update the same normalized planning profile. Hypotheses never become facts without confirmation.

## Gap analysis

Goal requirements are classified as required, preferred, helpful, unknown, or already possessed. Matching profile evidence can classify a requirement as possessed, but the UI still requires confirmation that the evidence satisfies the current authority’s rule. Missing or stale sources result in unknown, not certainty.

Analysis may cover education, credentials, licenses, skills, experience, application readiness, time, cost, geography, and dependencies. Employer-, institution-, jurisdiction-, and date-specific requirements retain those limitations.

## Path comparison

`education_career_paths` stores multiple candidate routes and comparison factors for fit, education, credentials, experience, time, cost, scheduling, geography, remote availability, income potential, advancement, and risk. Source, effective date, retrieval date, jurisdiction, confidence, and limitations stay attached to the path.

Paths with missing or stale source evidence are labeled “needs research.” A strongest path is an evidenced comparison result, never a guaranteed outcome; viable alternatives remain visible.

## Roadmap lifecycle

`education_career_roadmaps` and `education_career_roadmap_steps` provide an ordered, versioned plan linked to Beast Goals and optional shared goal milestones.

Lifecycle: draft → active ↔ paused → completed or archived. Archived plans may be restored as drafts. Members can reorder steps and record time, cost, target dates, dependencies, evidence, risks, status, and progress.

Material counselor proposals—destination changes, preferred-path changes, step removal, material cost increases, or timeline extensions—remain in `pending_material_change` until the member approves them. Approval advances the version. No autonomous goal or roadmap mutation is permitted.

## Current research and sourcing

`POST /api/education/research` requires an authenticated Beast member and explicit consent for each question. The endpoint sends only the bounded question, uses current web search, disables provider storage, and never loads or transmits private profile, employment, military, salary, goal, document, roadmap, or conversation records.

Research prefers primary or authoritative sources. Results display attributable links, publisher, retrieval date, primary/secondary status, and limitations. Publication/effective date and jurisdiction are included when a source provides them. Missing provider configuration, missing citations, or provider failure produces an explicit unavailable result rather than an uncited or stale answer.

## Document approval workflow

`POST /api/education/documents/:documentId/extract` requires authentication, document ownership, explicit consent, and owner-supplied text. Versioned SHA-256 fingerprints prevent duplicate processing. The current extractor is local and deterministic; it recognizes explicitly labeled education and career facts without sending document contents to an external service.

Extraction results remain proposals. Members may accept, reject, edit through the profile after acceptance, or merge through `approve_education_career_document_item`. Approval is an owner-scoped transaction that preserves the source document, extraction, excerpt, confidence, and review evidence. No extraction automatically becomes authoritative.

## Outcome history

`education_career_outcomes` is owner-scoped and append-only to members. It records considered paths, recommendations, decisions, goals, roadmaps, applications, enrollments, credentials, interviews, offers, promotions, rejections, deferrals, changes in direction, and reflections. Later guidance may learn from the history but cannot rewrite it.

## Privacy and security

All BE-201 tables enable RLS and use `auth.uid() = owner_id`. Compound owner foreign keys prevent cross-owner links between paths, goals, roadmaps, steps, document proposals, and outcomes. No public analytics or advertising surface receives private planning information.

The migration is additive. It does not modify or delete historical `learning_*` records. Rollback should remove only the new BE-201 tables and approval function after exporting any member-created planning records; it must not remove `education_profiles`, Beast Goals, Beast Documents, conversations, memory, or historical learning data.

## Migration and release boundary

Schema file: `20260801000600_add_education_career_intelligence.sql`.

Local implementation does not apply production SQL. Production release requires the normal migration dry run, isolated migration review, explicit release approval, and production verification. Unrelated migration-history drift must not be replayed or repaired as part of BE-201.
