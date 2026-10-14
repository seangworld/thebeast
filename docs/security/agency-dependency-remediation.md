# Agency dependency remediation

The recovered preparation commit is an intermediate baseline, not the lost verified candidate. New checks must establish this reconstruction's results.

Tailwind 3's transitive braces dependency has no patched compatible release (GHSA-vfj7-8cjw-p6xm). The previously approved Tailwind 4 migration uses Tailwind 4.3.3. The official upgrade tool identified compatibility changes; optional template rewrites are excluded in favor of the bounded legacy CSS layer described below. PostCSS uses the dedicated Tailwind plugin. Existing application styles use the components layer so responsive utility overrides retain precedence; module-scoped theme aliases are inline. Existing linear gradients retain sRGB interpolation.

The Next 15 ESLint plugin only calls fast-glob's globSync with onlyDirectories. A narrowly scoped npm alias to maintained tinyglobby 0.2.17 removes that vulnerable transitive dependency without disabling lint rules. A regression test exercises that interface and equivalent resolved directory destinations (the alias returns relative directory paths, consumed by Next through path.join and filesystem lookups). Other Next dependencies are unchanged. The complete npm audit remains mandatory before production builds.

Supported browser floor: Safari 16.4, Chrome 111 and Firefox 128. Reference: https://tailwindcss.com/docs/upgrade-guide

No production rollout is authorized by this document. Desktop/mobile visual acceptance, exact-head tests/audit/build and migration/authentication checks remain release requirements.

## Excluded unrelated change

The styling-only change to `src/app/dashboard/admin/marketing/DirectYouTubePanel.tsx` is excluded by owner direction. That file retains its exact existing PR baseline content. A legacy `break-words` CSS compatibility utility preserves the unchanged component’s wrapping behavior under Tailwind 4. No YouTube integration, account access, credentials, connection or publication behavior is changed by this candidate.

The following unrelated marketing templates also retain their exact existing PR baseline bytes. Their optional utility-syntax conversions are excluded; general legacy wrapping/focus-outline compatibility and compiled arbitrary-value utility checks preserve existing styling. These component files have no candidate diff.

- `src/app/dashboard/admin/marketing/BeastMarketingOverviewSummary.tsx`
- `src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx`
- `src/app/dashboard/admin/marketing/CampaignReviewEvidence.tsx`
- `src/app/dashboard/admin/marketing/GrowthCyclePanel.tsx`
- `src/app/dashboard/admin/marketing/MarketingFoundationPage.tsx`
- `src/app/dashboard/admin/marketing/MarketingSectionNav.tsx`
- `src/app/dashboard/admin/marketing/SocialWorkspace.tsx`
- `src/app/dashboard/admin/marketing/VideoGrowthEnginePanel.tsx`
- `src/app/dashboard/admin/marketing/page.tsx`
- `src/app/dashboard/admin/marketing/publishing/KdpPublishingFactoryPanel.tsx`
- `src/app/dashboard/operations/marketing/page.tsx`

After the production build, run `node scripts/verify-agency-legacy-css.mjs` for 27 compiled compatibility checks, including wrapping, focus outlines, original radii/shadows, sRGB gradients, blur, flex shrinking, arbitrary sizing/aspect ratio/opacity, important modifiers and responsive media queries.

## Scope-minimized compatibility

All optional template-only Tailwind spelling conversions and their source-text expectation changes are excluded, including existing Agency templates. Existing component bytes are preserved from the recovered PR baseline; the sole component change in this remediation is the required private license page's dynamic-rendering declaration, with its authentication checks intact. The dependency migration uses a small shared legacy compatibility layer for wrapping, focus outlines, original small radii/shadows, backdrop blur, flex shrinking and sRGB gradients instead. Arbitrary values, responsive variants and important modifiers are checked in generated production CSS. This avoids expanding the Agency release into unrelated integration or application template edits. Browser visual acceptance is still required before release; compiled CSS checks are not a substitute for that gate.
