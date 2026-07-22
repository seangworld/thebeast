# BeastEducation — Generation 2

BeastEducation is the product evolution of BeastEducation. Its mission is to help a person discover, plan, and achieve educational, professional, and personal growth. The primary AI relationship is the **Guidance Counselor**. Teaching remains available as supporting help when a roadmap exposes a specific knowledge gap; BeastEducation is not an AI tutoring platform and does not compete with course providers.

## Product architecture

- **Education Profile** records the user's situation, interests, strengths, goals, constraints, preferred sources, available time, and optional target date.
- **Discovery onboarding** progressively asks only for missing destination, starting-point, motivation, and constraint context. An incomplete profile still produces a useful next step.
- **Guidance planning** assembles career, education, and certification considerations with a skill-gap analysis and a personalized now/next/later roadmap.
- **Long-term progress** records meaningful roadmap events and evidence rather than treating content consumption as success.
- **External recommendations** deep-link to YouTube, Khan Academy, Coursera, Microsoft Learn, books, and official certification sources. Recommendations carry verification guidance and never guarantee outcomes, rank providers, resell content, or replace provider authority.
- **Learning support** reuses the existing Tutor, lesson, activity, practice, and mastery capabilities behind the guidance relationship.

## Compatibility boundary

`/dashboard/education` is the canonical product route. Existing `/dashboard/learning` routes remain available as compatibility routes so saved links and cross-module actions do not break. The internal `learning` module key, database contracts, and existing learning-domain types remain stable to avoid a destructive data migration; user-facing identity is BeastEducation.

## Generation 2 alignment

The Guidance Counselor starts from the user's story, recommends the next useful action before a dead end appears, remembers meaningful evidence, and progressively completes the plan. Responsive cards and fields use constrained grids and `min-width: 0` behavior. Cross-module ownership remains unchanged: BeastEducation owns the guidance relationship and contributes source-owned actions through existing BeastOS contracts.
