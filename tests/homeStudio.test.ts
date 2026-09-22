import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHomeStudioDesignPacket,
  buildHomeStudioFloorPlanSvg,
  isValidHomeStudioImage,
  homeStudioRetailerLinks,
  normalizeHomeStudioInput,
  normalizeHomeStudioPlan,
} from "../src/lib/homeStudio";

const workspace = readFileSync("src/app/dashboard/home/studio/HomeStudioWorkspace.tsx", "utf8");
const page = readFileSync("src/app/dashboard/home/studio/page.tsx", "utf8");
const planRoute = readFileSync("src/app/api/home/studio/plan/route.ts", "utf8");
const renderRoute = readFileSync("src/app/api/home/studio/render/route.ts", "utf8");
const projectsRoute = readFileSync("src/app/api/home/studio/projects/route.ts", "utf8");
const projectsMigration = readFileSync("supabase/migrations/20260919022229_add_home_studio_saved_projects.sql", "utf8");
const shell = readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8");
const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

const image = `data:image/jpeg;base64,${Buffer.from("room-photo").toString("base64")}`;

test("Home Studio is discoverable inside BeastHome", () => {
  assert.match(shell, /Home Studio[\s\S]*\/dashboard\/home\/studio/);
  assert.match(navigation, /Home Studio[\s\S]*\/dashboard\/home\/studio/);
  assert.match(page, /title="Home Studio"/);
  assert.match(workspace, /Start with your room photos/);
  assert.match(workspace, /Choose room photos/);
});

test("Home Studio validates and bounds private project input", () => {
  const normalized = normalizeHomeStudioInput({
    photos: [
      { dataUrl: image, name: "front.jpg", label: "Primary view" },
      { dataUrl: image, name: "back.jpg", label: "Back wall" },
    ],
    roomName: " Office ",
    roomType: "Home office",
    dimensions: "12 × 13",
    style: "Modern",
    colors: "walnut and black",
    budget: "$1,000",
    mustKeep: "desk",
    needs: "work and gaming",
    openings: "one window",
    notes: "cable control",
  });
  assert.equal(normalized?.roomName, "Office");
  assert.equal(normalized?.style, "Modern");
  assert.equal(normalized?.photos.length, 2);
  assert.equal(isValidHomeStudioImage(image), true);
  assert.equal(isValidHomeStudioImage("data:text/plain;base64,AAAA"), false);
  assert.equal(normalizeHomeStudioInput({ image, roomName: "", roomType: "Office", style: "Modern" }), null);
});

test("Home Studio bounds multi-photo context and dimensioned room facts", () => {
  const normalized = normalizeHomeStudioInput({
    photos: Array.from({ length: 5 }, (_, index) => ({ dataUrl: image, name: `${index}.jpg`, label: `View ${index}` })),
    roomName: "Office",
    roomType: "Home office",
    style: "Modern",
    measurementUnit: "meters",
    roomLength: "4.25",
    roomWidth: "3.5",
    ceilingHeight: "9999",
    northWall: "<door> 90 cm",
  });
  assert.equal(normalized, null);
  const legacy = normalizeHomeStudioInput({ image, roomName: "Office", roomType: "Home office", style: "Modern" });
  assert.equal(legacy?.photos.length, 1);
  assert.equal(legacy?.measurementUnit, "feet");
});

test("Home Studio normalizes provider output before rendering it", () => {
  const plan = normalizeHomeStudioPlan({
    title: "Focused office",
    summary: "A practical room concept.",
    observedRoom: ["Desk is visible"],
    assumptions: ["Wall width is unconfirmed"],
    palette: [{ name: "Walnut", hex: "#76543A" }, { name: "Bad", hex: "not-a-color" }],
    layoutPlan: ["Verify desk clearance"],
    designMoves: ["Layer task lighting"],
    shoppingList: [{ item: "Task lamp", purpose: "Desk lighting", searchTerms: "black task lamp", targetPrice: "$30–$80 planning range", priority: "Essential" }],
    cautions: ["Measure before purchasing"],
    conceptPrompt: "Preserve room geometry and redesign the office.",
  });
  assert.equal(plan?.palette[1]?.hex, "#64748B");
  assert.equal(plan?.shoppingList[0]?.priority, "Essential");
  assert.equal(normalizeHomeStudioPlan({ title: "Incomplete" }), null);
});

