export const HOME_STUDIO_MAX_IMAGE_BYTES = 3_000_000;
export const HOME_STUDIO_MAX_DATA_URL_LENGTH = 4_200_000;

export const homeStudioRoomTypes = [
  "Living room",
  "Bedroom",
  "Home office",
  "Dining room",
  "Kitchen",
  "Bathroom",
  "Closet",
  "Game room",
  "Garage",
  "Outdoor space",
  "Other",
] as const;

export const homeStudioStyles = [
  "Modern",
  "Contemporary",
  "Traditional",
  "Transitional",
  "Minimalist",
  "Coastal",
  "Farmhouse",
  "Industrial",
  "Bohemian",
  "Luxury",
  "Eclectic",
] as const;

export type HomeStudioInput = {
  image: string;
  roomName: string;
  roomType: string;
  dimensions: string;
  style: string;
  colors: string;
  budget: string;
  mustKeep: string;
  needs: string;
  openings: string;
  notes: string;
};

export type HomeStudioShoppingItem = {
  item: string;
  purpose: string;
  searchTerms: string;
  targetPrice: string;
  priority: "Essential" | "Helpful" | "Optional";
};

export type HomeStudioPlan = {
  title: string;
  summary: string;
  observedRoom: string[];
  assumptions: string[];
  palette: Array<{ name: string; hex: string }>;
  layoutPlan: string[];
  designMoves: string[];
  shoppingList: HomeStudioShoppingItem[];
  cautions: string[];
  conceptPrompt: string;
};

export const homeStudioImagePattern = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function boundedText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function isValidHomeStudioImage(image: unknown) {
  if (typeof image !== "string" || image.length > HOME_STUDIO_MAX_DATA_URL_LENGTH) return false;
  const match = homeStudioImagePattern.exec(image);
  if (!match) return false;
  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  const byteLength = Math.floor(match[2].length * 3 / 4) - padding;
  return byteLength > 0 && byteLength <= HOME_STUDIO_MAX_IMAGE_BYTES;
}

export function normalizeHomeStudioInput(value: unknown): HomeStudioInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const image = typeof input.image === "string" ? input.image : "";
  const roomName = boundedText(input.roomName, 80);
  const roomType = boundedText(input.roomType, 40);
  const style = boundedText(input.style, 60);
  if (!isValidHomeStudioImage(image) || !roomName || !roomType || !style) return null;
  return {
    image,
    roomName,
    roomType,
    dimensions: boundedText(input.dimensions, 200),
    style,
    colors: boundedText(input.colors, 300),
    budget: boundedText(input.budget, 80),
    mustKeep: boundedText(input.mustKeep, 800),
    needs: boundedText(input.needs, 800),
    openings: boundedText(input.openings, 500),
    notes: boundedText(input.notes, 1_200),
  };
}

function stringList(value: unknown, maximumItems: number, maximumLength = 240) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximumItems).flatMap((item) => {
    const text = boundedText(item, maximumLength);
    return text ? [text] : [];
  });
}

function safeHex(value: unknown) {
  const candidate = boundedText(value, 7).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : "#64748B";
}

export function normalizeHomeStudioPlan(value: unknown): HomeStudioPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const plan = value as Record<string, unknown>;
  const shopping = Array.isArray(plan.shoppingList) ? plan.shoppingList : [];
  const normalized: HomeStudioPlan = {
    title: boundedText(plan.title, 100),
    summary: boundedText(plan.summary, 800),
    observedRoom: stringList(plan.observedRoom, 10),
    assumptions: stringList(plan.assumptions, 8),
    palette: (Array.isArray(plan.palette) ? plan.palette : []).slice(0, 6).flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const color = entry as Record<string, unknown>;
      const name = boundedText(color.name, 40);
      return name ? [{ name, hex: safeHex(color.hex) }] : [];
    }),
    layoutPlan: stringList(plan.layoutPlan, 10),
    designMoves: stringList(plan.designMoves, 12),
    shoppingList: shopping.slice(0, 16).flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const item = entry as Record<string, unknown>;
      const name = boundedText(item.item, 100);
      if (!name) return [];
      const priority = item.priority === "Essential" || item.priority === "Helpful" ? item.priority : "Optional";
      return [{
        item: name,
        purpose: boundedText(item.purpose, 240),
        searchTerms: boundedText(item.searchTerms, 120) || name,
        targetPrice: boundedText(item.targetPrice, 60) || "Price not estimated",
        priority,
      }];
    }),
    cautions: stringList(plan.cautions, 8),
    conceptPrompt: boundedText(plan.conceptPrompt, 2_400),
  };
  if (!normalized.title || !normalized.summary || !normalized.conceptPrompt) return null;
  return normalized;
}

export const homeStudioPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "observedRoom", "assumptions", "palette", "layoutPlan", "designMoves", "shoppingList", "cautions", "conceptPrompt"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    observedRoom: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    palette: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "hex"], properties: { name: { type: "string" }, hex: { type: "string" } } } },
    layoutPlan: { type: "array", items: { type: "string" } },
    designMoves: { type: "array", items: { type: "string" } },
    shoppingList: { type: "array", items: { type: "object", additionalProperties: false, required: ["item", "purpose", "searchTerms", "targetPrice", "priority"], properties: { item: { type: "string" }, purpose: { type: "string" }, searchTerms: { type: "string" }, targetPrice: { type: "string" }, priority: { type: "string", enum: ["Essential", "Helpful", "Optional"] } } } },
    cautions: { type: "array", items: { type: "string" } },
    conceptPrompt: { type: "string" },
  },
} as const;

export function homeStudioRetailerLinks(searchTerms: string) {
  const query = encodeURIComponent(searchTerms);
  return [
    { label: "Amazon", href: `https://www.amazon.com/s?k=${query}` },
    { label: "IKEA", href: `https://www.ikea.com/us/en/search/?q=${query}` },
    { label: "Wayfair", href: `https://www.wayfair.com/keyword.php?keyword=${query}` },
    { label: "Walmart", href: `https://www.walmart.com/search?q=${query}` },
    { label: "Home Depot", href: `https://www.homedepot.com/s/${query}` },
    { label: "Lowe's", href: `https://www.lowes.com/search?searchTerm=${query}` },
  ];
}
