import type { MetadataRoute } from "next";

const baseUrl = (
  process.env.NEXT_PUBLIC_BEAST_SITE_URL || "https://thebeast.seangworld.com"
).replace(/\/$/, "");

const publicRoutes = [
  "",
  "/about",
  "/beast",
  "/docs",
  "/privacy",
  "/release-notes",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return Array.from(new Set(publicRoutes)).sort().map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/beast" ? 0.9 : 0.6,
  }));
}
