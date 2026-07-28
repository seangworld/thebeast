# BeastOS 2.2.0 — Digital Staff Foundation

## Release scope

This release candidate introduces permission-bounded Digital Professionals,
durable execution-history architecture, owner audit surfaces, and the
SEANGWORLD Intelligence dashboard foundation.

Digital Professionals expose mission, responsibility, capability, limitation,
and data-access boundaries. Planned professionals remain visibly inactive.
Nothing in this release grants autonomous authority or bypasses existing
member, owner, product, authentication, or RLS boundaries.

## Execution history

The application includes an additive Supabase migration for requests, plans,
steps, approvals, results, outcomes, recommendations, lifecycle events,
confidence evolution, follow-ups, and immutable audit events. The owner review
surface fails safely when the migration has not been applied.

Migration `20260728000000_add_execution_history.sql` is release-candidate
source only. It was reviewed but not applied. Environment-specific database
approval remains a separate manual gate.

## SEANGWORLD Intelligence

The owner-only dashboard supports provider state, freshness, synchronization
metadata, analytics dimensions, historical trends, and deterministic
recommendation cards. Server-only environment configuration can describe
verified provider snapshots. Missing providers produce guidance and no fake
metrics. Live Google provider connections are explicitly excluded from 2.2.0.

## Discovery compatibility

The App Router generates the public sitemap from canonical public routes.
Permanent redirects preserve selected legacy `.html` and `.php` URLs without
duplicating content.

## Security and rollback

- Owner routes require authenticated BeastAdmin role checks.
- Provider credentials cannot cross a `NEXT_PUBLIC_` boundary.
- Execution-history tables enable RLS and preserve immutable evidence.
- Application changes can be reverted independently.
- Database rollback requires separate owner approval and must follow the
  migration notes; no migration was applied while preparing this candidate.
