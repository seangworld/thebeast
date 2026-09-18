# Device notifications and shared member pages

## Behavior

- Opt-in Web Push for bills due today/tomorrow and new unread private support Messages. Permission is requested only from the member's Enable notifications gesture.
- Personal Hub → Notification Preferences, Notification Center, Messages, and the Dashboard setup prompt all lead to `/dashboard/settings/notifications`.
- Each device has its own bill/message switches, timezone, reminder hour, quiet hours, label, pause/remove controls, and rate-limited test action.
- Bill details are hidden by default; message contents never appear in push payloads. The test action reports provider acceptance, not confirmed physical-device delivery.
- iPhone/iPad setup explains Add to Home Screen. The manifest and notification-only service worker do not cache authenticated pages.
- Supabase Cron checks every five minutes; twelve devices per invocation are processed in least-recently-checked order. Larger device populations may wait additional cycles. Duplicate delivery claims and ten-minute retry leases limit repeats; failed deliveries stop after three attempts and expired endpoints are disabled. Transport timeouts can still be ambiguous; notification tags collapse retries where supported.
- Calendar now displays saved bill occurrences/payment state, active goal target dates, and health appointments. Date-only records have no invented appointment times or conflicts. Source links remain the place to edit records.
- Notification Center removes samples and shows saved bill reminders, private messages, overdue debts, vaccinations, and release notices. Device push currently covers bills/messages only.
- Timeline adds real health-record updates and recorded bill payments, respects Money/Health entitlement checks, and reports partial loading failures. Search excludes deleted goals/documents. Dashboard and Messages use clearer member-facing wording.

## Database release

Source migration: `20260918190547_add_device_notifications.sql`.
Connected migration workflow applied the exact reviewed additive SQL:

- DEV `zvzcojwjgnedrouilovc`: recorded version `20260918192300`.
- Production `grpyzwvgqiwtxadfdtni`: recorded version `20260918192825`.

These represent the same migration despite different recorded timestamps. Do not replay or repair history based on timestamp mismatch. No unrelated remote history was changed. The repository's migration inventory now also includes the previously released September 17 migrations.

`beast_push_config`, `beast_push_devices`, and `beast_push_deliveries` have RLS enabled and no grants to anon/authenticated; only the server service role can access them. APIs authenticate members and explicitly scope every device mutation to the current owner. Endpoint hosts and encryption keys are validated before transport. Scheduler calls require a private timing-safe bearer-token comparison. Private keys, scheduler tokens, subscription encryption material, and endpoint URLs are never returned to members.

Security advisors report the intentional server-only [RLS-without-policies informational finding](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for the three tables. Verified anon/member SELECT false and service-role SELECT true in DEV and Production. New-index-unused findings are expected before opt-in traffic.

Both databases initially have dispatch disabled; DEV remains disabled. Production activation occurs only after the matching deployment is ready. VAPID keys are generated once server-side and stored in the restricted configuration table. No new environment variable or provider account is required.

## Verification and remaining member check

Automated tests cover owner isolation, authentication/origin checks, scheduler authorization, bill/payment/date boundaries, quiet hours, deduplication, retries, expired endpoints, opt-outs, and private payload defaults. Live member browser verification is blocked by the existing browser/CDP connection failure.

Remaining physical-device check: open the production notification settings page on the intended phone, enable notifications, send a test, and confirm it appears. On iPhone, first open Beast from its Home Screen icon. Then confirm a real incoming message and a due bill alert after the scheduler runs. No synthetic member message or payment is created by this release.

Local release gates: 2,268/2,268 tests pass; TypeScript, lint, production build, and whitespace checks pass. Nine stale baseline test assertions/inventories were identified against the previous main commit and updated to reflect the already released profile/context/migration changes; no tests were skipped.
