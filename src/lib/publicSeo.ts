export const beastOSProductionOrigin = "https://thebeast.seangworld.com";

export const beastOSPublicRoutes = ["/", "/release-notes"] as const;

export const beastOSNonIndexableRoutes = [
  "/accept-invitation",
  "/api/",
  "/auth/",
  "/dashboard/",
  "/forgot-password",
  "/login",
  "/reset-password",
] as const;
