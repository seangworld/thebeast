# BA-CMD-001B — Repository and Release Intelligence

## Boundary

BA-CMD-001B adds an owner-only, read-only comparison layer to BeastAdmin. It
does not create roadmap truth, authorize work, mutate a repository, create a
release, deploy an application, or inspect a developer's local worktree.
BeastFusion remains canonical governance truth through the immutable
BA-CMD-001A projection.

The bounded repository catalog is fixed to TheBeast, SEANGWORLD, BeastFusion,
and Change the World. The server may read each repository's default branch and
head commit through a narrowly installed GitHub App. It may read the latest
READY Preview and Production deployment metadata for the three application
repositories through a Vercel credential limited to the owning team and
projects. No provider credential or raw provider response reaches the browser.

## Truth model

Canonical release identity, state, version, declared deployment, validation,
and evidence reference come only from BeastFusion. Provider observations may
verify or contradict that declaration, but never replace it.

| Canonical commit | Served commit | Repository head | Evidence state |
| --- | --- | --- | --- |
| matches | matches | matches | `verified_current` |
| matches | matches | different or unavailable | `verified_deployed` |
| differs | present | any | `drift_detected` |
| absent | present | any | `provider_observed` |
| present | absent | any | `declared_only` |
| canonical record only | no application boundary | any | `canonical_only` |

Provider errors and stale observations fail closed. The current canonical
projection remains readable and is labeled `provider_error` or `stale`; the
system does not fall back to a conflicting BeastAdmin release record.

Existing BeastAdmin Release Center rows are preserved as intake, annotation,
archive, legacy, placeholder, or derived operational notes. They are displayed
separately and cannot override canonical release truth.

## Security and configuration

`GET /api/admin/repository-release-intelligence` requires an authenticated
owner session. It has no write method and returns `private, no-store` data.
Provider collection runs server-side only.

GitHub configuration uses a GitHub App installation with Metadata read and
Contents read. The server creates a short-lived installation token restricted
to the four repository names. Long-lived personal GitHub tokens are not
supported.

Vercel configuration uses a server-only, read-only access token plus exact team
and project allowlists. The adapter calls only the deployment-list read API.
Missing or failing provider configuration is reported as not configured,
partial, or error; it is never reported as connected without valid live
evidence.

## Deferred

- Provider credentials and environment assignment require a separate owner
  configuration authorization.
- No DEV, Preview, or Production deployment is performed by this package.
- CEO Mode deterministic intelligence repair remains BA-CMD-001C.
- BF-DASH parity verification and retirement remains BA-CMD-001D and a later
  explicit retirement decision.
