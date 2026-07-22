export type ExternalResourceModule = "beasteducation" | "beastmoney" | "beasthealth" | "seangworld" | (string & {});
export type ExternalResourceCategory = "education" | "career" | "finance" | "health" | "books" | "certification" | "professional" | "general";
export type ExternalResourcePricingModel = "free" | "paid" | "free-or-paid" | "subscription" | "varies";
export type ExternalResourceDifficulty = "beginner" | "intermediate" | "advanced" | "varies";
export type ExternalProviderStatus = "active" | "planned" | "disabled";

export const initialExternalResourceModules = ["beasteducation", "beastmoney", "beasthealth", "seangworld"] as const;

export type ExternalResourceProvider = {
  id: string;
  name: string;
  categories: readonly ExternalResourceCategory[];
  description: string;
  website: string;
  normalUrl: string;
  resourceUrlTemplate?: string;
  icon: string;
  pricingModel: ExternalResourcePricingModel;
  isFree: boolean;
  status: ExternalProviderStatus;
  affiliate?: {
    supported: boolean;
    affiliateId?: string;
    referralUrl?: string;
    campaignParameters?: Readonly<Record<string, string>>;
    disclosure?: string;
  };
  capabilities: {
    futureApi: boolean;
    futureRatings: boolean;
  };
};

export type ExternalResourceRecommendation = {
  id: string;
  moduleId: ExternalResourceModule;
  agentId: string;
  providerId: string;
  providerName: string;
  providerIcon: string;
  title: string;
  whyRecommended: string;
  estimatedTime: string;
  difficulty: ExternalResourceDifficulty;
  cost: string;
  pricingModel: ExternalResourcePricingModel;
  isFree: boolean;
  externalUrl: string;
  affiliateApplied: boolean;
  disclosure?: string;
  verificationNote?: string;
};

export type AgentExternalResourceCandidate = {
  id: string;
  providerId: string;
  title: string;
  whyRecommended: string;
  query?: string;
  estimatedTime?: string;
  difficulty?: ExternalResourceDifficulty;
  cost?: string;
  verificationNote?: string;
};

export type ExternalResourceEventType = "recommendation-shown" | "resource-opened" | "provider-selected";
export type ExternalResourceEvent = {
  id: string;
  type: `external-resource.${ExternalResourceEventType}`;
  source: "beastos.external-resources";
  timestamp: string;
  payload: {
    recommendationId: string;
    moduleId: ExternalResourceModule;
    providerId: string;
  };
};

const DEFAULT_DISCLOSURE = "If you purchase through this link, Beast may earn a commission at no additional cost to you.";

function requireHttpUrl(value: string, label: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`${label} must use HTTP or HTTPS.`);
  return url;
}

function addCampaignParameters(value: string, parameters: Readonly<Record<string, string>> = {}) {
  const url = requireHttpUrl(value, "External resource URL");
  Object.entries(parameters).forEach(([key, parameterValue]) => {
    if (key && parameterValue) url.searchParams.set(key, parameterValue);
  });
  return url.toString();
}

export class ExternalResourceProviderRegistry {
  private readonly providers = new Map<string, ExternalResourceProvider>();

  register(provider: ExternalResourceProvider) {
    if (!provider.id.trim() || !provider.name.trim()) throw new Error("External resource providers require an id and name.");
    if (this.providers.has(provider.id)) throw new Error(`External resource provider ${provider.id} is already registered.`);
    requireHttpUrl(provider.website, "Provider website");
    requireHttpUrl(provider.normalUrl, "Provider normal URL");
    if (provider.resourceUrlTemplate) requireHttpUrl(provider.resourceUrlTemplate.replace("{query}", "example"), "Provider resource URL template");
    if (provider.affiliate?.referralUrl) requireHttpUrl(provider.affiliate.referralUrl, "Provider referral URL");
    this.providers.set(provider.id, Object.freeze({ ...provider }));
    return provider;
  }

