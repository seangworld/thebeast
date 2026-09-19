export const HOME_STUDIO_MAX_IMAGE_BYTES = 3_000_000;
export const HOME_STUDIO_MAX_DATA_URL_LENGTH = 4_200_000;
export const HOME_STUDIO_MAX_PHOTOS = 4;
export const HOME_STUDIO_MAX_REQUEST_IMAGE_CHARACTERS = 4_000_000;

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

export type HomeStudioPhoto = {
  dataUrl: string;
  name: string;
  label: string;
};

export type HomeStudioProject = {
  roomName: string;
  roomType: string;
  dimensions: string;
  measurementUnit: "feet" | "meters";
  roomLength: string;
  roomWidth: string;
  ceilingHeight: string;
  northWall: string;
  eastWall: string;
  southWall: string;
  westWall: string;
  furnitureMeasurements: string;
  style: string;
  colors: string;
  budget: string;
  mustKeep: string;
  needs: string;
  openings: string;
  notes: string;
};

export type HomeStudioInput = HomeStudioProject & {
  photos: HomeStudioPhoto[];
};

export type HomeStudioSavedProject = {
  id: string;
  project: HomeStudioProject;
  plan: HomeStudioPlan | null;
  createdAt: string;
  updatedAt: string;
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

function boundedMeasurement(value: unknown) {
  const candidate = boundedText(value, 12);
  if (!candidate) return "";
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(candidate)) return "";
  const number = Number(candidate);
  return number > 0 && number <= 999 ? String(number) : "";
}

export function normalizeHomeStudioProject(value: unknown): HomeStudioProject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const roomName = boundedText(input.roomName, 80);
  const roomType = boundedText(input.roomType, 40);
  const style = boundedText(input.style, 60);
  if (!roomName || !roomType || !style) return null;
  return {
    roomName,
    roomType,
    dimensions: boundedText(input.dimensions, 200),
    measurementUnit: input.measurementUnit === "meters" ? "meters" : "feet",
    roomLength: boundedMeasurement(input.roomLength),
    roomWidth: boundedMeasurement(input.roomWidth),
    ceilingHeight: boundedMeasurement(input.ceilingHeight),
    northWall: boundedText(input.northWall, 400),
    eastWall: boundedText(input.eastWall, 400),
    southWall: boundedText(input.southWall, 400),
    westWall: boundedText(input.westWall, 400),
    furnitureMeasurements: boundedText(input.furnitureMeasurements, 1_200),
    style,
    colors: boundedText(input.colors, 300),
    budget: boundedText(input.budget, 80),
    mustKeep: boundedText(input.mustKeep, 800),
    needs: boundedText(input.needs, 800),
    openings: boundedText(input.openings, 500),
    notes: boundedText(input.notes, 1_200),
  };
}

