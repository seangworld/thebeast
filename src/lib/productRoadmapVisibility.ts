import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";

export const productRoadmapStatuses = [
  "available",
  "preview_beta",
  "in_development",
  "coming_soon",
] as const;

export type ProductRoadmapStatus = (typeof productRoadmapStatuses)[number];
export type ProductRoadmapAudience = "public" | "member" | "owner";

export const productRoadmapStatusLabels: Record<ProductRoadmapStatus, string> = {
  available: "Available",
  preview_beta: "Preview / Beta",
  in_development: "In Development",
  coming_soon: "Coming Soon",
};

export type ProductRoadmapItem = {
  slug: string;
  capability: string;
  product: "BeastHome" | "BeastHealth" | "BeastMoney" | "BeastEducation";
  module: ModuleKey;
  status: ProductRoadmapStatus;
  summary: string;
  problem: string;
  availability: string;
  audiences: readonly ProductRoadmapAudience[];
  minimumMemberAge: number;
  currentHref?: string;
  sourcePackage: string;
  sourceReference: string;
  implementationPackage?: string;
};

export const productRoadmapItems: readonly ProductRoadmapItem[] = [
  {
    slug: "home-inventory",
    capability: "Photo-to-Home-Inventory",
    product: "BeastHome",
    module: "home",
    status: "available",
    summary: "Build a private, dated room inventory from suggestions you review and confirm.",
    problem: "Home records are difficult to create and keep organized room by room.",
    availability: "Available now to eligible adult Beast members.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    currentHref: "/dashboard/home/inventory",
    sourcePackage: "BHM-002",
    sourceReference: "evidence/BHM-002-completion.md",
  },
  {
    slug: "home-sentinel",
    capability: "BeastHome Sentinel",
    product: "BeastHome",
    module: "home",
    status: "coming_soon",
    summary: "A future home-awareness and maintenance-support experience.",
    problem: "Important household maintenance and home-awareness needs can be easy to miss.",
    availability: "Coming Soon. Sentinel is not available and cannot be used yet.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    sourcePackage: "BO-UX-002",
    sourceReference: "roadmaps/active/BeastHome.md",
  },
  {
    slug: "home-shield",
    capability: "BeastHome Shield",
    product: "BeastHome",
    module: "home",
    status: "coming_soon",
    summary: "A future home-safety and household-protection support experience.",
    problem: "Household safety information and protective next steps are often scattered.",
    availability: "Coming Soon. Shield is not available and cannot be used yet.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    sourcePackage: "BO-UX-002",
    sourceReference: "roadmaps/active/BeastHome.md",
  },
  {
    slug: "health-advisor",
    capability: "Health Advisor",
    product: "BeastHealth",
    module: "health",
    status: "available",
    summary: "Organize saved health information and prepare questions for qualified clinicians.",
    problem: "Health records and appointment questions can be hard to organize over time.",
    availability: "Available now to eligible adult Beast members.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    currentHref: "/dashboard/health/ai-advisor",
    sourcePackage: "BH-REL-02",
    sourceReference: "roadmaps/active/BeastHealth.md",
  },
  {
    slug: "ai-fitness-trainer",
    capability: "AI Fitness Trainer",
    product: "BeastHealth",
    module: "health",
    status: "coming_soon",
    summary: "A future personalized fitness-planning and progress-support experience.",
    problem: "People may need clearer structure for fitness goals, routines, and progress.",
    availability: "Coming Soon. AI Fitness Trainer is not available and cannot be used yet.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    sourcePackage: "BO-UX-002",
    sourceReference: "roadmaps/active/BeastHealth.md",
  },
  {
    slug: "money-coach",
    capability: "Money Coach",
    product: "BeastMoney",
    module: "money",
    status: "available",
    summary: "Understand current financial records, calculations, and possible next actions.",
    problem: "Financial records are difficult to turn into one understandable plan.",
    availability: "Available now to eligible adult Beast members.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    currentHref: "/dashboard/money/coach",
    sourcePackage: "BM-42",
    sourceReference: "roadmaps/active/BeastMoney.md",
  },
  {
    slug: "connected-balances",
    capability: "Connected Balances",
    product: "BeastMoney",
    module: "money",
    status: "coming_soon",
    summary: "Future read-only visibility of bank and credit-card balances inside BeastMoney.",
    problem: "Manually maintained balances can become stale between financial reviews.",
    availability: "Coming Soon. Connected Balances is not available; no institution can be connected and no balance can be retrieved yet.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 18,
    sourcePackage: "BO-UX-002",
    sourceReference: "roadmaps/active/BeastMoney.md",
  },
  {
    slug: "ai-tutor-homework-helper",
    capability: "AI Tutor & Homework Helper",
    product: "BeastEducation",
    module: "learning",
    status: "available",
    summary: "Get age-aware tutoring, homework guidance, and shown-work review.",
    problem: "Learners need explanations and guided correction tailored to what they understand.",
    availability: "Available now to eligible BeastEducation members.",
    audiences: ["public", "member", "owner"],
    minimumMemberAge: 0,
    currentHref: "/dashboard/education/tutor",
    sourcePackage: "BE-301",
    sourceReference: "evidence/BE-301-completion.md",
  },
] as const;

export function getProductRoadmapItem(slug: string) {
  return productRoadmapItems.find((item) => item.slug === slug) || null;
}

export function getProductRoadmapItemForAudience(
  slug: string,
  audience: ProductRoadmapAudience
) {
  const item = getProductRoadmapItem(slug);
  return item && isProductRoadmapItemVisibleTo(item, audience) ? item : null;
}

export function getProductRoadmapItemsForAudience(audience: ProductRoadmapAudience) {
  return productRoadmapItems.filter((item) => isProductRoadmapItemVisibleTo(item, audience));
}

export function getProductRoadmapItemsForProduct(
  product: ProductRoadmapItem["product"],
  audience: ProductRoadmapAudience = "member"
) {
  return getProductRoadmapItemsForAudience(audience).filter((item) => item.product === product);
}

export function isProductRoadmapItemVisibleTo(
  item: ProductRoadmapItem,
  audience: ProductRoadmapAudience
) {
  return item.audiences.includes(audience);
}

export function isUnavailableRoadmapStatus(status: ProductRoadmapStatus) {
  return status === "coming_soon" || status === "in_development";
}

export function hasValidDevelopmentTruth(item: ProductRoadmapItem) {
  return item.status !== "in_development" || Boolean(item.implementationPackage);
}
