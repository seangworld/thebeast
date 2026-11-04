# Account setup release candidate

Branch: codex/kenny-account-onboarding, based on BeastOS main ab87256f. This is an implementation candidate, not a deployed registration fix.

## Root causes and changes

- Existing production handle_new_user_profile was inspected read-only: it inserts only the profile ID and does not assign a username. Reported automatic naming has not been attributed to a canonical registry write; no existing username/profile field is rewritten.
- Dashboard/API entry did not require a canonical username or completed existing profile. The new BEAST_ACCOUNT_SETUP_REQUIRED gate checks verified email, authoritative own-username RPC, existing name and birthday. It preserves current age/entitlement checks. Profile settings remain reachable to finish setup; missing registry/profile reads fail closed. Default is off until migration and release approval.
- UsernameClaim previously showed an empty claim form for an already assigned identity and generic errors. It now reads only the signed-in user's username, refuses replacement, confirms the selected username and actual email status, and shows the rules directly below the field. Gateway errors distinguish invalid/taken/already-assigned/service failure without leaking SQL.
- Universal server signup used an implicit, nonpersisting client while the callback expects PKCE/code exchange. It now reuses the existing SSR PKCE client, returns only verifier cookies (including chunks), discards accidental session cookies and binds callbacks to the initiating origin. It preserves the safe requested-app destination. Provider signup failures no longer masquerade as a successful email request; email-already-existing responses remain generic.
- Forgot Username sends a privacy-preserving existing-account-only recovery link to the canonical settings page. Resend verification never creates an account. Both share generic private notices and a client cooldown while retaining hosted Auth rate limits/CAPTCHA settings. Existing password recovery is reachable with canonical login enabled. Actual email delivery has not been tested.
- New recovery/shared forms use POST and disable submission until hydration, preventing a premature browser-default GET from putting credentials/email in URLs.
- Login FAQ, Applications directory and flag-aware BeastGuide dashboard shortcut reuse the existing navigation/registry. Disabled/planned/owner-only entries do not get member launch links. Existing PWA files are unchanged.

## Local evidence

- 2,708/2,708 tests passing, including middleware setup gating, private recovery behavior, no replacement, safe return URLs and real installed SSR SDK PKCE issuance/exchange against a fixture transport.
- TypeScript passed. Final-tree required build/security audit passed with zero audit vulnerabilities, including the PKCE and pre-hydration changes. Recovery/shared-form rendered regressions and local browser checks passed.
- `node scripts/test-account-setup-db.mjs`: actual local PostgreSQL self-read, anonymous/private-registry denial, account isolation, unassigned identity and unchanged existing registry rows passed. No hosted migration applied.
- Existing staff dossier source gate retained; no agent capability/prompt/model/permission changes. No live inference or paid evaluation.

## Exact migration and rollout decision

Only new database objects: public.beast_auth_current_username() and public.beast_auth_account_setup_complete(). Both are authenticated self-read wrappers over the existing private registry/profile. They take no user ID, read auth.uid(), use a fixed empty search_path, revoke PUBLIC/anon execution and grant authenticated execution. They change no tables, usernames or IDs. Standalone BeastGuide checks the setup-complete RPC in its existing proof verifier only when the coordinated BEAST_ACCOUNT_SETUP_REQUIRED flag is enabled. Incomplete setup receives a visible canonical setup link, not an empty replacement library. Migration: 20261104230605_account_setup_username_readback.sql. Rollback can turn the setup flag off without deleting data or changing ownership. Do not apply to canonical production until the owner approves this exact additive change.

Before activation: verify current canonical project and registry function/grant definitions; capture existing account/registry/library/mapping aggregate fingerprints; rehearse the migration and acceptance checks in isolated DEV; then obtain production approval. Enable BEAST_ACCOUNT_SETUP_REQUIRED only together with the reviewed self-read RPC and canonical login UI. Retain the prior working BeastOS and BeastGuide deployments before staging. Verify exact initiating-origin callback allowlists for each preview/production target. Do not widen callback origins or change SMTP as a shortcut.

BeastGuide's new Forgot Username/FAQ/Explore links depend on this BeastOS release. Stage both candidates and promote in canonical-then-Guide order only after approval and readiness. No production release or feature flag update has happened in this work.

Custom username-confirmation mail is not implemented: the repository lacks an authenticated application-mail path using the approved sender. Password/email/security notices require a reviewed hosted notification/template batch. These and canonical OAuth SSO remain explicit decisions, not hidden new services. See PROVIDERS-AND-SSO-20261104.md and KENNY-37-ITEMS.md.

Local browser pass (fixture Auth only): widths 390/1024, username controls/rules, Forgot Username request with create_user=false, generic notice, FAQ, resend endpoint, no horizontal overflow and zero page errors. No real email sent.
