import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHomeStudioDesignPacket,
  isValidHomeStudioImage,
  homeStudioRetailerLinks,
  normalizeHomeStudioInput,
  normalizeHomeStudioPlan,
} from "../src/lib/homeStudio";

const workspace = readFileSync("src/app/dashboard/home/studio/HomeStudioWorkspace.tsx", "utf8");
const planRoute = readFileSync("src/app/api/home/studio/plan/route.ts", "utf8");
const renderRoute = readFileSync("src/app/api/home/studio/render/route.ts", "utf8");
const shell = readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8");
const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

const image = `data:image/jpeg;base64,${Buffer.from("room-photo").toString("base64")}`;

test("Home Studio is discoverable inside BeastHome", () => {
  assert.match(shell, /Home Studio[\s\S]*\/dashboard\/home\/studio/);
  assert.match(navigation, /Home Studio[\s\S]*\/dashboard\/home\/studio/);
  assert.match(workspace, /BeastHome · Home Studio/);
});

test("Home Studio validates and bounds private project input", () => {
  const normalized = normalizeHomeStudioInput({
    image,
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
  assert.equal(isValidHomeStudioImage(image), true);
  assert.equal(isValidHomeStudioImage("data:text/plain;base64,AAAA"), false);
  assert.equal(normalizeHomeStudioInput({ image, roomName: "", roomType: "Office", style: "Modern" }), null);
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
  for (const route of [planRoute, renderRoute]) {
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
  assert.match(workspace, /not live inventory, exact-fit promises, endorsements, or affiliate links yet/);
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
    project: { roomName: "Sean & Myra's office", roomType: "Home office", dimensions: "12 × 13", style: "Modern", colors: "Walnut", budget: "$1,000", mustKeep: "Desk", needs: "Work", openings: "Window", notes: "" },
    plan,
    sourceImage: image,
    createdAt: "2026-09-19T01:00:00.000Z",
  });
  assert.match(packet, /Shopping checklist/);
  assert.match(packet, /Sean &amp; Myra&#39;s office/);
  assert.match(packet, /Focused &lt;office&gt;/);
  assert.doesNotMatch(packet, /<script>alert/);
  assert.match(packet, /data:image\/jpeg;base64/);
});
