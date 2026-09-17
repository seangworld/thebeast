# BeastHealth Veterans Claims

Requested by Sean after the BeastMoney release. First usable release adds `/dashboard/health/veterans`, a shared navigation entry, and an Overview card.

## Behavior
- One issue per saved claim: type, member-reported stage, manually chosen follow-up date, service context, impact notes, dated timeline, next action, and editable personal-statement working draft.
- Evidence tracker records status and source/location references. It does not upload or submit evidence; existing Health Documents remains available.
- VA Claims Guide supplies selected-route preparation, missing tracker items and questions for clinicians/accredited representatives. It is deterministic guidance, not a new LLM agent; no new paid provider calls or pricing changes.
- Statement draft reproduces member notes with explicit missing-fact placeholders. No diagnosis, medical nexus opinion, rating prediction, invented evidence, automated deadline calculation, VA synchronization or automatic filing.
- Claims are separate from `beast_health_records`, so claim allegations are not promoted to clinical facts or Health Advisor memory.
- Save authenticates the member, filters updates by owner and matching revision, reads back the saved row, and preserves edits on failure. Claim selection is locked while unsaved edits exist. Stable client-generated IDs prevent uncertain creation retries from silently making a second claim.

## Database and release
- New `public.beast_veteran_claims` table with owner FK, validation constraints, revision, and timestamps. Authenticated-only owner RLS applies to reads and writes, including owner reassignment; anonymous table privileges revoked.
- CLI migration creation used the repository tool. CLI link failed because no CLI access token was configured. The already authorized connected Supabase workflow applied the reviewed additive migration.
- Development version/local filename: `20260917153619_add_veterans_claims_workspace.sql`; production connector version: `20260917153847`. Both represent the same SQL. Do not replay either or automatically repair migration history. Reconcile mapping before future CLI migration pushes.
- Both environments verified table, enabled RLS, owner USING/WITH CHECK, authenticated privileges, and no anonymous read privilege.
- Rollback-only development clone assertions verified owner read/update, denied cross-owner access/write and owner reassignment. Confirmed temporary test schema removed. Development security advisor returned no finding mentioning the new table.
- Eight new domain/persistence tests and fourteen existing health/navigation tests passed. TypeScript and changed-file ESLint passed. Initial full build passed with 198 pages; final build rerun includes the Overview entry.
- Authenticated browser save/reload and mobile visual inspection have not been performed. Workspace is limited to 200 saved issues and surfaces an explicit error above that limit.

## Official sources reviewed September 17, 2026
- https://www.va.gov/disability/how-to-file-claim/evidence-needed/
- https://www.va.gov/decision-reviews/supplemental-claim/
- https://www.va.gov/decision-reviews/
- https://www.va.gov/resources/va-claim-exam/
- https://www.va.gov/get-help-from-accredited-representative/
- https://www.va.gov/claim-or-appeal-status/

Follow current VA guidance and the member's decision notice for requirements/deadlines. No personal health details were included in source lookups.
