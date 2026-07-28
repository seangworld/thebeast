import type { MetadataRoute } from "next";
import {
  beastOSProductionOrigin,
  beastOSPublicRoutes,
} from "../lib/publicSeo";

export default function sitemap(): MetadataRoute.Sitemap {
  return beastOSPublicRoutes.map((path) => ({
    url: `${beastOSProductionOrigin}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