export function normalizeHomeStudioInput(value: unknown): HomeStudioInput | null {
  const project = normalizeHomeStudioProject(value);
  if (!project || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const rawPhotos = Array.isArray(input.photos)
    ? input.photos
    : typeof input.image === "string"
      ? [{ dataUrl: input.image, name: "Room photo", label: "Primary view" }]
      : [];
  if (rawPhotos.length > HOME_STUDIO_MAX_PHOTOS) return null;
  const photos = rawPhotos.slice(0, HOME_STUDIO_MAX_PHOTOS).flatMap((entry, index) => {
    const photo = typeof entry === "string"
      ? { dataUrl: entry, name: `Room view ${index + 1}`, label: index === 0 ? "Primary view" : `Additional view ${index + 1}` }
      : entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry as Record<string, unknown>
        : null;
    if (!photo) return [];
    const dataUrl = typeof photo.dataUrl === "string" ? photo.dataUrl : "";
    if (!isValidHomeStudioImage(dataUrl)) return [];
    return [{
      dataUrl,
      name: boundedText(photo.name, 120) || `Room view ${index + 1}`,
      label: boundedText(photo.label, 80) || (index === 0 ? "Primary view" : `Additional view ${index + 1}`),
    }];
  });
  const totalCharacters = photos.reduce((sum, photo) => sum + photo.dataUrl.length, 0);
  if (!photos.length || photos.length !== rawPhotos.slice(0, HOME_STUDIO_MAX_PHOTOS).length || totalCharacters > HOME_STUDIO_MAX_REQUEST_IMAGE_CHARACTERS) return null;
  return { ...project, photos };
}

export function normalizeHomeStudioSavedProject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const project = normalizeHomeStudioProject(candidate.project);
  if (!project) return null;
  const plan = candidate.plan === null || candidate.plan === undefined ? null : normalizeHomeStudioPlan(candidate.plan);
  if (candidate.plan && !plan) return null;
  return { project, plan };
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

function escapePacketText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function packetList(items: string[]) {
  return items.length
    ? `<ol>${items.map((item) => `<li>${escapePacketText(item)}</li>`).join("")}</ol>`
    : "<p>None recorded.</p>";
}

function packetImage(value: string | undefined) {
  if (!value || value.length > 8_200_000 || !homeStudioImagePattern.test(value)) return "";
  return value;
}

export function hasDimensionedHomeStudioFloorPlan(project: HomeStudioProject) {
  return Boolean(project.roomLength && project.roomWidth);
}

export function buildHomeStudioFloorPlanSvg(project: HomeStudioProject) {
  if (!hasDimensionedHomeStudioFloorPlan(project)) return "";
  const length = escapePacketText(project.roomLength);
  const width = escapePacketText(project.roomWidth);
  const unit = project.measurementUnit === "meters" ? "m" : "ft";
  const wallNotes = [
    ["North wall", project.northWall],
    ["East wall", project.eastWall],
    ["South wall", project.southWall],
    ["West wall", project.westWall],
  ].filter((entry) => entry[1]);
  return [
    '<div class="floor-plan"><svg viewBox="0 0 720 500" role="img" aria-label="Dimensioned top-down room outline">',
    '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#0e7490"/></marker></defs>',
    '<rect x="150" y="90" width="420" height="300" fill="#f8fafc" stroke="#172033" stroke-width="8"/>',
    '<text x="360" y="70" text-anchor="middle">North wall</text><text x="360" y="420" text-anchor="middle">South wall</text>',
    '<text x="115" y="245" text-anchor="middle" transform="rotate(-90 115 245)">West wall</text><text x="605" y="245" text-anchor="middle" transform="rotate(90 605 245)">East wall</text>',
    '<line x1="150" y1="455" x2="570" y2="455" stroke="#0e7490" marker-start="url(#arrow)" marker-end="url(#arrow)"/>',
    `<text x="360" y="482" text-anchor="middle">${length} ${unit}</text>`,
    '<line x1="75" y1="90" x2="75" y2="390" stroke="#0e7490" marker-start="url(#arrow)" marker-end="url(#arrow)"/>',
    `<text x="45" y="245" text-anchor="middle" transform="rotate(-90 45 245)">${width} ${unit}</text>`,
    '<text x="360" y="235" text-anchor="middle" font-size="18">Planning outline — verify on site</text></svg>',
    wallNotes.length ? `<dl>${wallNotes.map(([label, value]) => `<div><dt>${escapePacketText(label)}</dt><dd>${escapePacketText(value)}</dd></div>`).join("")}</dl>` : "",
    "</div>",
  ].join("");
}

export function buildHomeStudioDesignPacket(input: {
  project: HomeStudioProject;
  plan: HomeStudioPlan;
  sourceImages?: string[];
  sourceImage?: string;
  conceptImage?: string;
  createdAt?: string;
}) {
  const { project, plan } = input;
  const sourceImages = (input.sourceImages || (input.sourceImage ? [input.sourceImage] : [])).slice(0, HOME_STUDIO_MAX_PHOTOS).map(packetImage).filter(Boolean);
  const conceptImage = packetImage(input.conceptImage);
  const createdAt = input.createdAt || new Date().toISOString();
  const projectDetails = [
    ["Room", project.roomType],
    ["Measurements", project.dimensions || "Not supplied"],
    ["Dimensioned footprint", hasDimensionedHomeStudioFloorPlan(project) ? `${project.roomLength} × ${project.roomWidth} ${project.measurementUnit}` : "Not supplied"],
    ["Ceiling height", project.ceilingHeight ? `${project.ceilingHeight} ${project.measurementUnit}` : "Not supplied"],
    ["Style", project.style],
    ["Colors", project.colors || "No fixed palette supplied"],
    ["Working budget", project.budget || "Not supplied"],
    ["Must keep", project.mustKeep || "None identified"],
    ["Room needs", project.needs || "General improvement"],
    ["Openings", project.openings || "Not supplied"],
    ["Other notes", project.notes || "None"],
  ];
  const shoppingRows = plan.shoppingList.map((item) => `<tr><td><strong>${escapePacketText(item.item)}</strong><br><span>${escapePacketText(item.purpose)}</span></td><td>${escapePacketText(item.priority)}</td><td>${escapePacketText(item.targetPrice)}</td><td>${escapePacketText(item.searchTerms)}</td><td class="check">□</td></tr>`).join("");
  const imageCards = [
    ...sourceImages.map((sourceImage, index) => `<figure><img src="${sourceImage}" alt="Original room view ${index + 1}"><figcaption>${index === 0 ? "Primary room view" : `Additional room view ${index + 1}`}</figcaption></figure>`),
    conceptImage ? `<figure><img src="${conceptImage}" alt="AI visual concept"><figcaption>AI visual concept</figcaption></figure>` : "",
  ].filter(Boolean).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapePacketText(project.roomName)} — Home Studio design packet</title>
<style>
  :root{color-scheme:light;font-family:Arial,sans-serif;color:#172033}*{box-sizing:border-box}body{margin:0;background:#eef2f7}main{width:min(980px,calc(100% - 32px));margin:24px auto;background:#fff;padding:40px;box-shadow:0 8px 30px #0f172a1a}header{border-bottom:4px solid #0891b2;padding-bottom:20px}.kicker{color:#0e7490;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:8px 0 4px;font-size:34px}h2{margin:28px 0 12px;font-size:20px}h3{margin:0 0 8px;font-size:16px}p,li,td,th{font-size:14px;line-height:1.55}.meta{color:#64748b}.notice{margin:20px 0;padding:14px;border:1px solid #f59e0b;background:#fffbeb}.details,.images,.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.detail,.section{break-inside:avoid;border:1px solid #dbe2ea;border-radius:10px;padding:14px}.detail span{display:block;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase}.palette{display:flex;flex-wrap:wrap;gap:10px}.swatch{display:flex;align-items:center;gap:8px;border:1px solid #dbe2ea;border-radius:999px;padding:6px 10px}.color{width:24px;height:24px;border:1px solid #cbd5e1;border-radius:50%}figure{margin:0;break-inside:avoid}img{display:block;width:100%;max-height:480px;object-fit:contain;background:#0f172a;border-radius:10px}figcaption{margin-top:6px;color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:9px;text-align:left;vertical-align:top}th{background:#e2e8f0}.check{width:34px;text-align:center;font-size:20px}ol{padding-left:22px}.floor-plan{break-inside:avoid;border:1px solid #dbe2ea;border-radius:10px;padding:14px}.floor-plan svg{display:block;width:100%;max-height:520px}.floor-plan dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.floor-plan dt{font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b}.floor-plan dd{margin:3px 0 0;font-size:13px}.footer{margin-top:28px;border-top:1px solid #cbd5e1;padding-top:14px;color:#64748b;font-size:12px}@media(max-width:700px){main{width:100%;margin:0;padding:20px}.details,.images,.two,.floor-plan dl{grid-template-columns:1fr}table{font-size:12px}}@media print{body{background:#fff}main{width:100%;margin:0;padding:0;box-shadow:none}a{color:inherit}.page-break{break-before:page}}
</style></head><body><main>
<header><div class="kicker">BeastHome · Home Studio</div><h1>${escapePacketText(plan.title)}</h1><p>${escapePacketText(plan.summary)}</p><p class="meta">Project: ${escapePacketText(project.roomName)} · Created ${escapePacketText(new Date(createdAt).toLocaleString("en-US"))}</p></header>
<div class="notice"><strong>Planning concept:</strong> Verify all measurements, fit, clearances, safety, prices and availability before moving, installing or purchasing anything. This is not a construction drawing, appraisal or inspection.</div>
${imageCards ? `<section><h2>Room and concept</h2><div class="images">${imageCards}</div></section>` : ""}
<section><h2>Project brief</h2><div class="details">${projectDetails.map(([label, value]) => `<div class="detail"><span>${escapePacketText(label)}</span>${escapePacketText(value)}</div>`).join("")}</div></section>
${hasDimensionedHomeStudioFloorPlan(project) ? `<section><h2>Dimensioned floor-planning outline</h2>${buildHomeStudioFloorPlanSvg(project)}<p class="meta">The outline shows supplied room dimensions and wall notes; it is not a measured drawing and does not establish construction tolerances.</p></section>` : ""}
<section><h2>Palette</h2><div class="palette">${plan.palette.map((color) => `<div class="swatch"><span class="color" style="background:${color.hex}"></span>${escapePacketText(color.name)} ${color.hex}</div>`).join("")}</div></section>
<div class="two"><section class="section"><h2>Visible starting point</h2>${packetList(plan.observedRoom)}</section><section class="section"><h2>Assumptions to verify</h2>${packetList(plan.assumptions)}</section></div>
<div class="two"><section class="section"><h2>Layout plan</h2>${packetList(plan.layoutPlan)}</section><section class="section"><h2>Design moves</h2>${packetList(plan.designMoves)}</section></div>
<section class="page-break"><h2>Shopping checklist</h2><table><thead><tr><th>Item and purpose</th><th>Priority</th><th>Planning range</th><th>Search terms</th><th>Done</th></tr></thead><tbody>${shoppingRows}</tbody></table></section>
<section><h2>Safety and reality checks</h2>${packetList(plan.cautions)}</section>
<section class="section"><h2>Reviewed concept direction</h2><p>${escapePacketText(plan.conceptPrompt)}</p></section>
<p class="footer">Home Studio does not purchase products, verify live inventory or price, guarantee exact fit, or replace qualified structural, electrical or plumbing help. Retailer searches in the BeastHome workspace are not affiliate links unless explicitly disclosed.</p>
</main></body></html>`;
}
