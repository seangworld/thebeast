# BeastOS 3.0.0 — Health Advisor

## Release-candidate scope

BeastOS 3.0.0 activates Health Advisor inside the protected owner-only
BeastHealth workspace. The advisor provides:

- Executive Health Briefing;
- Medication Review;
- Appointment Preparation;
- Questions for Providers;
- Health Recommendations;
- Document Understanding;
- Timeline Summaries; and
- preparation-outcome learning.

Appointments join the existing Health Profile, conditions, medications,
procedures, vitals, documents, lifestyle, family history, Provider Directory,
and Health Timeline record areas.

## Evidence and authorization

Health Advisor reads only:

- owner-authorized `beast_health_records`;
- owner-authorized BeastDocuments categorized as Health;
- existing document summaries when document-intelligence permission is
  explicitly `Allowed`; and
- owner-scoped execution, recommendation, and outcome history for
  `beasthealth.health-advisor`.

Blocked documents, documents without permissioned summaries, missing record
fields, and unavailable providers remain visibly unknown. Health Advisor does
not invent records, document contents, clinical trends, or provider activity.

## Execution and recommendation lifecycle

Viewing Health Advisor creates no execution activity. An execution request,
recommendation, approval, and audit history begin only when the owner explicitly
accepts, defers, or declines an organizational recommendation.

Accepting a recommendation does not change a medication, health record,
appointment, or care plan and does not contact a provider. Reported outcomes
measure whether the suggestion helped with record review or appointment
preparation. They are not medical outcomes and are not independently verified.

## Confidence

Confidence is calculated through the shared confidence foundation using record
source, date, completeness, freshness, and directness. It expresses how well
saved records support an organizational suggestion. It never expresses:

- diagnostic certainty;
- likelihood of disease;
- treatment effectiveness;
- safety of a medication or dose; or
- certainty about a health outcome.

## Medical safety

Health Advisor never:

- diagnoses a condition;
- prescribes or recommends treatment;
- tells an owner to start, stop, or change medication;
- checks interactions or dosing;
- interprets whether a vital or result is normal, abnormal, safe, or urgent;
- replaces a qualified clinician; or
- replaces appropriate local emergency care.

Original medical documents and qualified clinical judgment remain
authoritative.

## Migration boundary

Migration `20260728020000_activate_health_advisor.sql` expands the bounded
`beast_health_records.record_type` constraint to include `appointment`. It
creates no new health or execution table and does not weaken existing RLS.

Both BeastHealth migrations remain unapplied in this release-preparation step:

1. `20260728010000_add_beast_health_foundation.sql`
2. `20260728020000_activate_health_advisor.sql`

## Release boundary

- BeastOS version: `3.0.0`
- BeastHealth version surface: `1.0.0`
- Health Advisor: active within medical safety boundaries
- Migrations: included, not applied
- Push: not authorized
- Deployment: not authorized
