# Taylor: personalized health and veterans assistance

## Changes

- Expanded professional instructions: warm, member-specific support; adapt to priorities, constraints, emotional tone and requested depth. Avoid canned reassurance, flattery, repeated disclaimers and unnecessary referrals. Do not pretend to have human experience or unlimited memory.
- Veterans assistance method: dated timelines, stated decision reasons and favorable findings, evidence comparisons and conflicts, complete truthful drafts, concrete next steps. No filing, submission, representation, invented nexus or guaranteed rating.
- Strong reasoning tier for veterans work and original-document review; deterministic research for VA requirements and review/rating/deadline questions. Adds official eCFR to permitted sources.
- Health research now has a private synthesis step that receives member context and retrieved evidence after the de-identified web search. The generic research answer no longer replaces the personalized answer. Existing output safety review still applies.
- Explicit document selection in Health Advisor sends up to two member-owned active Health originals (PDF/PNG/JPEG/WebP, combined 10 MB) with each message while selected. The authenticated server downloads files; the client supplies IDs only. No public URLs, filing tools, new storage tables or automatic profile writes. Original files are not forwarded to web search. Unsupported/unavailable files fail without pretending they were read.
- Health conversation context increased to 32 recent messages and 16 memories, retains structured conversation state, up to 200 saved records plus selected claim. Includes saved record notes. This is bounded context, not exhaustive retrieval or lifelong memory.
- Allows a longer bounded request for document/research work and retains a matching per-member Health request lease. The extra synthesis uses one additional model call only on researched Health turns. Other ordinary advisor turns keep existing behavior.

## Validation

36 focused tests passed: contextual research integration with mocked model responses, private-context separation from web search, strong routing, expanded continuity, document access filters and missing-row refusal, invalid IDs/types/size limits, plus existing answer-first, routing and security suites. Changed-file ESLint and TypeScript passed. Read-only development database query confirmed the document projection.

No local OpenAI runtime key is configured, so live model answer quality was not tested. Tests establish integration behavior, not equivalence to ChatGPT or Grok. Signed-in browser and actual PDF interpretation remain unverified. No schema migration is required.

## Release confirmation

Production build passed. PR #142 merged as 7744502654cb4df848122ead17dbb92016719bd1. Vercel deployment dpl_78fW1HjdNkdgnKrEXyRfs5kHAXc7 is READY with thebeast.seangworld.com assigned and no alias error. Unauthenticated production POST to /api/digital-staff/runtime returned 401 Authentication required. This verifies deployment and the unauthenticated boundary, not live answer quality.
