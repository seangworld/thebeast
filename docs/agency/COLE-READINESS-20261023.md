# Cole Mercer Agency readiness — 2026-10-23

Tracking: [TheBeast #292](https://github.com/seangworld/thebeast/issues/292). Baseline: released `e8c30ad543d3d72550d63492c4a6c6ab58214c7c`, deployment `dpl_CBKdAKmte995Jn8r6cEthmNLwm3W`. Executor: Codex. No paid evaluation, generation, public posting, account linking, activation or new service.

## Reconciliation before implementation

- [PR #259](https://github.com/seangworld/thebeast/pull/259) remains open/unreleased. No Agency successor implementing its workspace was found. Production `/dashboard/admin/agency/metrics` returned 404. Current main had no Agency navigation/dashboard, although private presenter drafts and the shared social transport were released.
- Read-only production inspection confirmed existing **inactive** Cole Mercer and Leila Bautista `future_character` drafts. Cole's locked mature/rugged/athletic dark-haired/bearded/tattooed visual direction and allowed fitness/outdoors/lifestyle/fashion topics are retained. Neither character has bound media or voice assets or approved identity/disclosure flags. No names, private IDs or configuration were seeded or activated by this pass.
- Production contained no social account connections, no social posts, no social controls row, and no Agency binding table. An absent controls row means the generic social publisher remains paused, not enabled.
- Production configuration key inspection found `META_APP_ID`, `META_APP_SECRET` and `META_GRAPH_VERSION` absent. Existing Google OAuth encryption and Supabase service-role key names are present; key presence alone is not credential validity or Instagram access. No secret values were printed or copied.
- HQ had only the daily observation cron. Marketing/Atlas schedules stay absent. No News source, geography, headline schedule or watchdog changes.

## Reuse and scope

Reuse PR #259's existing Agency URL/workspace, private on-demand refresh approach, owner write-origin policy, account availability helper and binding-table design. Do not merge its obsolete dependency/CSS/typings changes over the newer released tree. Its broader review-only campaign/workstream planning remains preserved on that PR and is not brought into this Cole batch. This release supersedes only the overlapping Agency entry, binding and workspace portions; it does not close or discard the remaining candidate.

The owner-only HQ Ventures navigation and overview now expose **Agency**, linking to `/dashboard/admin/agency/metrics`. Both Virtual Talent cards link to canonical HQ dossiers. Leila has a deferred identity card only; all operating writes require Cole's owned profile. No duplicate dashboard or new talent identity.

Cole/Leila are `virtual_talent`, separate from 11 actual staff. They receive no competency levels. Actual work is performed by the owner plus the private deterministic Agency persistence/approval service and existing Meta transport. BeastMarketing's policy class remains a supporting record, not an independently running creator agent. Existing historical competency audits/accounting are unchanged.

## Released mechanics versus live capability

The batch provides owner-controlled manual mechanics:

1. Keep/review the existing brand fields and explicitly approve the locked identity/disclosure for manual content. This changes no `active` flag or blanket publishing authorization. Voice synthesis stays disabled.
2. Create or import caption/media-URL JSON. Ignore imported approval/status fields. Save drafts without media; approval remains blocked until an approved owned public JPEG is present. No generation or public upload occurs automatically.
3. Preview the exact saved caption and original JPEG. Hash bounded original media bytes. Approval covers content hash, media digest, revision, brand/provenance fingerprint, Instagram account ID/username, connection ID and authorization epoch. Saving edits clears approval; changed brand/media/account access prevents dispatch.
4. Bind only an already connected owned Instagram account after a provider read and exact typed username confirmation. Enforce exclusive account assignment. Reverification can renew only the same account identity; account reassignment is not silently allowed. This pass connects/binds no real account.
5. Separately confirm each public publish action. Claim the exact approved revision with compare-and-set; checkpoint container IDs while keeping the in-flight claim; persist the intent before calling `media_publish`. Do not release a resumable processing state while publishing is still in flight. No scheduler consumes these records.
6. A saved `processing` receipt requires an explicit owner Continue action on the same container. No automatic loop/retry. Published means provider ID plus a confirmed persistence result. Known provider rejection is failed; transport/receipt ambiguity is unknown. Stale publishing claims display unknown and never automatically requeue.
7. An owner can safely abandon an uncertain preparation only when a CAS proves no publish intent started. Any possible public publication remains blocked until an owner supplies an Instagram media ID and read-only verification matches account ownership, exact caption and publication time. Other unknown/in-flight Cole posts block further dispatch. No blind retry/reset of a possible public post.
8. Available basic account/post metrics refresh only on owner action. Persist actual numeric values and timestamps; retain prior values/timestamps on reporting failure. Missing values remain unavailable, older-than-one-day snapshots are stale, and partial refresh failures are explicit. Reach, growth, revenue, engagement rate and actual costs are not fabricated or claimed integrated.

These mechanics are locally verified, **not live Instagram publishing competence**. No real Meta identity/permissions, image processing, publication, receipt, metrics or app-review eligibility was exercised: no connection/configuration exists. Local fixtures do not prove live API compatibility, editorial judgment or visual character accuracy. Generic social publishing still has its own paused controls; the new manual Cole path never unpauses Marketing or restores schedules.

## Permissions, privacy and evidence

Server-side owner guard before page rendering; owner-session/role and production Origin checks for API writes. Ordinary preview writes stay denied. Every privileged query scopes owner; composite foreign keys enforce same-owner profile/account relationships. New tables enable RLS and revoke direct `anon`/`authenticated` grants; only the existing server service role can write through the guarded API. No new provider scope, DM scope or credential is introduced.

Owner privacy checks compare draft captions with the authenticated owner's private email/name fields; review also explicitly covers image/identity/privacy and required `AI-generated character; not a real person.` disclosure. Private identity detection is a safeguard, not proof that media contains no likeness, personal detail or EXIF. The owner must inspect the actual asset. No owner identity is inserted into the proposed public caption.

Validation: targeted workflow/account/auth tests plus full suite; same retained PR259 PGlite runtime/lock restored outside application dependencies for isolated synthetic PostgreSQL fixtures. [SQL results](local-sql-results.json) verify 28 checks including RLS/grant denial, cross-owner foreign keys, duplicate content and one-winner claims. No application dependency/lockfile upgrades. Required staff-dossier, security/build, lint/type and combined tests run before push; exact results and deployed SHA are recorded in issue #292 without a receipt deployment.

The additive migration scope is only the reused binding table plus private Cole manual-workflow columns/table. No account/content/profile rows are created by migration. No broad migration-history repair or replay of unrelated migrations. Read-back verifies privileges/RLS/constraints and empty workflow tables after the deployment step.

## Owner setup and first-post preview

No connection or public post is authorized by this report. Separate concrete owner actions:

- Configure an existing approved Meta app: `META_APP_ID`, `META_APP_SECRET`, a currently supported pinned `META_GRAPH_VERSION`, existing valid 32-byte token encryption, and the existing callback `https://thebeast.seangworld.com/api/admin/beast-marketing/social/callback`. Do not create a new account/app/service automatically.
- The existing Facebook Login connector requests `pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish`; it does not currently request extended insights permissions. Owner must confirm appropriate Meta app access/review, a professional Instagram account and linked Facebook Page, then explicitly connect and bind Cole's exact account. Basic available metrics do not establish full Insights access. [Meta's own collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) describes professional accounts and the container/publish sequence. Direct Meta documentation fetch was rate-limited; no default API version or permission validity is invented.
- Review/approve Cole's retained brand and supply **one owner-approved Cole JPEG** preserving the locked appearance, with the rights and privacy review complete. No approved/bound Cole asset was located; unrelated stock imagery is not substituted. Voice is unnecessary for this first still image and remains disabled.

Proposed first-post caption (shown in the composer, not saved or approved automatically):

> Keep it simple: move your body, get outside, and make room for the next adventure.
>
> AI-generated character; not a real person.

Media preview cannot be completed until that Cole JPEG is supplied/hosted through the existing owner media controls. Then save the exact caption/media revision, inspect the image/disclosure/account, explicitly approve it, and make a **separate public-post decision** with the final preview and exact destination visible. If Instagram reports processing, manually Continue the approved container. Inspect and reconcile unknown outcomes before considering any further post.

No public post, actual account connection or paid validation is performed/requested here. Future costs: **cost unknown**; no unsupported estimate or additional service is proposed. Leila remains deferred until Cole's real owner workflow is reliable.
