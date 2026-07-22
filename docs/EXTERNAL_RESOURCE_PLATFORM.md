# External Resource Platform — G2-PLT-EXT-001

BeastOS owns one shared External Resource Platform for BeastEducation, BeastMoney, BeastHealth, SeanGWorld, and future modules. Modules and their agents decide what would benefit the user and explain why. They pass those agent-generated candidates to the shared platform, which resolves provider metadata, links, pricing labels, optional affiliate behavior, disclosure, and privacy-minimal events. Modules must not create separate provider URL catalogs or external-resource card behavior.

## Architecture

- `ExternalResourceProviderRegistry` registers unlimited providers and exposes active providers by category. Each provider declares identity, description, website, normal and optional resource URL, icon, pricing model, free status, lifecycle status, optional affiliate configuration, and future API/rating capabilities.
- `requestExternalResourceRecommendations` is the module-agent boundary. A module supplies its agent id and benefit-first candidates containing title, provider, rationale, time, difficulty, and cost. The platform enriches those candidates without ranking them.
- Affiliate resolution is optional and occurs only after the module agent has selected a provider. Enabling an affiliate link cannot alter the candidate list, order, title, or recommendation rationale. Applied referral links carry disclosure text.
- `createExternalResourceEvent` produces `recommendation-shown`, `resource-opened`, and `provider-selected` events containing only recommendation, module, and provider identifiers. Durable analytics transport is future work; the contract deliberately excludes user profile and recommendation text.
- `ExternalResourceCard` presents consistent provider, rationale, cost, difficulty, estimated time, verification, disclosure, and open controls. Every external link uses a new tab with `noopener noreferrer` so the Beast session remains in place.

## Initial providers and modules

The seed registry includes YouTube, Khan Academy, Coursera, Microsoft Learn, LinkedIn Learning, edX, O'Reilly, Udemy, certification providers, books, professional organizations, and schools. Initial module identifiers are BeastEducation, BeastMoney, BeastHealth, and SeanGWorld. Any future module can use the same typed request API without changing the registry implementation.

## Trust and boundaries

User benefit is the only valid basis for recommendation selection. Affiliate availability, commission, or campaign configuration must never influence recommendation quality or ordering. The platform does not implement advertising, payments, provider ratings, provider APIs, credential handling, or user-level click profiling. External providers remain authoritative for their content, price, availability, credentials, clinical claims, financial claims, and terms.
