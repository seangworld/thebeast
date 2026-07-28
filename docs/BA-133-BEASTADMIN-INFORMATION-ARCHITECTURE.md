# BA-133 — BeastAdmin information architecture cleanup

Canonical package: `BA-IA-101`. The supplied `BA-133` identifier is retained as
historical provenance because it also identifies the Supabase migration
reconciliation audit.

## Information architecture

BeastAdmin uses one persistent navigation model with three distinct layers.
Each layer has one responsibility.

### Left navigation

The left rail is the primary BeastAdmin navigation and workspace switcher. It
persists while the owner moves between workspaces and remains the route source
for desktop and responsive navigation.

Workspaces are grouped by owner intent:

- **Operations:** CEO Mode, Development Console, Platform Health.
- **Delivery:** Migration Status, SQL Explorer, Release Center, Roadmap.
- **Insights:** Executive Metrics, AI Analytics, Knowledge Inspector, Ecosystem Map.
- **Members:** Members, Member Messages, Beta Feedback.
- **Governance:** Modules, Feature Flags, Prompt Library, Planned Workspaces, Settings.

Every BeastAdmin route appears exactly once in the left-rail registry. Grouping
must not hide, rename, or remove a route.

The permanent canonical routes for the affected workspaces are:

- **Platform Health:** `/dashboard/admin/platform-health`
- **Prompt Library:** `/dashboard/admin/prompt-library`

The historical short-form routes remain compatibility redirects only and must
not be used by navigation, workspace links, breadcrumbs, or route helpers.
Platform Health continues to read from `/api/admin/platform-health`; page-route
standardization does not rename the established API.

### Page header

The page header identifies the current workspace and explains its purpose. It
may contain actions that operate on the current workspace, such as refresh,
create, export, or save.

The page header must not contain workspace-switching navigation, route menus,
or copies of the left rail.

### Workspace content

The workspace body owns cards, tables, dashboards, reports, management tools,
and their local controls. Links to another workspace are appropriate only when
they advance the task in context—for example, opening Migration Status from an
Executive Metrics diagnostic. They are not a second navigation menu.

## Duplicate-navigation rule

Do not repeat the BeastAdmin route catalog in a header, dashboard card, or
workspace toolbar. Keep a cross-workspace link only when its label and nearby
copy explain the workflow reason for leaving the current workspace.

## Responsive behavior

Desktop and responsive navigation use the same route registry, ordering, group
labels, active-route behavior, permissions, and unread indicators. Responsive
presentation may collapse into the existing navigation drawer, but it must not
introduce a separate information architecture or horizontal page navigation.

## Ownership boundaries

This cleanup changes presentation and navigation organization only. Canonical
route naming and compatibility redirects do not change authentication,
authorization, business logic, persisted data, or database schema.
