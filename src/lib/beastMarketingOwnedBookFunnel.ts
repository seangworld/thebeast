import type { MarketingSourceFact } from "@/lib/beastMarketing";

export const OWNED_BOOK_FUNNEL_VERSION = "0.1.0";
export const OWNED_BOOK_ASIN = "B0HFZ1WHLX";
export const OWNED_BOOK_TITLE = "AI for Normal People";
export const OWNED_BOOK_URL = "https://www.amazon.com/AI-Normal-People-Practical-ebook/dp/B0HFZ1WHLX";
export const FREE_AI_GUIDE_URL = "https://www.seangworld.com/guides/10-things-ai-2026";
export const OWNED_BOOK_CAMPAIGN_TITLE = `Owned-book funnel · ${OWNED_BOOK_TITLE} · ${OWNED_BOOK_ASIN}`;

export type OwnedBookFunnelAssetDraft = {
  name: string;
  assetType: string;
  channel: string;
  body: string;
  sourceFacts: MarketingSourceFact[];
};

export type OwnedBookFunnelDraft = {
  campaign: {
    title: string;
    objective: string;
    audience: string;
    offer: string;
    channels: string[];
    callToAction: string;
    sourceFacts: MarketingSourceFact[];
    successMeasures: string[];
    limitations: string[];
  };
  assets: OwnedBookFunnelAssetDraft[];
  externalPublishingEnabled: false;
};

const amazonSource: MarketingSourceFact = {
  label: `Owner-supplied Amazon listing · ${OWNED_BOOK_TITLE} · ASIN ${OWNED_BOOK_ASIN}`,
  url: OWNED_BOOK_URL,
  observedAt: null,
  limitation: "The owner supplied this canonical listing. BeastMarketing has not independently verified live price, format availability, sales, ratings, or listing copy.",
};

const guideSource: MarketingSourceFact = {
  label: "Existing SEANGWORLD free AI ebook offer",
  url: FREE_AI_GUIDE_URL,
  observedAt: null,
  limitation: "The guide is the no-cost acquisition step; downstream Amazon sales require separate reporting and attribution.",
};

/** Builds exact, reviewable copy without activating a placement or contacting Amazon. */
export function buildOwnedBookFunnelDraft(): OwnedBookFunnelDraft {
  return {
    campaign: {
      title: OWNED_BOOK_CAMPAIGN_TITLE,
      objective: "Turn qualified SEANGWORLD readers into free-guide subscribers, introduce the owner's existing published book as the next step, and invite interested readers into Beast.",
      audience: "Adults who want practical, plain-language help using AI and who arrive through SEANGWORLD News, search, email, or owned social content.",
      offer: `The existing free SEANGWORLD AI ebook followed by the owner's published Amazon book, ${OWNED_BOOK_TITLE}.`,
      channels: ["SEANGWORLD News", "SEANGWORLD guide", "Owned email", "Owned social"],
      callToAction: `Download the free ebook; after reading, review ${OWNED_BOOK_TITLE} on Amazon.`,
      sourceFacts: [guideSource, amazonSource],
      successMeasures: ["Free-guide visits", "guide_download events", "Outbound Amazon clicks", "Beast registrations", "Amazon sales reported by the owner"],
      limitations: [
        "Amazon price, formats, availability, ratings, and sales are not verified here and must not be claimed.",
        "Approval records the owner's acceptance of the exact draft; it does not publish, schedule, or spend.",
        "Amazon purchases and royalties are not attributable without Amazon reporting or an approved tracking method.",
      ],
    },
    assets: [
      {
        name: "News reader offer · free AI ebook",
        assetType: "On-site CTA copy",
        channel: "SEANGWORLD News",
        body: "Want a clearer, more practical way to think about AI? Download the free SEANGWORLD ebook, 10 Things You Need to Know About AI in 2026.\n\nCTA: Get the free ebook",
        sourceFacts: [guideSource],
      },
      {
        name: `Free-guide next step · ${OWNED_BOOK_TITLE}`,
        assetType: "On-site CTA copy",
        channel: "SEANGWORLD guide",
        body: `Ready to go deeper? Continue with ${OWNED_BOOK_TITLE}, Sean Gatewood's practical guide on Amazon.\n\nCTA: View the book on Amazon\n\nDisclosure: Published by Sean Gatewood. A purchase may earn the author a royalty.`,
        sourceFacts: [amazonSource],
      },
      {
        name: `Owned follow-up · ${OWNED_BOOK_TITLE}`,
        assetType: "Email and social copy",
        channel: "Owned email and social",
        body: `If the free AI ebook helped you get oriented, ${OWNED_BOOK_TITLE} is the next practical step. Review the book on Amazon, then explore Beast when you are ready to put useful AI tools to work.\n\nDisclosure: Published by Sean Gatewood. A purchase may earn the author a royalty.`,
        sourceFacts: [guideSource, amazonSource],
      },
    ],
    externalPublishingEnabled: false,
  };
}
