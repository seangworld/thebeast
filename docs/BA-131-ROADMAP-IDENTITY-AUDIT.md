# BA-131 — Roadmap Identity Integrity Audit

## Decision

Roadmap IDs identify packages, not individual files. A package may own several
implementation, migration, test, and documentation artifacts. Different
capabilities may never share the same canonical roadmap ID.

Historical IDs remain unchanged in commits, migration SQL, and released
documentation. BeastAdmin now assigns canonical diagnostic identities and keeps
the historical ID as provenance.

## Duplicate identifiers found

| Historical ID | Capability one | Capability two | Canonical identities |
| --- | --- | --- | --- |
| BA-102 | Product Roadmap | Authoritative Member Directory | BA-RDM-101 / BA-MEM-101 |
| BA-103 | AI Analytics | Member Account Editing | BA-ANA-101 / BA-IAM-101 |
| BA-106 | Feature Flags | Password Recovery Deployment | BA-FLG-101 / BA-PWD-101 |
| BA-107 | Prompt Library | Authentication Email Workflows | BA-PRM-101 / BA-AUTH-101 |
| BA-108 | Release Center | Controlled Member Invitations | BA-REL-101 / BA-INV-101 |
| BA-110 | Executive Metrics | Immutable Account Audit Log | BA-MET-101 / BA-AUD-101 |

BA-129 is not a collision. Its foundation and hardening migrations belong to
the same Private Admin Messaging package and therefore share BA-MSG-101.

## Migration diagnostic contract

Migration diagnostics always show:

- canonical Roadmap ID;
- exact migration filename;
- fourteen-digit migration version;
- capability;
- historical Roadmap ID when one exists.

For example, Executive Metrics is identified as:

- Roadmap ID: `BA-MET-101`
- Migration filename:
  `20260726000700_add_beast_admin_executive_metrics.sql`
- Migration version: `20260726000700`
- Capability: `Executive Metrics`
- Historical Roadmap ID: `BA-110`

Owner guidance must reference the exact migration filename. A historical ID by
itself is never sufficient execution guidance.

## Future collision prevention

`beastRoadmapPackageRegistry` is the canonical repository registry. Validation
fails when:

- two packages claim the same canonical Roadmap ID;
- a declared roadmap artifact is not registered;
- a migration is assigned to more than one package; or
- future guidance identifies a migration only by a historical Roadmap ID.

Repositories may preserve historical aliases for provenance, but all new
packages require a globally unique canonical identity before release.
