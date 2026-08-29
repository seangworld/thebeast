# BeastEducation AI Tutor

## Purpose

The BeastEducation AI Tutor is a persistent Digital Staff professional for understanding schoolwork and learning. Riley Chen teaches concepts, guides homework reasoning, reviews work a learner has already attempted, and creates practice. The Guidance Counselor remains responsible for education and career direction and planning.

## Member experience

- Route: `/dashboard/education/tutor`
- Digital Staff profile: `/dashboard/digital-staff/tutor`
- Inputs: typed questions and an optional JPEG, PNG, or WebP homework image up to 8 MB.
- Conversations: text requests and Tutor answers use the existing owner-scoped `agent_conversations` and `agent_conversation_messages` infrastructure.
- Images: image bytes are sent only in the active authenticated AI request. They are not inserted into Tutor conversation history.

The Tutor uses the existing guided-reasoning-first homework policy. It should ask for or inspect the learner's attempt, identify the first supported mistake, distinguish conceptual and mechanical errors when evidence permits, and guide correction. It must not pretend unreadable content was inspected, guarantee grades, or replace a teacher or official answer key.

## Privacy and security

- The learning AI route requires a current authenticated Supabase user.
- Responses use `Cache-Control: private, no-store`.
- Image MIME type, data-URL identity, and approximate decoded size are validated server-side.
- Supported image types are JPEG, PNG, and WebP; the maximum request image is 8 MB.
- Existing owner-scoped conversation RLS remains authoritative; no schema or RLS change is introduced.
- Minor access is limited to BeastEducation Guidance Counselor and Tutor professionals; unrelated professional access remains closed.
- No student content is added to analytics. Approved events capture only aggregate workflow categories and status.

## Product completeness

BE-301 integrates Tutor with BeastEducation navigation, mobile/shared module navigation, Digital Staff, professional profile identity, portrait, Director reporting, Relationship Center, BeastAdmin ecosystem visualization, contextual guided onboarding, user-facing release notes, version identity, documentation, and aggregate Outcome-ready events.

Outcome evaluation should use an appropriate post-release window and aggregate evidence for Tutor workspace visits, conversations started, tutoring workflows completed, and repeat usage. It must not collect assignment text or image contents.

## Operational boundaries

- Existing `OPENAI_API_KEY` and `OPENAI_LEARNING_MODEL` configuration are reused. No credential or provider activation is part of BE-301.
- If OpenAI is not configured or temporarily unavailable, the route returns an explicit bounded unavailable/error response.
- The Tutor cannot modify school records or claim a submitted assignment is officially graded.
- No database migration, backfill, storage bucket, paid provider, money movement, or external school integration is required.
