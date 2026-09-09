# Direct YouTube connection and private upload

Owner-selected destination: YouTube Shorts on SEANGWORLD. The direct integration does not require Breakreach. TODO-002 and TODO-003 remain open for live authorization, production validation, public distribution and measured results.

## Google setup

1. In the intended Google Cloud project, enable YouTube Data API v3.
2. Configure Google Auth Platform branding, audience and consent. If the app is in Testing, add the owner's Google account as a test user. Check Google's current testing-token restrictions before treating that configuration as unattended production access.
3. Create a dedicated OAuth client of type Web application for this YouTube integration. Keep this client separate from AdSense so authorization lifecycles are independent.
4. Register this exact authorized redirect URI:

   `https://thebeast.seangworld.com/api/admin/beast-marketing/youtube/callback`

5. Configure encrypted server environment settings for TheBeast Production: `YOUTUBE_GOOGLE_CLIENT_ID`, `YOUTUBE_GOOGLE_CLIENT_SECRET`, and the existing 32-byte `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`. Do not put these values in source, public environment variables, messages or screenshots. Deploy after environment changes.
6. Open `/dashboard/admin/marketing/video-growth`, choose Connect SEANGWORLD with Google, and select the account/channel controlling `@seangworld`. Grant the explicit YouTube read and upload permissions. The callback resolves the selected handle and the authorized channel independently and requires their immutable channel IDs to match before saving credentials.

Google project access, credentials and consent must be supplied by the owner through the relevant secure settings. No new client, grant, audit approval or live token is claimed by this code release.

## Private upload behavior

Only the live canonical owner workspace can initiate authorization, disconnect or upload. State is random and owner-bound, PKCE is required, callbacks clear cookies, and tokens are encrypted in service-only RLS tables. Status responses contain safe channel metadata, never token material. Existing AdSense routes and grants are unchanged.

For a private upload, explicitly approve the current render and release the existing global publishing pause. Select a final, licensed production MP4 (maximum32MiB), from the current 9:16 manifest with matching checksum and one-to-three-minute runtime. Provide title, description, audience and synthetic-content disclosure, then explicitly confirm private transfer. The server verifies bytes against the stored SHA256 and rechecks connection, pause, approval, revision and asset state before upload.

One durable owner/asset claim is recorded before transfer, including metadata and content hash. All uploads are forced private and subscriber notifications are disabled. A successful private receipt is retained. Interrupted or ambiguous attempts are unconfirmed and never automatically retried; inspect YouTube Studio before reconciliation. This bounded first integration does not implement resumable recovery. A transfer already in flight can finish after pause or local disconnect. Local disconnect removes Beast credentials; Google account permissions can separately be revoked in Google settings.

Public and automatic publishing remain disabled. The existing video job is not marked publicly published and the Growth cycle does not invoke uploads. Google restricts videos uploaded by qualifying unverified API projects to private viewing until an API compliance audit passes. Private upload is not proof of public eligibility, distribution or effectiveness.

## Database deployment and rollback

CLI source `20260909224835_add_direct_youtube_connection.sql` adds only connections and upload receipts. Both tables have RLS, no anonymous/authenticated table access, and service-role access. Existing owner-checked routes mediate access. Source was applied and privileges verified in DEV and Production; tool-assigned history versions are DEV `20260909225752` and Production `20260909225820`, both `add_direct_youtube_connection`. Do not replay the source solely because its generated filename differs from tool-assigned history. Historical environment differences were left intact.

To stop the integration, pause publishing and disconnect the owner connection. Retain receipts to prevent accidental duplicate uploads. Do not drop tables or delete receipt history as an application rollback.

## Primary documentation

- [Google server-side OAuth](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps)
- [Channel identity lookup](https://developers.google.com/youtube/v3/docs/channels/list)
- [Video upload and audit restrictions](https://developers.google.com/youtube/v3/docs/videos/insert)

Automated validation does not establish that real Google consent or upload has occurred. Existing owner-deferred authenticated/rendered Preview checks remain unperformed.
