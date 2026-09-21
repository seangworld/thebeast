# BeastMarketing Social

Owner-requested September 21, 2026: replace the Social placeholder with a working
workspace for personal Facebook, the BEAST Facebook Page, X, and Instagram.

## Behavior

- Save and revise owner-only drafts; import existing campaign assets and adapt a
  post for another channel. Saved revisions invalidate prior approval.
- Upload public JPEG/PNG/MP4 media (50 MB limit) using short-lived signed,
  non-overwriting uploads to a dedicated bucket. Never reuse private documents.
- Personal Facebook uses copied text and Facebook's share dialog. Publication is
  recorded only after the owner confirms completion; opening a window is not a receipt.
- Meta OAuth discovers managed Pages and linked professional Instagram accounts;
  the owner selects the exact account on each draft.
- Facebook Page publishes text, photos, or videos. Instagram publishes JPEG images
  and MP4 Reels, polling the persisted media container before final publication.
- X OAuth with PKCE supports direct text/link posts and refresh tokens. X media
  attachments use the manual composer. Paid X API posting is off by default.
- Every direct post requires exact-revision approval. The queue is paused by
  default and checks once per minute, one post per invocation. Times display in
  America/New_York; schedule input uses the device timezone with an Eastern preview.
- Provider receipts are retained. Atomic state claims prevent concurrent sends.
  Ambiguous writes and stale in-flight claims become `unconfirmed`, never automatic
  retries. Explicit failures can return to draft for review and reapproval.
- UTM source, campaign, and post tags allow an on-demand seven-day GA4 lookup.
  Missing/ambiguous rows are unavailable, not zero. Intent actions are not signups.

## Setup needed for direct accounts

Server environment settings (never browser fields or NEXT_PUBLIC variables):

- `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION` (the version approved for
  the configured app, in vNN.0 form; deliberately no silently outdated default).
- `X_CLIENT_ID`, `X_CLIENT_SECRET` for a confidential OAuth 2.0 app.
- `SOCIAL_TOKEN_ENCRYPTION_KEY`: 32 random bytes in hex/base64. The existing
  `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` is an explicitly supported fallback. AES-GCM
  includes owner-specific additional authenticated data.
- `CRON_SECRET` and the existing Supabase server/public configuration.

Register this exact callback for both providers:
`https://thebeast.seangworld.com/api/admin/beast-marketing/social/callback`

Meta scopes: pages_show_list, pages_read_engagement, pages_manage_posts,
instagram_basic, instagram_content_publish. The owner needs Page content access;
Instagram must be a professional account linked to that Page. App mode/review
requirements must be completed in Meta for the accounts being used.

X scopes: tweet.read, tweet.write, users.read, offline.access. X API usage may be
charged by X; no subscription, credits, or spending were purchased by this change.

Configuration presence does not establish working permissions. Complete each
platform's account authorization, select the account, then perform an explicitly
approved real post to verify provider delivery. No live social publishing is part
of development verification.

## Access and operational details

Routes verify the authenticated profile's admin role and enforce the production
origin for writes. Preview copies cannot initiate live owner writes. OAuth state
is cookie-bound, owner-bound, expires after ten minutes, and is consumed once.
Tokens, state, and controls have no authenticated or anonymous Data API grants.
Only the server role writes posts. RLS allows authenticated owners to read only
when their authoritative profile remains admin. Disconnect invalidates credentials
while preserving history; cancel queued posts before disconnecting.

Apply the additive `beast_marketing_social` migration in development, verify, then
production. The migration adds four tables and a dedicated public social-media
bucket. The bucket enforces allowed MIME types and maximum upload size.

Pause prevents future sends, not a provider request already in flight. Instagram
media may be rejected for provider-specific codecs, dimensions, or duration.
Public media must remain accessible until scheduled publication completes.

## Verification

Focused tests exercise invalid destinations/private media, platform restrictions,
tracking identity, missing/ambiguous evidence, paused/non-admin runs, lost and
concurrent claims, pause rechecks, interrupted writes, failed receipt storage,
explicit rejection, and Instagram processing.

Provider references:
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://developers.facebook.com/docs/pages-api/posts/
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- https://docs.x.com/x-api/posts/create-post
- https://docs.x.com/x-api/getting-started/pricing
