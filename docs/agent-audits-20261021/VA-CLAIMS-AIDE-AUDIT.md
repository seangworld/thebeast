# VA Claims Aide audit — after Tutor audit

Source baseline498bfa974658f6a1ad4e68a5cd0a5e509201ac27. Audit only; no legal/medical advice, benefits determination, real claimant records, provider calls, database changes or new agent implementation.

## Actual product, not assumed missing functionality

The existing Veterans Claims workspace (`src/app/dashboard/health/veterans/VeteransClaimsWorkspace.tsx`) is a member-entered preparation organizer. It tracks issue/type/stage, evidence status/reference, notes, timeline, next action and draft statement. Stages such as submitted are explicitly self-reported. Evidence references do not upload or submit evidence. Deterministic `veteranClaims.ts` guidance identifies gaps and creates a statement from entered notes/placeholders; it is not an AI claims adjudicator or VA-synchronized status service.

`veteranClaimsPersistence.ts` obtains authenticated user, scopes reads/updates by owner, uses revision compare-and-set, and confirms saved row identity/revision. Canonical migration20260917153619 enables owner RLS, revokes anon access and uses auth.uid() in USING and WITH CHECK. These are inspected source definitions, not verification of the current hosted database policy. Existing8 local tests pass, including conflict/failure/sign-out behavior and statement preservation. No customer rows were read to test this.

AI veterans assistance already exists through **Taylor Health Advisor**, reached by veterans mode—not a separate registered VA Claims Aide model. HealthAdvisorWorkspace offers a selected saved-claim picker and explicit selected documents. Runtime route verifies claim ID and owner, marks the claim member-reported/unverified, and sets filingEnabled:false. Prior conversation remains available and the UI discloses that; do not imply changing a selected issue erases old conversation context.

`advisorDocuments.ts` can load up to2 explicitly selected active member-owned Health originals, with combined10MB limit rechecked after download, through authenticated Storage access. `healthFileInput` passes supported originals to the provider; this is materially more than an old pasted-text-only extraction assumption. It does not establish actual PDF comprehension/OCR accuracy. Taylor's existing source verification, veterans grounding and safety gates are reused; historical Taylor evidence remains in its own folders and ledgers, not regraded by this audit.

## Findings and limitations

- No autonomous filing, VA account access, representation or official eligibility/rating decision capability exists in this audited path. These are true boundaries, not TODOs to silently add.
- Organization and source-bound explanations are implemented; quality of individual medical/legal interpretations, decision-letter reading and causal theories is not established by organizer tests. No universal claims-competency certification follows from prior Taylor samples.
- Claim references and clinical diagnoses remain distinct. A saved claim is explicitly unverified member evidence. Preserve that separation and never promote a self-reported submitted stage to externally verified completion.
- Live owner/RLS/Storage enforcement, selected-document access, cross-issue history relevance, current official-source coverage, version/intake-equivalent policy dates and exact deadline calculations were not exercised. No source refresh or legal fact assertion was needed for this code audit.
- A separate VA Claims Aide identity was not found in professionalConfigs; the delivered assistance is Taylor's veterans specialization. Creating a parallel agent/provider is unnecessary absent a concrete product requirement. The existing enhancement roadmap Issue#263 remains planning, not proof of implemented adjudication/appeal filing.

## Smallest next action

Retain Taylor's existing veterans specialization and preparation organizer. Correct demonstrated defects with local fixtures if found; prioritize source-grounded interpretation, exact selected-claim/document provenance and clearly bounded drafting over adding a duplicate agent. A future separately scoped change should use existing auth/documents/runtime and mocked conflict/injection/unsupported-evidence cases. No paid evaluation, purchase or new service should be requested. This audit made no VA or Taylor source changes and does not authorize a release of unrelated new functionality.