test("Home Studio protects authorization privacy cost and action boundaries", () => {
  for (const route of [planRoute, renderRoute, projectsRoute]) {
    assert.match(route, /auth\.getUser\(\)/);
    assert.match(route, /requireMemberModuleEntitlement\("home"/);
    assert.match(route, /private, no-store/);
    assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE/);
  }
  assert.match(planRoute, /store: false/);
  assert.match(renderRoute, /confirmed !== true/);
  assert.match(renderRoute, /quality[\s\S]*low/);
  assert.match(workspace, /consumes one image-generation request/);
  assert.match(workspace, /does not purchase products or save the image/);
  assert.match(workspace, /Affiliate links are not active/);
  assert.match(workspace, /Photos remain session-only/);
});

test("saved Home Studio projects are owner scoped and never persist images", () => {
  assert.match(projectsMigration, /enable row level security/);
  assert.match(projectsMigration, /\(select auth\.uid\(\)\) = owner_id/g);
  assert.match(projectsMigration, /source_photo_count/);
  assert.doesNotMatch(projectsMigration, /image|photo_path|storage\.objects/);
  assert.match(projectsRoute, /\.eq\("owner_id", authorized\.user\.id\)/);
  assert.match(projectsRoute, /source_photo_count/);
  assert.doesNotMatch(projectsRoute, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("retailer searches encode user-controlled search terms", () => {
  const links = homeStudioRetailerLinks("lamp & desk");
  assert.equal(links.length, 6);
  assert.ok(links.every(link => link.href.startsWith("https://")));
  assert.ok(links.every(link => !link.href.includes("lamp & desk")));
});

test("printable design packets preserve the plan without executable member or provider text", () => {
  const plan = normalizeHomeStudioPlan({
    title: "Focused <office>", summary: "A practical room concept.", observedRoom: ["Desk is visible"], assumptions: [],
    palette: [{ name: "Walnut", hex: "#76543A" }], layoutPlan: ["Verify desk clearance"], designMoves: ["Layer task lighting"],
    shoppingList: [{ item: "Task lamp", purpose: "Desk lighting", searchTerms: "black task lamp", targetPrice: "$30–$80 planning range", priority: "Essential" }],
    cautions: ["Measure before purchasing"], conceptPrompt: "Preserve geometry. <script>alert(1)</script>",
  });
  assert.ok(plan);
  const packet = buildHomeStudioDesignPacket({
    project: {
      roomName: "Sean & Myra's office", roomType: "Home office", dimensions: "12 × 13", measurementUnit: "feet",
      roomLength: "13", roomWidth: "12", ceilingHeight: "8", northWall: "<door> on right", eastWall: "Window",
      southWall: "Solid", westWall: "Closet", furnitureMeasurements: "Desk 79 × 30 in", style: "Modern",
      colors: "Walnut", budget: "$1,000", mustKeep: "Desk", needs: "Work", openings: "Window", notes: "",
    },
    plan,
    sourceImage: image,
    createdAt: "2026-09-19T01:00:00.000Z",
  });
  assert.match(packet, /Shopping checklist/);
  assert.match(packet, /Sean &amp; Myra&#39;s office/);
  assert.match(packet, /Focused &lt;office&gt;/);
  assert.doesNotMatch(packet, /<script>alert/);
  assert.match(packet, /data:image\/jpeg;base64/);
  assert.match(packet, /Dimensioned floor-planning outline/);
  assert.doesNotMatch(packet, /<door>/);
  assert.match(buildHomeStudioFloorPlanSvg({
    roomName: "Office", roomType: "Home office", dimensions: "", measurementUnit: "feet", roomLength: "13", roomWidth: "12",
    ceilingHeight: "8", northWall: "<door>", eastWall: "", southWall: "", westWall: "", furnitureMeasurements: "",
    style: "Modern", colors: "", budget: "", mustKeep: "", needs: "", openings: "", notes: "",
  }), /&lt;door&gt;/);
});
