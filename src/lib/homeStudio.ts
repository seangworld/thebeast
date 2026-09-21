import type { HomeStudioAffiliate } from "./homeStudioAffiliates";
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
  workspace?: HomeStudioWorkspaceData;
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

export const homeStudioShoppingStatuses = ["Needed", "Already owned", "Purchased", "Deferred"] as const;
export type HomeStudioShoppingStatus = typeof homeStudioShoppingStatuses[number];

export function homeStudioShoppingStatus(value: unknown): HomeStudioShoppingStatus {
  return homeStudioShoppingStatuses.find(status => status === value) || "Needed";
}

export type HomeStudioShoppingItem = {
  status?: HomeStudioShoppingStatus;
  notes?: string;
  quantity?: number;
  unitPrice?: string;
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

export function homeStudioMeasurementIssues(project: Pick<HomeStudioProject, 'roomLength' | 'roomWidth' | 'ceilingHeight'>) {
  return ([['roomLength', 'Room length'], ['roomWidth', 'Room width'], ['ceilingHeight', 'Ceiling height']] as const)
    .filter(([key]) => project[key].trim() && !boundedMeasurement(project[key]))
    .map(([, label]) => `${label}: enter a number greater than 0 and up to 999, with at most two decimal places. Use the selected unit; put feet/inches or other details in measurement notes.`);
}

export function homeStudioRoomGeometry(project: Pick<HomeStudioProject, 'roomLength' | 'roomWidth'>) {
  const length = Number(boundedMeasurement(project.roomLength));
  const width = Number(boundedMeasurement(project.roomWidth));
  if (!length || !width) return null;
  const scale = Math.min(420 / length, 300 / width);
  const drawingWidth = length * scale;
  const drawingHeight = width * scale;
  return { length, width, area: Math.round(length * width * 100) / 100, x: (720 - drawingWidth) / 2, y: (480 - drawingHeight) / 2, drawingWidth, drawingHeight };
}

export function homeStudioBriefMatches(a: HomeStudioProject | null, b: HomeStudioProject) {
  return Boolean(a && (Object.keys(b) as (keyof HomeStudioProject)[]).filter(key => key !== "workspace").every(key => a[key] === b[key]));
}

export function homeStudioPrimaryPhoto(photos: HomeStudioPhoto[], index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= photos.length) return photos;
  return [photos[index], ...photos.filter((_, i) => i !== index)];
}

