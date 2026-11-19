# BeastMarketing Command Center — redesign plan
Status: Design and implementation kickoff. No production changes authorized.

## Objective
Make the owner-facing workflow dramatically simpler while improving measurable customer acquisition. Preserve existing records, owner-only controls, and all publishing/spending interlocks.

## Existing-state findings (screenshots, 2026-11-18)
- Overview prioritizes technical provider states, counts and section navigation over actionable work.
- Advertising requires manual campaign, asset, evidence, preview, distribution and outcome entry.
- Video Growth exposes internal render manifests, retries, acceptance tests and superseded revisions.
- Social currently offers manual Facebook/X/Instagram composition, drafts, tracked links and handoff; direct publishing is paused. Reddit is absent from the displayed UI.
- Email is a foundation/placeholder, not an active delivery channel.
- Analytics shows old operating-cycle evidence and unavailable search evidence; do not infer measured conversions.
- Facebook Professional Mode analytics on the owner's personal profile are not generally accessible through standard Meta Page Insights APIs.

## Proposed owner workflow
1. Choose an existing product from a verified catalog (initial focus: Philippines book).
2. Review discovered public opportunities, with source URLs, relevance, restrictions and confidence clearly distinguished from verified outcomes.
3. Generate channel-specific posts/replies and media previews from approved product facts.
4. Edit and explicitly approve exact content; publish only through authorized supported provider paths, otherwise copy/open a manual handoff.
5. Track tagged visits and verified conversions; distinguish imported/estimated data from direct evidence.

## Interface
- Home: today's opportunities, needs review, active campaigns, and measurable outcomes.
- Discover: sources and relevance, Reddit community rules and no spam automation.
- Create & Review: single streamlined queue and previews.
- Results: channel attribution, costs, verified sales/registrations, data gaps.
- Advanced: existing advertising/video controls, diagnostics, audit history, provider settings.
- Mobile-friendly primary actions; no giant required forms for routine work.

## Integration constraints
- Do not scrape private Facebook dashboards or bypass Meta platform restrictions. Support optional owner-supplied CSV/export/manual metric entry, with provenance.
- Meta Page/Instagram business analytics only with validated provider permissions; personal Professional Mode analytics should not be represented as API-connected.
- Reddit/X/Meta publishing and discovery require platform-specific feasibility and policy review.
- Preserve existing credentials boundaries, access controls, audit logs and global publishing pause.
- No auto-posting, spending, new credentials, migrations or production changes in this phase.

## Delivery sequence
Phase 0: inspect current routes, models, auth, provider state, test coverage, and data migrations; document risks.
Phase 1: implement consolidated owner dashboard and product catalog using existing read-only records; maintain old routes.
Phase 2: streamlined content creation and exact-copy approval flow.
Phase 3: public opportunity discovery with evidence and platform-specific restrictions.
Phase 4: tracked attribution and personal Facebook dashboard import.
Phase 5: supported direct publishing integrations, only after separate authorization and provider verification.

## Acceptance criteria
- Owner can start a draft from a product in no more than three primary interactions.
- Routine workflows do not expose manifests, raw evidence URLs, or superseded test records.
- No loss of existing campaigns/assets/history.
- Unavailable data is explicitly unavailable, not zero.
- Existing publishing pause and authorization gates remain enforced.
- Mobile usability and accessibility verified.
- Tests, production build and security checks pass before merge; release requires explicit owner approval.
