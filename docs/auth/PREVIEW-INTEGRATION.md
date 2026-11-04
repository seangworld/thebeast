# Canonical authentication application Preview

Scope: finish the existing shared username gateway and UI on the existing canonical
BeastOS account system. Production migration 20261103235724 is already installed;
this work executes no schema migrations, trigger changes, SMTP changes, or BeastGuide
identity cutover. Production application promotion requires separate owner approval.

## Application wiring

The existing shared UniversalAuth is mounted in the dedicated login/create-account
page and the existing public sign-in/registration dialog, behind the default-off
NEXT_PUBLIC_BEAST_UNIVERSAL_AUTH_ENABLED flag. Existing email/password, email-link
and provider flows remain available under an expandable existing-email section.
Successful username login performs a full same-origin navigation so the existing
Supabase SSR cookie/session implementation restores the new session consistently.

The existing profile Account section adds a username claim card. It verifies the
current session before submitting, binds the expected subject to prevent account
switch races, and checks the account again before displaying success. The server
always derives ownership from getUser, requires verified email and existing session
control approval, and never accepts a user ID as authority. Repeating the same
owned username is idempotent. Claims create only the existing registry mapping;
profile display names, auth.users IDs, passwords, roles and app records are untouched.

Username normalization, resolution, registration metadata and shared HMAC rate
budgets remain server-controlled. Login success returns only session cookies and a
message; username resolution never returns the private email to the caller. Failed
login discards session cookies and revokes only a rejected new local session.

The existing hosted CAPTCHA policy is preserved. Supabase continues to verify
CAPTCHA when configured; the gateway can additionally require a token through
BEAST_AUTH_CAPTCHA_REQUIRED. No CAPTCHA provider or hosted configuration is added.
The existing server-controlled account and network rate limits are always required.
Failures fail closed. No account, password or provider error details are logged;
server unavailability logs only a fixed processing-phase label.

## Protected Preview configuration

Existing project: thebeast / prj_EWJx7hi5tqZxOX0PGLPUN3Qh3d2P.
Existing team: team_kVdwsQ6tnUnYgRVqyGxxHB22.
Candidate branch: codex/canonical-auth-preview.
SSO protection was verified as all_except_custom_domains. Canonical production
source was verified as 3a41e80a; the auth-only candidate is based on that source,
reusing the prepared auth implementation without activating the pending BeastGuide
integration branch.

Only candidate-branch Preview variables may be changed. Both public Supabase URL
and public key are verified through canonical Auth settings; email confirmation is
still required. The inherited generic Preview server credential failed the canonical rate RPC.
The existing canonical service-role key was then verified through the supported
Supabase CLI and a service-only read RPC, and bound as a sensitive variable only
to this candidate branch. No key was created/rotated, no value was printed/committed,
and no Production environment variable or Supabase setting changed. The updated
deployment must pass gateway readiness before any acceptance account operation.
BEAST_AUTH_RATE_SECRET is a candidate-only random HMAC key, never public or logged.
No service/admin key is included in the browser bundle or source-control artifacts.

BEAST_AUTH_EMAIL_ORIGIN and NEXT_PUBLIC_BEAST_AUTH_EMAIL_ORIGIN use the existing
canonical https://thebeast.seangworld.com callbacks/recovery pages. Email verification
and recovery can open that canonical origin; return to Preview for username login.
This avoids modifying Supabase redirect allowlists, templates or SMTP. No new email
provider is introduced. BeastGuide feature/data flags remain false.

## Build-gate dependency repair

The inherited build was blocked by GHSA-g3hv-75wg-m249 affecting old minimatch copies.
All matching now uses pinned upstream minimatch 11.0.1 via minimatch-core. A private,
small compatibility adapter retains the callable CommonJS, constructor/defaults,
filter/match/braceExpand and makeRe(...).test(...) surface consumed by the installed
ESLint/glob plugins. The latter is a safe predicate backed by upstream's matcher,
not a generated RegExp; no installed consumer uses RegExp-specific methods there.
No vulnerable matcher implementation is retained or merely renamed.

The adapter source and archive are hash-pinned in vendor/minimatch-compat-provenance.json.
The audit gate verifies installed hashes, all consumer resolution paths and the
patched underlying version, then tests matching compatibility/amplification bounds
and runs the unchanged npm registry audit. npm ci --ignore-scripts reproduced the
lockfile and reported zero vulnerabilities. The security audit gate is not lowered.
Upstream reference: https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8

## Acceptance and release gates

TypeScript, lint, full unit tests, local PostgreSQL tests, local Release-browser UI,
and the full production build are required before Preview release. Local browser
submissions and upstream Auth are synthetic; those tests do not prove live login,
mail delivery, persistent real sessions or account recovery.

The owner approved swapping the two private test-mailbox roles after canonical
read-only checks: the existing-account fixture is verified, has a password and
profile; the new-registration fixture does not yet exist. Do not publish fixture
addresses, credential values or database records. Owner enters passwords/codes in
the browser. Creating/claiming/recovering only these explicit test operations is
permitted. Do not reset/delete the existing account or touch unrelated saved data.

After Preview is READY: verify public SSO protection, username UI, gateway fail-closed
and generic-failure behavior, exact canonical target, signed-in verified claims,
real username/password login, persistence, new registration and one-time verification,
recovery, and existing profile access. Keep live test results separate from mocks.
Production promotion remains gated until the owner reviews evidence and approves it.

## Local checks on the auth-only candidate

- Production baseline: 3a41e80a; no BeastGuide application/cutover diff is included.
- Full suite: 2,687 passed, zero failed, including fifteen focused gateway/UI tests.
- TypeScript noEmit and full Next lint passed without warnings/errors.
- Eleven local PostgreSQL check groups passed; the SQL file is unchanged.
- Clean npm ci --ignore-scripts reproduced the lockfile; audit reports zero findings.
- Complete npm run build passed, including the unchanged audit and dossier gates.
- Release browser smoke passes 390/844/1440px, with synthetic submissions only.

Hosted Preview and live owner acceptance results are recorded separately after
execution. A local pass does not authorize Production promotion.

## Hosted preparation result

First protected deployment dpl_HKB74A7cohY18spFbmsbUS4ZHYE6 built READY with the full
remote audit/build gate and zero advisories. Anonymous requests redirect to Vercel
SSO; authenticated CLI/browser access succeeds and the username UI is mounted.
The anonymous gateway readiness probe failed closed at rate_limit, identifying
the inherited generic Preview credential mismatch. The candidate-only canonical
server binding is now verified; a fresh deployment is required to consume it.
No owner credentials, verification emails, claims or registration records were
submitted during this readiness probe. Existing-email login and real account
acceptance remain pending. Production promotion is not authorized by these checks.
