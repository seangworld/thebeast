# BA-134 — BeastAdmin layout standard

Canonical package: `BA-LYT-101`. The supplied `BA-134` identifier is retained
as historical provenance because it also identifies the released forward-only
migration reconciliation package.

## Status and purpose

BeastAdmin is the reference layout for future BeastOS applications and module
workspaces. This document defines an architectural philosophy, not a shared
runtime shell and not a requirement to retrofit existing modules.

Future modules should adopt this standard when their primary experience is a
set of related workspaces. A module may use a different interaction model when
its core experience materially benefits from it—for example, a conversation,
guided workflow, immersive tool, or focused activity runner. An exception must
remain intentional, responsive, accessible, and consistent with BeastOS
platform navigation.

## Reference layout

The standard has three layers with separate responsibilities.

### Navigation

- Provide one persistent left navigation rail as the primary workspace switcher.
- Use one route registry across desktop, tablet, and mobile presentations.
- Preserve active-route state, permissions, visibility, and relevant badges.
- Group destinations by user intent when a flat list becomes difficult to scan.
- Do not copy the complete workspace catalog into page headers or content cards.

Responsive layouts may present the rail in the platform navigation drawer. The
route hierarchy and terminology must remain the same rather than becoming a
second mobile information architecture.

### Header

Every workspace header provides:

- The current workspace title.
- One concise purpose statement.
- Contextual actions only.

Contextual actions operate on the current workspace, such as refresh, create,
save, export, or retry. The header must not become a route switcher or repeat
the persistent navigation rail.

### Content

The workspace body contains the interface specific to that workspace. It may
include cards, tables, dashboards, reports, forms, management tools, loading
states, empty states, and local task controls.

Cross-workspace links are appropriate when they advance the current task and
their reason is clear in context. They must not form a duplicate navigation
menu.

## Module adoption boundary

The layout standard governs presentation responsibilities only. Each module
continues to own its domain logic, terminology, permissions, persistence,
professional behavior, calculations, and safety requirements.

Adopting the standard must not:

- Move module data ownership into BeastAdmin or BeastOS presentation code.
- Replace a module's professional-first or conversation-first experience.
- Weaken authorization, household boundaries, RLS, or privacy controls.
- Require a shared database schema for layout concerns.
- Force a dense dashboard onto an interaction model that needs focus.

## Adoption checklist

Before a future module adopts the reference layout, confirm:

1. The left rail is the only primary workspace-switching model.
2. Every destination remains discoverable at supported viewport sizes.
3. Every header contains a title and purpose, with only contextual actions.
4. Workspace content owns its cards, tables, reports, and management tools.
5. Cross-workspace links have a task-specific reason.
6. Responsive behavior uses the same route registry and permissions.
7. Domain ownership and runtime behavior remain inside the adopting module.

## Current scope

This package documents future adoption only. It does not modify BeastMoney,
BeastEducation, BeastHealth, BeastHome, or any other module. It introduces no
runtime behavior, database change, migration, or deployment requirement.
