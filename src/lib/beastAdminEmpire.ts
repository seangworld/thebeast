export type EmpireProductId =
  | "seangworld"
  | "the-beast"
  | "beastfusion"
  | "seangworldnews"
  | "change-the-world";

export type EmpireProduct = {
  id: EmpireProductId;
  name: string;
  purpose: string;
  controlLinks: readonly { label: string; href: string }[];
  analyticsLink: { label: string; href: string; state: "available" | "needs-product-filter" };
};

export const empireProducts: readonly EmpireProduct[] = [
  {
    id: "seangworld",
    name: "SEANGWORLD.com",
    purpose: "Company site, public brand, products, resources, trust, and company-level audience growth.",
    controlLinks: [
      { label: "Company intelligence", href: "/dashboard/admin/intelligence" },
      { label: "Revenue", href: "/dashboard/admin/ads" },
      { label: "Marketing", href: "/dashboard/admin/marketing" },
    ],
    analyticsLink: { label: "Company analytics", href: "/dashboard/admin/intelligence", state: "available" },
  },
  {
    id: "the-beast",
    name: "The Beast",
    purpose: "The member application and every Beast product experience, excluding the BeastFusion platform.",
    controlLinks: [
      { label: "Members", href: "/dashboard/admin/members" },
      { label: "Member messages", href: "/dashboard/admin/messages" },
      { label: "Beta feedback", href: "/dashboard/admin/feedback" },
    ],
    analyticsLink: { label: "The Beast analytics", href: "/dashboard/admin/metrics", state: "available" },
  },
  {
    id: "beastfusion",
    name: "BeastFusion",
    purpose: "Capacity, usage, digital staff, releases, platform health, governance, and delivery operations.",
    controlLinks: [
      { label: "Development console", href: "/dashboard/admin/development" },
      { label: "Platform health", href: "/dashboard/admin/platform-health" },
      { label: "Digital staff history", href: "/dashboard/admin/execution-history" },
    ],
    analyticsLink: { label: "Capacity and AI analytics", href: "/dashboard/admin/analytics", state: "available" },
  },
  {
    id: "seangworldnews",
    name: "SEANGWORLDNEWS",
    purpose: "Sources, locations, headlines, Fact Desk, newsroom automation, and News audience performance.",
    controlLinks: [{ label: "News operations", href: "/dashboard/admin/news" }],
    analyticsLink: { label: "News analytics", href: "/dashboard/admin/news", state: "needs-product-filter" },
  },
  {
    id: "change-the-world",
    name: "Change the World",
    purpose: "The public civic-action product, its content, participation, and impact outcomes.",
    controlLinks: [],
    analyticsLink: { label: "Change the World analytics", href: "/dashboard/admin/change-the-world", state: "needs-product-filter" },
  },
] as const;

export function findEmpireProduct(id: EmpireProductId) {
  return empireProducts.find((product) => product.id === id)!;
}

export type EmpireCostCategory =
  | "hosting"
  | "vercel"
  | "supabase"
  | "google"
  | "advertising"
  | "openai"
  | "other";

export const empireCostCategories: readonly {
  id: EmpireCostCategory;
  label: string;
  evidence: string;
}[] = [
  { id: "hosting", label: "Hosting and domains", evidence: "Invoice or registrar statement" },
  { id: "vercel", label: "Vercel", evidence: "Provider usage or invoice" },
  { id: "supabase", label: "Supabase", evidence: "Provider usage or invoice" },
  { id: "google", label: "Google services", evidence: "Provider usage or invoice" },
  { id: "advertising", label: "Advertising", evidence: "Campaign spend record" },
  { id: "openai", label: "OpenAI credits and API", evidence: "Project usage or invoice" },
  { id: "other", label: "Other operating costs", evidence: "Owner-confirmed expense" },
] as const;

export type EmpireCostEntry = {
  category: EmpireCostCategory;
  amount: number | null;
  currency: "USD";
  period: "monthly";
  evidence: string | null;
};

export function calculateEmpireCostRecovery(input: {
  costs: readonly EmpireCostEntry[];
  revenue: number | null;
  support: number | null;
}) {
  const required = empireCostCategories.filter((category) => category.id !== "other");
  const known = new Map(input.costs.map((entry) => [entry.category, entry]));
  const complete = required.every((category) => {
    const entry = known.get(category.id);
    return typeof entry?.amount === "number"
      && Number.isFinite(entry.amount)
      && entry.amount >= 0
      && Boolean(entry.evidence?.trim());
  });
  if (!complete) return { complete: false as const, totalCost: null, recovered: null, gap: null, recoveryRate: null };

  const totalCost = input.costs.reduce((total, entry) => total + (entry.amount ?? 0), 0);
  const recovered = input.revenue === null || input.support === null ? null : input.revenue + input.support;
  return {
    complete: true as const,
    totalCost,
    recovered,
    gap: recovered === null ? null : Math.max(0, totalCost - recovered),
    recoveryRate: recovered === null || totalCost <= 0 ? null : recovered / totalCost,
  };
}
