# BA-TEL-001 First-Party Ecosystem Telemetry

## Architecture

BA-TEL-001 uses a hybrid source model. Existing canonical Beast records remain
authoritative for registration, email verification, onboarding state, goals,
documents, financial records and payments, completed education activity,
health records, and Digital Professional conversations. These records are
aggregated at read time and are labeled **Derived from canonical records**.

The additive `beast_telemetry_events` table stores only bounded operational
facts that canonical records cannot supply safely: Digital Professional
success/failure, safe error category, model route, and latency band, plus a
small governed set of future meaningful action events. It has no arbitrary
JSON or free-text payload column.

## Identity and privacy

The canonical auth UUID is stored only as a server-side foreign key required to
calculate unique activity, activation, and retention. The aggregate owner RPC
does not return UUIDs or member-level rows. GA4 never receives the UUID, and no
cross-provider person-level identity stitching exists.

Telemetry must never contain names, emails, addresses, phone numbers, prompts,
responses, chat contents, health contents, diagnoses, medications, lab values,
financial values, bills, debt or income amounts, education details, document
names or contents, goal text, authentication secrets, or provider tokens.
Session replay, heatmaps, DOM capture, and member ranking are prohibited.

## Definitions

- **Activated:** the account currently has onboarding complete and at least one
  meaningful persisted action. Registration and onboarding-generated setup
  artifacts alone do not qualify.
- **DAU:** unique non-admin members with a meaningful authenticated action since
  the current calendar day began.
- **WAU:** unique non-admin members with a meaningful authenticated action in
  the trailing seven days.
- **MAU:** unique non-admin members with a meaningful authenticated action in
  the trailing 30 days.
- **D1/D7/D30 retention:** among members old enough to reach the exact return
  day, the share with a meaningful action during that activation-relative day.
- **Module adoption:** activated members with meaningful activity in the module
  during the selected reporting window.
- **Cross-module adoption:** aggregate counts using one, two or more, and three
  or more modules. Individual combinations are never returned.

Percentages for retention and cross-module adoption are suppressed until at
least five members are eligible. The UI shows **Insufficient data** or
**Cohort too small** and retains raw aggregate numerator/denominator counts.

## Owner, environment, and automation exclusion

`profiles.role = 'admin'` activity is classified as owner/admin and excluded
from member registration, activation, adoption, DAU, WAU, MAU, and retention.
Bounded events carry a server-selected environment. Production aggregation
uses only Production events; Preview, development, and test events cannot
inflate Production operational metrics. Automated tests do not call the hosted
recorder.

## Storage and authorization

- Direct `anon` and `authenticated` table access is revoked.
- The server-only recorder is executable only by `service_role`.
- The aggregate RPC requires the existing `public.is_profile_admin()` owner
  check and returns aggregates only.
- RLS is enabled and there is no member-readable telemetry policy.
- Events are append-only; update attempts fail closed.
- Indexed event rows carry an `expires_at` date 180 days after collection and
  are excluded from all aggregates after that date.

Physical deletion requires a separately scheduled, governed purge job. Until
that job exists, expired raw rows remain inaccessible and excluded; this is an
explicit retention limitation, not a claim that deletion is automated.
Canonical source records retain their independent product retention policies.

## Reliability and performance

Member product writes remain primary. Telemetry recording is invoked only after
the primary action and fails safely without reversing or blocking that action.
Operational failure remains visible through bounded safe failure categories.
Digital Professional aggregates include initiated/completed turns, success,
failure, timeouts, ordinary/strong routing, and median/P95 latency without
conversation text.

## Deterministic recommendations

Recommendations are fixed rules, not language-model output. They require
verified minimums before reporting low activation, low D7 retention, weak
module adoption, repeated failures, or latency regression. Each recommendation
states its metric and threshold.
