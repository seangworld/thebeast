import { versionManifest } from "./appVersion";

export type BeastAdminPortfolioEntry = {
  id: string;
  product: string;
  version: string;
  lifecycle: "Released" | "Operational" | "Owner only" | "Foundation" | "Planning";
  production: string;
  source: string;
};

function released(
  id: keyof typeof versionManifest,
  product: string,
  lifecycle: BeastAdminPortfolioEntry["lifecycle"] = "Released"
): BeastAdminPortfolioEntry {
  const identity = versionManifest[id];
  return {
    id,
    product,
    version: `v${identity.version}`,
    lifecycle,
    production:
      identity.channel === "Production" ? "Deployed" : identity.channel,
    source: "BeastFusion generated version manifest",
  };
}

export const beastAdminPortfolio: readonly BeastAdminPortfolioEntry[] = [
  released("beast", "The Beast"),
  released("beastos", "BeastOS"),
  released("beastmoney", "BeastMoney"),
  released("beastlearning", "BeastEducation"),
  released("beasthealth", "BeastHealth"),
  released("beastgoals", "BeastGoals"),
  released("beastdocuments", "BeastDocuments"),
  released("beast", "Beast Director"),
  released("beast", "BeastAdmin", "Owner only"),
  released("seangworld", "SEANGWORLD"),
  released("beastfusion", "BeastFusion", "Operational"),
  {
    ...released("beastfusion", "BeastFusion Dashboard", "Operational"),
    production: "Owner runtime",
  },
  released("cw", "Change the World"),
  released("beasthome", "BeastHome", "Foundation"),
  released("beastsecurity", "BeastSecurity", "Planning"),
] as const;
