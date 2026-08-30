export const beastOSProductionOrigin = "https://thebeast.seangworld.com";
export const seangworldProductionOrigin = "https://www.seangworld.com";

export const beastOSFooterLinks = {
  mainSite: seangworldProductionOrigin,
  developmentAi: `${beastOSProductionOrigin}/ai-development-staff`,
  memberAi: `${beastOSProductionOrigin}/ai-specialists`,
  privacy: `${seangworldProductionOrigin}/privacy`,
  terms: `${seangworldProductionOrigin}/terms`,
} as const;

export const beastOSPublicRoutes = [
  "/",
  "/release-notes",
  "/ai-development-staff",
  "/ai-development-staff/methodology",
  "/ai-development-staff/orchestrator-3",
  "/ai-development-staff/observer-agent",
  "/ai-development-staff/proposal-agent",
  "/ai-development-staff/developer-agent",
  "/ai-development-staff/reviewer-agent",
  "/ai-development-staff/outcome-agent",
  "/ai-specialists",
  "/ai-specialists/methodology",
  "/ai-specialists/money-coach",
  "/ai-specialists/guidance-counselor",
  "/ai-specialists/tutor",
  "/ai-specialists/health-advisor",
] as const;

export const beastOSNonIndexableRoutes = [
  "/accept-invitation",
  "/api/",
  "/auth/",
  "/dashboard",
  "/forgot-password",
  "/login",
  "/reset-password",
] as const;
