export type MarketingChannel = "facebook" | "instagram" | "x" | "reddit";
export type ChannelDraft = { channel: MarketingChannel; label: string; guidance: string; text: string };
export const channelLabels: Record<MarketingChannel, string> = { facebook: "Facebook", instagram: "Instagram", x: "X", reddit: "Reddit" };
const trims = (value: string, limit: number) => value.length > limit ? value.slice(0, limit - 1).trimEnd() + "…" : value;
/** Draft suggestions only. Never claim a post is discovered, approved, or published. */
export function marketingChannelDrafts(base: string, product: string): ChannelDraft[] {
  const cleaned = base.trim();
  return [
    { channel: "facebook", label: "Facebook", guidance: "Use a genuine, relevant conversation. Avoid repetitive promotional replies.", text: cleaned },
    { channel: "instagram", label: "Instagram", guidance: "Add an original image or video. Caption links usually are not clickable.", text: cleaned + "\n\n#Books #Discover" },
    { channel: "x", label: "X", guidance: "Keep concise and verify link length before posting.", text: trims(cleaned, 240) },
    { channel: "reddit", label: "Reddit", guidance: "Read the community's rules first. Disclose your connection to the product; do not automate unsolicited promotion.", text: `I created ${product}. ${cleaned}\n\nI'm the creator, and happy to answer questions if this is relevant to the discussion.` },
  ];
}
