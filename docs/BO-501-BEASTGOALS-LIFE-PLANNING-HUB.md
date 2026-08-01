# BO-501 — BeastOS Life Planning Hub

## Canonical architecture

`beast_goals` is the single owner-controlled planning record for BeastOS. Education and career, Money, Health, Home, Family, Personal, Projects, and future products link to the canonical goal ID; they do not keep a second goal copy. Existing goal IDs, milestones, support items, references, contributions, recommendations, and lifecycle history are preserved.

Modules synchronize with goals through two existing contracts:

- `beast_goal_references` links a goal to a module record, document, event, Today item, or Calendar item.
- `beast_goal_contributions` records module-owned evidence, progress, milestones, recommendations, and reviews against the canonical goal.

An integration stores only the canonical `goal_id` and `owner_id` pointer in the appropriate link or contribution record. Profile data remains owned by its source module. Goal data remains owned by BeastGoals.

## Planning model

The hub adds description, priority, timeline, direct progress, notes, tags, linked professional, custom category, source metadata, archive time, and recoverable deletion time. The existing goal categories remain compatible and add Family; the user-facing hub groups Education and Career together and labels Money as Financial.

Every editable field can have a row in `beast_goal_field_sources`. That row identifies the member, professional, module, document, import, or system source without duplicating the field value. Member edits update provenance to `Member`. Future integrations must provide a plain-language source label and may attach bounded evidence metadata.

Milestones, dependencies, prerequisites, blockers, recurring actions, linked documents, module records, recommendations, and lifecycle events remain normalized in their existing tables. Delete is a recoverable `deleted_at` marker so audit history is preserved.

## Digital Professional access

The shared registry in `src/lib/platform/lifePlanning.ts` defines category-scoped consumers:

- Guidance Counselor reads Education and Career goals, recommends paths and milestones, and contributes progress.
- Money Coach reads Financial goals, recommends next actions and timelines, and contributes progress.
- Health Advisor reads Health goals, recommends safe next actions, and contributes progress without presenting working ideas as medical fact.

Adding a future professional requires one registry entry with its label, categories, source module, and permissions. Professionals never receive another member's goals; database RLS and compound owner foreign keys remain the enforcement boundary.

## Lifecycle and Today

Members can add, edit, pause, resume, complete, archive, recoverably delete, merge, and split goals. Merge archives the source and records the canonical target in lifecycle history. Split creates a new member-owned goal from an editable copy. All material transitions append a lifecycle event.

Today ranks active goals using declared priority, overdue milestones, blocked state, deadlines, and recency. It surfaces up to three priorities, recent goal updates, future goal and milestone deadlines, and shared goal actions alongside module recommendations. Absence of goal data is shown as unavailable or empty; it is never converted into progress.

## Security and migration

Migration `20260801000700_transform_beast_goals_life_planning_hub.sql` is additive. The new provenance table has owner-only RLS and a compound `(goal_id, owner_id)` foreign key to the canonical goal. No public policy is added. Existing owner policies and data remain unchanged.

Production release requires the normal isolated migration review, dry run, explicit approval, and production verification. BO-501 must not repair or apply unrelated migration-history drift.
