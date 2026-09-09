# Growth operating cycle for TODO-002

The authorized Growth Engine work now includes an opt-in daily internal cycle for Beast and News. This increment does **not** close TODO-002: external distribution remains unconnected and unauthorized, and no measured business effectiveness is established.

## Behavior

- Existing read-only Google integrations supply scoped discovery and reporting. No new credentials, grants, model calls or paid providers.
- At most two new search campaigns per product per UTC day, with insert-only draft destination introductions and tracked links. Original evidence and owner decisions are preserved.
- Up to ten eligible campaigns per product receive refreshed assessments. A deterministic daily rotation eventually covers the bounded history. Paused, completed and archived campaigns are excluded; lifecycle and global controls are rechecked before derived writes.
- Assessments retain exact Search Console windows and exact GA4 product/source/medium/campaign-name/campaign-ID/destination matching. GA4 windows must be completed, recent, equal and adjacent. Missing, ambiguous, malformed or suppressed evidence is unavailable. Intent actions are not verified registrations. Overlapping rolling windows must not be summed.
- Advisory continue/modify recommendations never change campaign status or authorize execution. No publication, external scheduling, paid media, Fact Brief processing or outbound messages.
- The separate cron runs at 10:20 UTC, with explicit admin opt-in. One atomic claim per owner/day prevents duplicate cycles. Failed/interrupted records remain visible and do not retry that day. Pause takes effect between operations; an already in-flight internal write can finish. Provider waits and assessment batches are bounded, and a forty-second elapsed budget stops further work before the function deadline. A platform termination can still leave completion unconfirmed.
- Owner Analytics shows controls, the last fourteen cycles, prepared campaign links and blockers. Existing Advertising remains the review and approval workspace.

## Database deployment

CLI-generated source: `20260909214424_add_marketing_growth_cycles.sql`. Two additive tables only; no existing data changes. Both have RLS, owner/admin SELECT policies, no anonymous access or authenticated writes, and server-only service writes. Controls default disabled; no implicit enrollment of admins.

The exact SQL was applied through the connected migration tool to DEV `zvzcojwjgnedrouilovc`, then Production `grpyzwvgqiwtxadfdtni`, after inspecting migration history and required schema. Both were verified for RLS and privileges. The tool assigned DEV history version `20260909215421` and Production history version `20260909215438`, both named `add_marketing_growth_cycles`. These are the same source migration, not missing schema. Do not replay it based solely on filename/version mismatch. Existing cross-environment historical differences were inspected and left intact; no unrelated repair or migration was applied.

Rollback: pause growth controls and remove the new cron/application entry; retain audit history. Do not drop tables or erase campaign work to roll back the application.

## Remaining completion evidence

Connect and explicitly authorize a concrete publishing destination and integration, validate execution receipts and failure recovery, then observe the campaign acquisition and qualified outcomes through this mapping. Content claims still require verification. Full low-touch video/YouTube work remains TODO-003. The Fact Brief hold is unchanged. Authenticated/rendered Preview verification remains owner-deferred and unperformed; automated gates and independent review are recorded in the release evidence.
