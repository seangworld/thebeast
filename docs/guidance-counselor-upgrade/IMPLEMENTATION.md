# Guidance Counselor — specific official-source research

Tracking issue: https://github.com/seangworld/thebeast/issues/272 · Draft PR: https://github.com/seangworld/thebeast/pull/273

## Current candidate

The first candidate repaired privacy by restricting research to fixed general topics. Sean correctly identified that this was inadequate for a Guidance Counselor. This revision replaces that restriction with specific institution, program and credential discovery. No fixed school or certification-issuer list is required.

For a researched GC turn:

1. A **private brief compiler** selects public organization/program names, an explicitly requested institution region, public intake/exam version, and requested requirement categories from the authorized conversation/context. At most two targets and six categories per turn. It must not infer home location or send personal contact details, grades, finances, health, benefit status or private history.
2. A **separate private privacy/intent review** compares the brief with the original context. Unsafe, uncertain, ambiguous, malformed, empty or oversized briefs stop before public research. Local structural checks reject direct identifiers, URLs and instruction-shaped labels. Semantic privacy decisions remain model-assisted, not a mathematical proof that every possible identifier is excluded.
3. **Public discovery** searches for official institution or credential-issuer pages and directory evidence using only the approved brief. No personal context or raw model query is supplied. Candidate URLs must occur in completed provider web-tool source traces, not just model-written prose. At most four candidates.
4. A **separate source-verification and evidence retrieval call** independently revisits candidates. Search is limited to candidate hosts plus relevant government directories. It must verify institution/campus or issuer identity and retrieve requested requirements with source dates and applicability. A plausible domain or .edu suffix alone is insufficient. Identity and finding URLs must occur in this second call's completed tool traces; finding hosts must match an accepted target-bound identity. Query-string public directory identifiers are supported; tokenized/private account URLs, credentials, non-HTTPS URLs and unsafe hosts are rejected.
5. **Private contextual synthesis** applies accepted findings to the learner's full saved context. Missing target/category results remain explicitly unverified. Final output passes the existing deterministic and semantic checks before streaming. Only citations used in the delivered answer appear in its source list.

The application makes no direct HTTP requests to model-supplied websites. Only the provider's public web tool performs source discovery/retrieval. No new service, credentials, database schema or persistent source allowlist is added. Other specialists retain their existing research paths.

## What verification means

The application deterministically checks structured brief shape, source provenance in tool traces, HTTPS/host boundaries, target indices, citation membership and incomplete evidence. Source ownership and semantic fact interpretation are checked by a separate model call using new web retrieval. This is not human verification, institutional certification, or protection against every compromised official page. Separate calls use the configured GC model, not a claimed independent human or different model. Test fixtures verify mechanics; they do not establish live model quality.

Specific prerequisites, tuition/fee inclusions, deadlines, accreditation, exam versions, renewal and funding questions are now supported by the implementation. Unknown campus, intake, residency, dates, fee scope or conflicting evidence must stay visible. Partial findings can be used without inventing missing requirements. Admission, transfer-credit, benefit or funding eligibility is not guaranteed.

## Bounded execution and cost

No retries or background loops. Four research stages: two private calls capped at 1,400 output tokens/25 seconds each; two public calls capped at four tool calls and 3,600 output tokens/45 seconds each. The existing 170-second route deadline still applies across the turn. Research adds private synthesis, and ordinary nonresearch turns do not use the discovery stages. A normal successful researched turn is eight provider calls including input/output safety and initial planning. Actual latency, truncation behavior, source quality and billing remain unmeasured until an owner-approved live assessment. Caps are limits, not performance promises.

## Verification

Six focused mocked-provider tests passed: public brief validation; provider-source provenance and identity binding; a full specific-college runtime including private constraints; privacy uncertainty stopping before search; a credential issuer outside the fixed government list; and a full-runtime evidence failure withholding the initial unsupported answer. Fixtures also cover spoofed hosts, missing identity proof, failed tool calls, query-string directory links, missing deadlines, and exam-version applicability.

Final full suite: **2,523/2,523 passed**, zero skipped. Required security-gated production build passed, including lint/type checks and 221 generated pages. npm audit: zero vulnerabilities; maintained-braces checks: 22/22 passed. git diff --check passed. Mixed profile-plus-research requests and record-only reads were checked to prevent unnecessary or skipped retrieval. No live application inference, member-data changes, migration, merge or production deployment occurred during this revision.

API behavior reference: https://developers.openai.com/api/docs/guides/tools-web-search — domain filtering and `include: ["web_search_call.action.sources"]`, checked October 20, 2026. Tool-source provenance is deliberately distinct from inline citation assertions.

## Remaining assessment

Update the role-specific evaluation to exercise real specific-school and credential research, disambiguation, public-query privacy, lookalike/reseller rejection, conflicting dates and partial evidence. Do not grade honest fallback as successful research when the source is actually available. Full education document/roadmap access remains a separate audit finding; this patch does not add read adapters. The August 30 six-turn assessment remains historical. Paid DEV execution, merge and production release retain their separate approval boundaries.
