# Generation 2 UX Standards

Generation 2 experiences guide users forward, adapt to the device in front of them, and preserve work progressively. The shared implementation lives in `DashboardPrimitives`, `generationTwoUX`, `useProgressiveSave`, and the global responsive contract.

## Required page contract

Every new or materially revised page must:

- keep the document within the viewport at supported phone, tablet, laptop, desktop, and zoom widths;
- support keyboard, standard mouse, touchpad, and touch controls with visible focus and 44px mobile targets;
- replace passive empty copy with a `GuidedEmptyState` containing a primary next action, a safe secondary route, and evidence-aware AI guidance where useful;
- expose progressive save status for editable multi-step journeys and retain a recoverable draft when server persistence is unavailable;
- provide a useful next step or safe return path;
- progressively disclose secondary explanation in `ExpandableDetailPanel`;
- use `AdaptiveTable` for new dense records so phones receive cards, while large screens retain semantic tables;
- keep source modules responsible for business logic and calculations.

## Overflow policy

Page-level horizontal scrolling is prohibited. Containers must use `min-width: 0`, responsive grid tracks, wrapping text, and constrained controls. An existing dense table may temporarily use the focusable `.beast-table-wrap` fallback, but new and revised tables should provide a card representation on narrow screens. Internal scrolling is a containment fallback, not the primary mobile interaction.

## Progressive saving

`useProgressiveSave` debounces changes, exposes idle/saving/saved/error state, and never hides a failed save. Product implementations decide whether the durable target is a server repository or a local recoverable draft. Sensitive data must not be stored locally without an approved data policy.

## Compliance

`auditGenerationTwoUX` provides a shared checklist contract. Responsive Playwright remains the release regression matrix; when authenticated state is unavailable, it must skip rather than fabricate access. Business-specific accessibility and task-completion tests remain owned by each module.