export function normalizeHomeStudioProject(value: unknown): HomeStudioProject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const roomName = boundedText(input.roomName, 80);
  const roomType = boundedText(input.roomType, 40);
  const style = boundedText(input.style, 60);
  if (!roomName || !roomType || !style) return null;
  return {
    ...(input.workspace ? { workspace: normalizeHomeStudioWorkspace(input.workspace) } : {}),
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
    shoppingList: shopping.slice(0, 32).flatMap((entry) => {
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
        ...(item.quantity !== undefined ? { quantity: normalizeHomeStudioQuantity(item.quantity) } : {}),
        ...(item.unitPrice !== undefined ? { unitPrice: normalizeHomeStudioMoney(item.unitPrice) } : {}),
        ...(item.status !== undefined ? { status: homeStudioShoppingStatus(item.status) } : {}),
        ...(item.notes !== undefined ? { notes: boundedText(item.notes, 400) } : {}),
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

export function homeStudioRetailerLinks(searchTerms: string, affiliates: HomeStudioAffiliate[] = []) {
  const query = encodeURIComponent(searchTerms);
  return [
    { label: "Amazon", href: `https://www.amazon.com/s?k=${query}` },
    { label: "IKEA", href: `https://www.ikea.com/us/en/search/?q=${query}` },
    { label: "Wayfair", href: `https://www.wayfair.com/keyword.php?keyword=${query}` },
    { label: "Walmart", href: `https://www.walmart.com/search?q=${query}` },
    { label: "Home Depot", href: `https://www.homedepot.com/s/${query}` },
    { label: "Lowe's", href: `https://www.lowes.com/search?searchTerm=${query}` },
  ].map(link => {
    const affiliate = affiliates.find(entry => entry.retailer === link.label);
    return affiliate ? { ...link, href: affiliate.template.split("{query}").join(query), affiliate: true } : { ...link, affiliate: false };
  });
}

export function escapePacketText(value: string) {
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
  return homeStudioRoomGeometry(project) !== null;
}

export function buildHomeStudioFloorPlanSvg(project: HomeStudioProject) {
  const geometry = homeStudioRoomGeometry(project);
  if (!geometry) return "";
  const { x, y, drawingWidth, drawingHeight } = geometry;
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
    `<rect x="${x}" y="${y}" width="${drawingWidth}" height="${drawingHeight}" fill="#f8fafc" stroke="#172033" stroke-width="4"/>`,
    homeStudioLayoutSvg(project),
    '<text x="360" y="70" text-anchor="middle">North wall</text><text x="360" y="420" text-anchor="middle">South wall</text>',
    '<text x="115" y="245" text-anchor="middle" transform="rotate(-90 115 245)">West wall</text><text x="605" y="245" text-anchor="middle" transform="rotate(90 605 245)">East wall</text>',
    `<line x1="${x}" y1="455" x2="${x + drawingWidth}" y2="455" stroke="#0e7490" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`,
    `<text x="360" y="482" text-anchor="middle">${length} ${unit}</text>`,
    `<line x1="75" y1="${y}" x2="75" y2="${y + drawingHeight}" stroke="#0e7490" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`,
    `<text x="45" y="245" text-anchor="middle" transform="rotate(-90 45 245)">${width} ${unit}</text>`,
    `</svg><p>Proportional room outline · ${geometry.length} × ${geometry.width} ${unit} · ${geometry.area} square ${project.measurementUnit === 'meters' ? 'meters' : 'feet'}. Verify on site; entered furniture and opening markers use your dimensions; verify fit and door swing on site.</p>`,
    (project.workspace?.layout || []).length ? `<h3>Entered placements (${unit})</h3><ul>${project.workspace!.layout.map(item => `<li>${escapePacketText(item.label)} (${item.kind}): X ${item.x}, Y ${item.y}; ${item.width} × ${item.depth} ${unit}</li>`).join("")}</ul>${packetList(homeStudioLayoutIssues(project))}` : "",
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
  const shoppingRows = plan.shoppingList.map((item) => `<tr><td><strong>${escapePacketText(item.item)}</strong><br><span>${escapePacketText(item.purpose)}</span></td><td>${escapePacketText(item.priority)}</td><td>${escapePacketText(item.targetPrice)}<br>Qty: ${item.quantity || 1}${item.unitPrice ? `<br>Entered unit price: $${escapePacketText(item.unitPrice)}` : ""}</td><td>${escapePacketText(item.searchTerms)}</td><td>${escapePacketText(homeStudioShoppingStatus(item.status))}${item.notes ? `<br>${escapePacketText(item.notes)}` : ""}</td></tr>`).join("");
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
<section class="page-break"><h2>Shopping checklist</h2><table><thead><tr><th>Item and purpose</th><th>Priority</th><th>Planning range</th><th>Search terms</th><th>Status and notes</th></tr></thead><tbody>${shoppingRows}</tbody></table><p>${escapePacketText(homeStudioBudgetSummary(project, plan))}</p></section>
<section><h2>Safety and reality checks</h2>${packetList(plan.cautions)}</section>
<section class="section"><h2>Reviewed concept direction</h2><p>${escapePacketText(plan.conceptPrompt)}</p></section>
<p class="footer">Home Studio does not purchase products, verify live inventory or price, guarantee exact fit, or replace qualified structural, electrical or plumbing help. Retailer searches in the BeastHome workspace are not affiliate links unless explicitly disclosed.</p>
</main></body></html>`;
}


// Project management stays outside the AI brief and does not trigger provider requests.
export type HomeStudioPlacement = {
  id: string; label: string; kind: "Furniture" | "Door" | "Window";
  x: number; y: number; width: number; depth: number;
};
export type HomeStudioVersion = {
  id: string; label: string; createdAt: string;
  project: Omit<HomeStudioProject, "workspace">;
  plan: HomeStudioPlan;
  layout: HomeStudioPlacement[];
  budgetLimit: string;
};
export type HomeStudioClient = {
  name: string; email: string; scope: string; fee: string; dueDate: string;
  stage: "Intake" | "Designing" | "Ready for review" | "Delivered";
  payment: "Not recorded" | "Unpaid" | "Paid externally";
  paymentLink: string;
};
export type HomeStudioWorkspaceData = {
  budgetLimit: string;
  layout: HomeStudioPlacement[];
  versions: HomeStudioVersion[];
  client: HomeStudioClient;
};
export const HOME_STUDIO_MAX_VERSIONS = 5;
export const HOME_STUDIO_MAX_BACKUP_BYTES = 500_000;
export function normalizeHomeStudioMoney(value: unknown) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  return /^\d{1,6}(?:\.\d{1,2})?$/.test(text) && Number(text) <= 999999 ? text : "";
}
export function normalizeHomeStudioQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 99 ? value : 1;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function homeStudioPaymentLink(value: unknown) {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    return url.protocol === "https:" && ["buy.stripe.com", "invoice.stripe.com"].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href.slice(0, 1500) : "";
  } catch { return ""; }
}
export function normalizeHomeStudioLayout(value: unknown): HomeStudioPlacement[] {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).slice(0, 24).flatMap((raw, index) => {
    const item = record(raw);
    if (![item.x, item.y, item.width, item.depth].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 999) || Number(item.width) <= 0 || Number(item.depth) <= 0) return [];
    let id = boundedText(item.id, 80) || `item-${index}`;
    if (seen.has(id)) id = `item-${index}-${id}`;
    seen.add(id);
    return [{ id, label: boundedText(item.label, 60) || "Furniture", kind: item.kind === "Door" || item.kind === "Window" ? item.kind : "Furniture", x: Number(item.x), y: Number(item.y), width: Number(item.width), depth: Number(item.depth) } as HomeStudioPlacement];
  });
}
export function normalizeHomeStudioWorkspace(value: unknown): HomeStudioWorkspaceData {
  const data = record(value), client = record(data.client);
  const seen = new Set<string>();
  return {
    budgetLimit: normalizeHomeStudioMoney(data.budgetLimit),
    layout: normalizeHomeStudioLayout(data.layout),
    versions: (Array.isArray(data.versions) ? data.versions : []).slice(0, HOME_STUDIO_MAX_VERSIONS).flatMap((raw, index) => {
      const version = record(raw);
      // Never recurse into an imported version's workspace or accept image payloads.
      const project = normalizeHomeStudioProject({ ...record(version.project), workspace: undefined });
      const plan = normalizeHomeStudioPlan(version.plan);
      if (!project || !plan) return [];
      let id = boundedText(version.id, 80) || `version-${index}`;
      if (seen.has(id)) id = `version-${index}-${id}`;
      seen.add(id);
      const date = boundedText(version.createdAt, 40);
      return [{ id, label: boundedText(version.label, 80) || `Design ${index + 1}`, createdAt: Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : "", project, plan, layout: normalizeHomeStudioLayout(version.layout), budgetLimit: normalizeHomeStudioMoney(version.budgetLimit) }];
    }),
    client: {
      name: boundedText(client.name, 100), email: boundedText(client.email, 200), scope: boundedText(client.scope, 1600),
      fee: normalizeHomeStudioMoney(client.fee), dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(client.dueDate)) ? String(client.dueDate) : "",
      stage: ["Designing", "Ready for review", "Delivered"].includes(String(client.stage)) ? client.stage as HomeStudioClient["stage"] : "Intake",
      payment: client.payment === "Unpaid" || client.payment === "Paid externally" ? client.payment : "Not recorded",
      paymentLink: homeStudioPaymentLink(client.paymentLink),
    },
  };
}
export function homeStudioBudget(project: HomeStudioProject, plan: HomeStudioPlan | null) {
  let spent = 0, remainingPurchases = 0, unpriced = 0;
  for (const item of plan?.shoppingList || []) {
    if (item.status === "Already owned" || item.status === "Deferred") continue;
    const price = normalizeHomeStudioMoney(item.unitPrice);
    if (!price) { unpriced++; continue; }
    const cents = Math.round(Number(price) * 100) * normalizeHomeStudioQuantity(item.quantity ?? 1);
    if (item.status === "Purchased") spent += cents; else remainingPurchases += cents;
  }
  const limit = normalizeHomeStudioMoney(project.workspace?.budgetLimit);
  return { spent, remainingPurchases, total: spent + remainingPurchases, unpriced, remaining: limit ? Math.round(Number(limit) * 100) - spent - remainingPurchases : null };
}
export function homeStudioDollars(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
export function homeStudioBudgetSummary(project: HomeStudioProject, plan: HomeStudioPlan | null) {
  const b = homeStudioBudget(project, plan);
  return `Entered prices only (USD): purchased ${homeStudioDollars(b.spent)}; still to buy ${homeStudioDollars(b.remainingPurchases)}; total ${homeStudioDollars(b.total)}; ${b.unpriced} unpriced item(s). ${b.remaining === null ? "No numeric budget set." : `Budget balance ${homeStudioDollars(b.remaining)}.`} Owned and deferred items excluded. Include tax and shipping in your entered prices.`;
}
export function homeStudioLayoutIssues(project: HomeStudioProject) {
  const geometry = homeStudioRoomGeometry(project);
  const items = project.workspace?.layout || [];
  if (!geometry) return items.length ? ["Add valid room length and width to check this layout."] : [];
  const issues: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a.width <= 0 || a.depth <= 0) issues.push(`${a.label} needs a positive width and depth.`);
    if (a.x + a.width > geometry.length + 0.0001 || a.y + a.depth > geometry.width + 0.0001) issues.push(`${a.label} extends outside the room.`);
    for (const b of items.slice(i + 1)) {
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y) issues.push(`${a.label} overlaps ${b.label}.`);
    }
  }
  return issues;
}
export function homeStudioLayoutSvg(project: HomeStudioProject) {
  const g = homeStudioRoomGeometry(project);
  if (!g) return "";
  const scale = g.drawingWidth / g.length;
  return (project.workspace?.layout || []).map(item => `<g><rect x="${g.x + item.x * scale}" y="${g.y + item.y * scale}" width="${item.width * scale}" height="${item.depth * scale}" fill="${item.kind === "Furniture" ? "#a5f3fc" : "#fde68a"}" fill-opacity="0.6" stroke="#0e7490"/><text x="${g.x + (item.x + item.width / 2) * scale}" y="${g.y + (item.y + item.depth / 2) * scale}" font-size="11" text-anchor="middle">${escapePacketText(item.label)}</text></g>`).join("");
}
export function createHomeStudioVersion(project: HomeStudioProject, plan: HomeStudioPlan, label: string, id: string, createdAt: string): HomeStudioVersion {
  const { workspace, ...brief } = project;
  return { id, label: label.trim().slice(0, 80) || plan.title, createdAt, project: brief, plan: structuredClone(plan), layout: structuredClone(workspace?.layout || []), budgetLimit: workspace?.budgetLimit || "" };
}
export function parseHomeStudioBackup(text: string) {
  if (new TextEncoder().encode(text).length > HOME_STUDIO_MAX_BACKUP_BYTES) throw new Error("Choose a Home Studio JSON backup under 500 KB.");
  let input: Record<string, unknown>;
  try { input = record(JSON.parse(text)); } catch { throw new Error("This file is not valid JSON."); }
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1 && input.schemaVersion !== 2) throw new Error("This backup uses an unsupported version.");
  const result = normalizeHomeStudioSavedProject(input);
  if (!result) throw new Error("This file does not contain a valid Home Studio project.");
  const raw = record(input.project);
  if (homeStudioMeasurementIssues({roomLength: String(raw.roomLength || ""), roomWidth: String(raw.roomWidth || ""), ceilingHeight: String(raw.ceilingHeight || "")}).length) throw new Error("Correct invalid room measurements in this backup before importing it.");
  return result;
}
export function buildHomeStudioClientQuote(project: HomeStudioProject) {
  const c = normalizeHomeStudioWorkspace(project.workspace).client;
  const link = homeStudioPaymentLink(c.paymentLink);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Home Studio proposal</title><style>body{font:16px/1.6 Arial;max-width:800px;margin:40px auto;padding:24px;color:#172033}h1{color:#0e7490}p{white-space:pre-wrap}@media print{body{margin:0}}</style><h1>Home Studio · Project proposal</h1><p>Prepared for: ${escapePacketText(c.name || "Client")}<br>Room: ${escapePacketText(project.roomName)}</p><h2>Scope</h2><p>${escapePacketText(c.scope || "Confirm the scope with your designer before paying.")}</p><p>Quoted service fee: ${c.fee ? homeStudioDollars(Math.round(Number(c.fee) * 100)) : "To be agreed"}<br>Target delivery: ${escapePacketText(c.dueDate || "To be agreed")}</p><p>Design concepts and shopping guidance only. Product purchases are separate. Verify measurements, clearances, prices, and availability. Confirm scope, revisions, and delivery with your designer before paying.</p>${link && c.fee && c.scope ? `<p><a href="${escapePacketText(link)}" rel="noopener noreferrer">Open secure Stripe payment page</a></p><p>Check the merchant, description, currency, and amount on Stripe before paying. This proposal does not verify payment or automatically deliver files.</p>` : ""}</html>`;
}
