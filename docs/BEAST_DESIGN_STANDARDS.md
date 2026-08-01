# Beast Design Standards

BO-504 establishes BeastOS as the visual design language for the Beast ecosystem. An application may have its own Professional, icon, and subtle accent, but it does not create a separate theme.

## Experience principles

1. A member is always inside Beast. Navigation, page structure, surfaces, controls, feedback, and conversation behavior remain familiar across applications.
2. Content and the Digital Professional create application identity. Color supports recognition; it does not dominate the screen.
3. Shared components are the default. A local component is appropriate only when the interaction or domain meaning is genuinely different.
4. Interfaces reveal one recommendation, one next step, and one clear action before secondary detail.
5. Unavailable, empty, loading, and error states are distinct and honest. Missing data is never displayed as a confirmed zero.

## Canonical tokens

Tokens live in `src/app/globals.css`, are exposed to Tailwind in `tailwind.config.ts`, and are described programmatically in `src/lib/platform/designSystem.ts`.

| Group | Canonical tokens | Standard |
| --- | --- | --- |
| Background | `--beast-background`, `--beast-background-deep` | One dark operating-system canvas |
| Surface | `--beast-surface`, `--beast-surface-raised`, `--beast-surface-inset`, `--beast-surface-overlay` | Elevation, not application themes |
| Border | `--beast-border`, `--beast-border-strong` | Quiet separation with stronger boundaries only when needed |
| Text | `--beast-text`, `--beast-text-secondary`, `--beast-text-muted`, `--beast-text-subtle` | White primary text with ordered supporting contrast |
| Meaning | `--beast-success`, `--beast-warning`, `--beast-danger` | Status colors retain the same meaning everywhere |
| Accent | `--beast-accent` | Set once by the dashboard shell for the active application |
| Shape | `--beast-radius-sm` through `--beast-radius-xl` | Consistent control, card, and overlay geometry |
| Depth | `--beast-shadow-sm`, `--beast-shadow-md`, `--beast-shadow-overlay` | Three predictable elevation levels |
| Motion | `--beast-transition-fast`, `--beast-transition-standard` | Short, purposeful feedback with reduced-motion support |

Typography uses the shared system sans stack. Page titles, section titles, body copy, labels, and metadata follow a consistent hierarchy; modules do not introduce their own font families.

## Module accents

The dashboard shell supplies `data-beast-module` and changes only `--beast-accent`.

| Experience | Accent | Identity source |
| --- | --- | --- |
| BeastOS and Director | Beast Blue | Beast platform and Director identity |
| BeastMoney | Green | Money Coach |
| BeastEducation | Blue-indigo | Guidance Counselor |
| BeastHealth | Red | Health Advisor |
| BeastHome | Orange | Home application icon and content |
| BeastGoals | Yellow | Shared life-planning context |
| BeastDocuments | Slate | Shared records context |
| BeastAdmin | Amber | Owner-only administrative context |

Accent color may mark a badge, focus ring, active navigation item, button, or narrow card edge. Page backgrounds, card families, typography, and control geometry stay canonical.

## Component library

- `PlatformPageHeader`: shared page identity, purpose, actions, and optional plain-language guidance.
- `DashboardCard`, `SectionHeader`, and `MetricTile`: standard dashboard hierarchy and elevation.
- `ModuleBadge` and `beast-status-badge`: application and status labels.
- `beast-button`, `beast-button-secondary`, and `beast-input`: shared controls and focus behavior.
- `AdaptiveTable` and `beast-table-wrap`: readable tables with mobile card transformation or scoped dense-region scrolling.
- `beast-dialog` and `beast-drawer`: viewport-clamped overlays.
- `GuidedEmptyState`, `beast-loading-state`, and `beast-error-state`: honest, accessible feedback.
- `ProfessionalConversationWorkspace`, `ProfessionalConversationTimeline`, and `AgentExperience`: one conversation framework with each Professional's avatar, name, role, and accent preserved.

The shared dashboard layout owns desktop rail, mobile header, bottom navigation, spacing, safe areas, and the active module context. Application pages should use `beast-page` and `beast-container` instead of introducing another application shell.

## Navigation

Navigation follows the BeastOS information architecture. Active items use the current application accent, while inactive items use neutral Beast surfaces. Desktop, compact tablet rail, mobile header, mobile sheet, and bottom navigation are presentations of the same route model. Controls require visible focus, meaningful labels, and at least a 44-pixel mobile target.

## Cards, forms, tables, and overlays

Cards use canonical surfaces, borders, radius, shadow, and spacing. Forms keep labels visible to assistive technology, identify errors near the field, and never rely on placeholder text as the label. Tables reflow into cards when practical; only explicitly dense regions use horizontal scrolling. Dialogs and drawers stay inside the viewport, close with Escape, trap or manage focus as appropriate, and return focus to the opener.

## AI Professional presentation

The shared conversation framework controls message spacing, bubbles, history, scrolling, composer behavior, loading, empty, and error states. The Professional supplies avatar, name, role description, and accent. A new Professional extends the identity registry and does not fork the conversation UI.

## Accessibility

- All interactive controls are keyboard reachable and have a visible accent-aware focus indicator.
- Semantic headings, landmarks, labels, live regions, and status roles describe structure and change.
- Text and status meaning do not depend on color alone.
- Touch targets are at least 44 pixels on mobile.
- Motion respects `prefers-reduced-motion`.
- Dense content has a focusable, scoped fallback instead of causing page-level overflow.

## Responsive behavior

Pages reflow at desktop, tablet, and mobile widths. Containers and grid children use `min-width: 0`; content wraps; images and media stay within their containers. Global horizontal clipping is prohibited because it hides layout defects and keyboard-visible content. Only tables and explicitly dense tools may scroll horizontally.

## Plain-language standard and the 12-Year-Old Test

Every member-facing workspace should make these answers clear:

1. What is this?
2. Why am I filling this out?
3. How will Beast use this?
4. What happens next?

Prefer everyday language, short sentences, and one clear next action. Before a page is complete, ask whether an average 12-year-old could understand what the page is for without another person explaining it. Rewrite labels and introductions when the answer is no.

## Adoption and future products

Money, Education, Health, Home, Goals, Documents, Director, shared BeastOS services, and BeastAdmin inherit the active shell and tokens. Existing domain calculations, ownership, permissions, RLS, and safety rules are outside this presentation contract and must not be changed by visual work.

SEANGWORLD remains the public marketing site. Its separate repository should consume the same token names, type hierarchy, button geometry, cards, forms, spacing, focus behavior, and navigation rhythm while retaining marketing heroes and public content. This repository does not couple SEANGWORLD deployment or runtime code to Beast; cross-site adoption should be released independently.

New products begin with the canonical token and component contracts. A new theme requires explicit design-system governance, not a local page decision.
