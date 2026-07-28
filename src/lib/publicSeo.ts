export const beastOSProductionOrigin = "https://thebeast.seangworld.com";
export const seangworldProductionOrigin = "https://www.seangworld.com";

export const beastOSFooterLinks = {
  mainSite: seangworldProductionOrigin,
  privacy: `${seangworldProductionOrigin}/privacy`,
  terms: `${seangworldProductionOrigin}/terms`,
} as const;

export const beastOSPublicRoutes = ["/", "/release-notes"] as const;

export const beastOSNonIndexableRoutes = [
  "/accept-invitation",
  "/api/",
  "/auth/",
  "/dashboard",
  "/forgot-password",
  "/login",
  "/reset-password",
] as const;
