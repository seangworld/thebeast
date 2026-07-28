import type { MetadataRoute } from "next";
import {
  beastOSNonIndexableRoutes,
  beastOSProductionOrigin,
} from "../lib/publicSeo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...beastOSNonIndexableRoutes],
    },
    sitemap: `${beastOSProductionOrigin}/sitemap.xml`,
    host: beastOSProductionOrigin,
  };
}
