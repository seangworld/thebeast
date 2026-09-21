// Only server-configured destinations can become affiliate links. Defaults remain ordinary searches.
export type HomeStudioAffiliate = { retailer: string; template: string };
const hosts: Record<string, string[]> = {
  Amazon: ["amazon.com", "amzn.to"], IKEA: ["ikea.com"], Wayfair: ["wayfair.com"],
  Walmart: ["walmart.com"], "Home Depot": ["homedepot.com"], "Lowe's": ["lowes.com"],
};
export function parseHomeStudioAffiliates(raw: string | undefined, enabled: string | undefined): HomeStudioAffiliate[] {
  if (enabled !== "true" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.slice(0, 6).flatMap(item => {
      if (!item || typeof item !== "object" || typeof item.retailer !== "string" || typeof item.template !== "string" || item.template.length > 1500 || seen.has(item.retailer)) return [];
      const allowed = hosts[item.retailer];
      if (!allowed) return [];
      const url = new URL(item.template.split("{query}").join("room"));
      if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return [];
      seen.add(item.retailer);
      return [{ retailer: item.retailer, template: item.template }];
    });
  } catch { return []; }
}