  get(id: string) {
    return this.providers.get(id);
  }

  findByName(name: string) {
    return Array.from(this.providers.values()).find((provider) => provider.name === name);
  }

  require(id: string) {
    const provider = this.get(id);
    if (!provider) throw new Error(`Unknown external resource provider ${id}.`);
    return provider;
  }

  list({ category, status = "active" }: { category?: ExternalResourceCategory; status?: ExternalProviderStatus } = {}) {
    return Array.from(this.providers.values())
      .filter((provider) => provider.status === status && (!category || provider.categories.includes(category)))
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}

export const initialExternalResourceProviders: readonly ExternalResourceProvider[] = [
  provider("youtube", "YouTube", ["education", "career", "finance", "health", "general"], "Video explanations and practitioner perspectives.", "https://www.youtube.com/", "https://www.youtube.com/results?search_query={query}", "▶", "free", true),
  provider("khan-academy", "Khan Academy", ["education"], "Free academic and foundational learning.", "https://www.khanacademy.org/", "https://www.khanacademy.org/search?page_search_query={query}", "KA", "free", true),
  provider("coursera", "Coursera", ["education", "career", "certification"], "Courses, degrees, and professional certificates from external institutions.", "https://www.coursera.org/", "https://www.coursera.org/search?query={query}", "C", "free-or-paid", false),
  provider("microsoft-learn", "Microsoft Learn", ["education", "career", "certification"], "Official Microsoft role and technology learning paths.", "https://learn.microsoft.com/training/", "https://learn.microsoft.com/training/browse/?terms={query}", "ML", "free", true),
  provider("linkedin-learning", "LinkedIn Learning", ["education", "career", "professional"], "Professional and workplace skill courses.", "https://www.linkedin.com/learning/", "https://www.linkedin.com/learning/search?keywords={query}", "in", "subscription", false),
  provider("edx", "edX", ["education", "career", "certification"], "Programs and courses from universities and institutions.", "https://www.edx.org/", "https://www.edx.org/search?q={query}", "edX", "free-or-paid", false),
  provider("oreilly", "O'Reilly", ["education", "career", "professional"], "Technical books, courses, and live learning.", "https://www.oreilly.com/", undefined, "OR", "subscription", false),
  provider("udemy", "Udemy", ["education", "career", "professional"], "Instructor-created courses across professional and personal topics.", "https://www.udemy.com/", "https://www.udemy.com/courses/search/?q={query}", "U", "paid", false),
  provider("certification-providers", "Certification providers", ["certification", "career"], "Official credential issuers and current exam requirements.", "https://www.google.com/", "https://www.google.com/search?q=official+certification+{query}", "✓", "varies", false),
  provider("books", "Books", ["books", "education", "career", "finance", "health", "general"], "Books and durable reference material discoverable through libraries.", "https://search.worldcat.org/", "https://search.worldcat.org/search?q={query}", "▤", "varies", false),
  provider("professional-organizations", "Professional organizations", ["professional", "career", "education"], "Professional communities, conferences, standards, and career resources.", "https://www.google.com/", "https://www.google.com/search?q=official+professional+organization+{query}", "◎", "varies", false),
  provider("schools", "Schools", ["education", "career"], "Accredited education programs and institution outcome information.", "https://collegescorecard.ed.gov/", "https://collegescorecard.ed.gov/search/?search={query}", "⌂", "varies", false),
];

function provider(id: string, name: string, categories: readonly ExternalResourceCategory[], description: string, website: string, resourceUrlTemplate: string | undefined, icon: string, pricingModel: ExternalResourcePricingModel, isFree: boolean): ExternalResourceProvider {
  return { id, name, categories, description, website, normalUrl: website, resourceUrlTemplate, icon, pricingModel, isFree, status: "active", affiliate: { supported: false }, capabilities: { futureApi: false, futureRatings: false } };
}

export function createExternalResourcePlatform(providers: readonly ExternalResourceProvider[] = initialExternalResourceProviders) {
  const registry = new ExternalResourceProviderRegistry();
  providers.forEach((item) => registry.register(item));
  return registry;
}

export const externalResourceProviders = createExternalResourcePlatform();

export function createExternalResourceRecommendation(input: {
  id: string;
  moduleId: ExternalResourceModule;
  agentId: string;
  providerId: string;
  title: string;
  whyRecommended: string;
  query?: string;
  estimatedTime?: string;
  difficulty?: ExternalResourceDifficulty;
  cost?: string;
  verificationNote?: string;
  useAffiliateLink?: boolean;
}, registry = externalResourceProviders): ExternalResourceRecommendation {
  const provider = registry.require(input.providerId);
  if (provider.status !== "active") throw new Error(`External resource provider ${provider.id} is not active.`);
  const normalResourceUrl = provider.resourceUrlTemplate && input.query
    ? provider.resourceUrlTemplate.replace("{query}", encodeURIComponent(input.query))
    : provider.normalUrl;
  const affiliate = provider.affiliate;
  const affiliateApplied = Boolean(input.useAffiliateLink && affiliate?.supported && affiliate.referralUrl);
  const externalUrl = affiliateApplied
    ? addCampaignParameters(affiliate!.referralUrl!, affiliate?.campaignParameters)
    : normalResourceUrl;
  return {
    id: input.id,
    moduleId: input.moduleId,
    agentId: input.agentId,
    providerId: provider.id,
    providerName: provider.name,
    providerIcon: provider.icon,
    title: input.title,
    whyRecommended: input.whyRecommended,
    estimatedTime: input.estimatedTime || "Varies by resource",
    difficulty: input.difficulty || "varies",
    cost: input.cost || provider.pricingModel,
    pricingModel: provider.pricingModel,
    isFree: provider.isFree,
    externalUrl,
    affiliateApplied,
    disclosure: affiliateApplied ? affiliate?.disclosure || DEFAULT_DISCLOSURE : undefined,
    verificationNote: input.verificationNote || providerVerificationGuidance(provider),
  };
}

export function requestExternalResourceRecommendations(input: {
  moduleId: ExternalResourceModule;
  agentId: string;
  candidates: readonly AgentExternalResourceCandidate[];
  useAffiliateLinks?: boolean;
}, registry = externalResourceProviders) {
  return input.candidates.map((candidate) => createExternalResourceRecommendation({
    ...candidate,
    moduleId: input.moduleId,
    agentId: input.agentId,
    useAffiliateLink: input.useAffiliateLinks,
  }, registry));
}

function providerVerificationGuidance(provider: ExternalResourceProvider) {
  if (provider.id === "schools") return "Verify accreditation, admissions requirements, total cost, outcomes, transfer rules, support, and program availability with authoritative sources.";
  if (provider.id === "certification-providers") return "Use the issuing body's current objectives, prerequisites, renewal rules, and exam policies as authority.";
  if (provider.id === "books") return "Check edition date, author expertise, library availability, and whether the field changes quickly.";
  if (provider.id === "professional-organizations") return "Confirm professional standing, membership terms, event dates, and credential authority on the organization's official site.";
  return "Verify the current source, author or institution, price, availability, and fit before acting.";
}

export function createExternalResourceEvent(type: ExternalResourceEventType, recommendation: Pick<ExternalResourceRecommendation, "id" | "moduleId" | "providerId">, now = new Date().toISOString()): ExternalResourceEvent {
  return {
    id: `external-resource:${type}:${recommendation.id}:${now}`,
    type: `external-resource.${type}`,
    source: "beastos.external-resources",
    timestamp: now,
    payload: { recommendationId: recommendation.id, moduleId: recommendation.moduleId, providerId: recommendation.providerId },
  };
}

export const externalResourceLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
