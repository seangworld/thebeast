# BeastOS 3.0.0-beta1 — BeastHealth

## Release-candidate scope

BeastOS 3.0.0-beta1 begins BeastHealth as an owner-only beta. It replaces the
static Health placeholder with owner-controlled record workspaces for:

- Health Overview
- Health Profile
- Conditions
- Medications
- Procedures
- Vitals
- Documents
- Lifestyle
- Family History
- Provider Directory
- Health Timeline

The overview and timeline are derived only from saved records. The application
does not create sample health data, infer events, or invent trends.

## Data model

Migration `20260728010000_add_beast_health_foundation.sql` adds one flexible
`public.beast_health_records` table with:

- owner identity;
- a bounded record type and status;
- title, effective date, and source provenance;
- structured details and private notes;
- created and updated timestamps;
- owner/type/date and owner/status indexes;
- an updated-at trigger; and
- owner-role and owner-ID RLS policies for select, insert, update, and delete.

The migration is additive and remains unapplied in this release candidate.

Health Profile stores health-specific context only. Shared identity remains
owned by BeastOS Personal Hub. Health Documents stores references and does not
extract, summarize, or interpret document contents.

## Health Advisor boundary

Health Advisor remains planned and inactive. BeastHealth does not import the
execution-history store and exposes no Health Advisor conversation,
recommendation, approval, execution, confidence, or outcome controls.

The release prepares the future boundary by defining:

- owner-scoped health context with dates and sources;
- the future Health Advisor professional identity;
- readiness for the existing Execution History foundation;
- readiness for recommendation lifecycle and confidence history; and
- readiness for member-reported outcome learning.

Activation requires a separately approved health safety, privacy,
source-authority, qualified-care escalation, and professional-boundary policy.

## Safety

BeastHealth is an organizational record system. It does not:

- diagnose conditions;
- recommend treatment;
- interpret measurements;
- check medication interactions;
- tell a member to start, stop, or change medication;
- verify provider credentials or insurance participation; or
- replace emergency services or qualified care.

## Release boundary

- BeastOS version: `3.0.0-beta1`
- BeastHealth version surface: `0.1.0-beta1 Beta`
- Migration: included, reviewed locally, not applied
- Health Advisor: inactive
- Push: not authorized
- Deployment: not authorized
