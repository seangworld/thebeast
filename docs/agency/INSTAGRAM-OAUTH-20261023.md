# Cole Instagram-only OAuth correction — 2026-10-23

Tracking: [#294](https://github.com/seangworld/thebeast/issues/294). Baseline: Cole Agency release `270e2aa64eadcdc5ecf0f4dff456126517ce7f66` (#293). Owner reported Meta rejecting `Invalid Scopes: pages_manage_posts`.

## Verified cause and correction

Agency previously linked to the combined Meta connector in Social Accounts. That connector always requested `pages_manage_posts`, and its callback saved both Facebook Page and linked Instagram rows. Instagram's Facebook Login workflow still needs linked Page discovery/read access, but the Agency path should not ask for Facebook publication authority.

Agency now has its own **Connect Instagram** button requesting exactly:

- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`

It excludes Facebook publishing and DM permissions. [Meta's own Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) documents linked Page discovery/read access and professional Instagram accounts. No switch to the different Instagram Login API/scope family, new service or new application dependency.

The existing combined Facebook connector retains its original scopes and callback channel behavior. X retains its PKCE verifier, scopes and return path. No publishing, approval, binding or scheduler behavior changed.

## Callback boundary

The Instagram-only purpose is encoded with a versioned prefix and the existing random nonce in Meta's otherwise-unused server-side `verifier` field. X's PKCE verifier is untouched. The existing private OAuth table already stores unrestricted text, so no migration or schema rollout is needed. Plain legacy 64-character Meta nonces keep the original Facebook flow; malformed/unknown purpose metadata fails closed. Callback query parameters cannot choose intent or redirect targets.

State remains secure-cookie matched, owner-bound, expiring and single-use through the same atomic delete-returning claim. A valid Agency claim determines the fixed Agency return path before handling cancellation/missing code. Token exchange errors return only constant status values; provider text/credentials are never returned or logged.

Agency callback checks all four required permissions are uniquely present and granted before account discovery or saving. Partial/declined/ambiguous permission results return `permissions_required` to Agency. Discovery must be complete and contain a linked professional Instagram account. Agency uses Page discovery/read access without requiring the legacy Facebook CREATE_CONTENT task filter, and saves **only Instagram rows**. It never creates a Facebook connection row, binds a talent account, approves content, posts, responds to DMs or enables a scheduler. Existing credentials remain sealed with the same owner-bound encryption.

Agency displays clear returned statuses for connected, incomplete permissions, no eligible accounts and failure. Successful connection still requires explicit exact-account binding and fresh content approval; reconnecting does not bypass authorization-epoch checks.

## Evidence and remaining limits

Current read-only production configuration key-name inspection: `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` and the existing Google OAuth encryption key name are present. No values were displayed. This corrects the earlier missing-key blocker; it does not prove valid credentials, app review or granted provider access. Read-only database count shows no connected social records at audit time. No live authorization or provider evaluation was executed.

Local tests execute the actual connect/callback route code with synthetic provider/session/storage fixtures: exact scope URL, server-persisted purpose, secure cookie settings, Facebook/X compatibility, owner/expiry/cookie/replay isolation, cancellation, missing/duplicate permissions, read-only Page eligibility, pagination refusal, encrypted IG-only storage and sanitized failures. Full suite: **2,648 passed, 0 failed**. Typecheck and lint pass without errors/warnings; both dossier gates, unchanged security audit (zero findings) and final production build passed before push. Application manifests/lockfile and database schema are unchanged. Exact deployed SHA and owner-visible checks are recorded in #294 without a receipt deployment.

Owner next action after release: use Agency → **Connect Instagram**, complete Meta's real consent separately, then inspect and explicitly bind Cole's exact account. Whether Meta accepts the app/permissions and returns an eligible account remains a live owner authorization check, not a local-fixture claim. A public post remains a separate decision with exact content approval. Original asset/brand prerequisites and Leila deferral remain. No paid AI calls, public posts, DMs, credential disclosure or scheduler activation.
