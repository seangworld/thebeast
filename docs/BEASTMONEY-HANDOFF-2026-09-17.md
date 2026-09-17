# BeastMoney continuation — September 17, 2026

## Verified baseline
Repository: seangworld/thebeast, main at 5bdecd0.
Paycheck Strategy already includes 30/60/90/180-day windows, due dates, compact assignment selectors, and strategy-based extra-debt suggestions. Earlier conversational TODO overstated these as unfinished.

## This change
Desktop drag handles move bills and debt minimums between paycheck buckets or back to unassigned. Existing selectors remain available for mobile and keyboard use. All writes use existing owner-scoped assignment callbacks. Pending writes lock assignment controls; thrown failures display a refresh/retry message and release the lock. No automatic strategy changes or payment execution.

## Verification
TypeScript application check and test compilation passed. Six focused tests passed, including rendered drag/drop single-write and network-failure recovery. Component ESLint and git diff whitespace check passed. Authenticated browser and production verification have not been performed.

## Payoff scenario continuation
Implemented locally on `feat/beastmoney-payoff-scenarios`:
- What-if comparison on Payoff Plan: current page settings vs snowball, avalanche, and editable custom priority order.
- Extra monthly and upfront cash inputs; payoff month, interest, total paid, signed months/interest saved. Incomplete projections do not claim comparable savings.
- Reuses the unified strategy engine. Upfront payments appear as month 0 entries and are included exactly once in total paid; excess cash is not silently spent. Monthly payment capacity freed by a lump sum is retained.
- Fixed unused monthly extra after a target debt payoff: it now flows to the next eligible debt in the same month.
- Selected scenario shows upfront and first-month per-debt amounts plus a link to Paycheck Strategy. These are monthly projections, not automatic per-paycheck allocations or an affordability assessment.
- Explicit copy for snowball/avalanche populates the existing settings form only. Existing save remains a separate user action. Lump sums are never recorded as actual payments.
- Custom order can now be explicitly copied to the settings form and saved through the shared owner-authenticated writer, once the additive database migration is installed. No scenario automatically overwrites saved settings or manual income-date assignments.

Verification: application TypeScript check, test compilation, changed-file ESLint, and whitespace check passed. 92 focused finance/calculation/rendered-DOM tests passed, covering original debt/payment/cash/Velocity behavior and new scenario controls. No authenticated writes were performed.

## Custom-order activation continuation
- Added canonical `custom` strategy plus shared parsing, ordering, and target selection. Missing, paid-off, excluded, and archived debts are skipped; new eligible IDs follow saved priorities in stable order across screens.
- Wired order through Payoff Plan, Cash Flow projection and reload, paycheck suggestions, Money dashboard decisions, forecasts, and insights. General Money Settings preserves the saved order and links to its editor.
- Added shared save helper: validates input, gets the authenticated owner, writes only debt_settings, and verifies the returned strategy/amount/order before success. Standard strategy saves do not clear custom order. Missing-schema and ambiguous-network outcomes are explicit failures, not success messages.
- Prepared additive migration `supabase/migrations/20260917140138_add_custom_debt_order.sql` using the CLI. Adds non-null text-array order with size/null-element checks; existing owner-scoped RLS is unchanged. CLI emitted a telemetry shutdown timeout after successfully creating the file.
- Updated verification: **148 focused tests pass**, application TypeScript and test compilation pass, all changed TypeScript/TSX files pass ESLint, and git whitespace check passes. Save tests use a mocked authenticated client; schema tests inspect SQL, not a running database.
- **Migration has NOT been applied to application tables.** No local Postgres runtime is installed. See the rollback-only development verification below. No persistent database schema, user settings, payments, or financial records were changed remotely.
- Supabase current changelog, upsert documentation, and RLS documentation reviewed. Sources: https://supabase.com/changelog.md ; https://supabase.com/docs/reference/javascript/upsert ; https://supabase.com/docs/guides/database/postgres/row-level-security .

Browser verification is BLOCKED: agent-browser is absent; Playwright Chromium is absent; browser installation failed with CDN timeouts and HTTP 502. No browser screenshot, responsive layout verification, or authenticated end-to-end verification is claimed. Component interactions were tested in JSDOM only.

## Remaining scope
- Browser/phone verification once Chromium or an approved browser connection is available.
- Verify the application/API flow against the migrated development database, then complete browser/mobile checks. Production migration/deployment requires separate authorization.
- Saved/printable scenarios and direct per-paycheck extra-payment allocation remain follow-up work.

## Development verification follow-up
- Connected Supabase project discovery confirmed `the-beast-dev` (`zvzcojwjgnedrouilovc`) separately from production `thebeast` (`grpyzwvgqiwtxadfdtni`).
- Read-only development schema inspection confirmed the expected settings columns, primary/unique/foreign-key constraints, enabled RLS, and owner predicate `auth.uid() = user_id` for both access and writes. No strategy check constraint exists there.
- Repository-prescribed CLI link was attempted with the explicit development project ref. It failed with `LegacyPlatformAuthRequiredError` (no CLI access token). No migration push or alternate persistent migration was attempted.
- Through the already connected Supabase integration, an isolated transaction created a settings-table clone in `beastmoney_validation_20260917`, added the proposed column/check, recreated the observed owner policy, and exercised it under the authenticated role with synthetic UUIDs. The transaction was rolled back.
- SQL assertions passed: custom-order owner upsert/readback, denial of cross-owner selection/update/insertion, denial of owner reassignment, rejection of null order elements and arrays over 1,000 elements.
- A separate follow-up query confirmed `validation_schema_removed = true` and `application_table_unchanged = true`.
- This verifies SQL/RLS on an isolated development clone, not an installed migration or a browser-to-API flow. It does not certify production schema parity.
- Browser capability recheck: no browser connector is exposed and the Chromium cache remains empty. The control-browser skill package could not be loaded. Prior failed browser-download evidence still applies.
- Full `npm run build` passed: compiled successfully, lint/type validation passed, generated all 197 static pages, finalized optimization and build traces. This is build verification, not browser verification.

## Release
Paycheck update was published as draft PR #134 (remote commit c0364ec). The newer scenario and custom-order continuations are local only on `feat/beastmoney-payoff-scenarios`. Neither change has been merged or deployed in this work. Production deployment requires Sean's authorization.

## Authorized development migration applied
- Sean explicitly authorized applying the tested migration through the connected Supabase integration instead of the unauthenticated CLI.
- Applied `add_custom_debt_order` only to `the-beast-dev` (`zvzcojwjgnedrouilovc`); tool returned success.
- Read-back verified text-array column, NOT NULL, empty-array default, size/null-element constraint, enabled RLS, and unchanged owner access/write predicates.
- Supabase recorded version `20260917140138`. Renamed the unapplied local file from its original CLI-generated `20260917133126` prefix to the verified remote version so a later CLI push will not replay the same change. No remote migration-history repair was performed.
- This supersedes earlier statements that the development application table is unchanged or the migration remains unapplied. Production remains unchanged; application code is still local-only beyond draft PR #134.
- Remaining: browser/mobile and authenticated API save/reload verification, then separately authorized publication/deployment.
