import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHomeStudioPlan, normalizeHomeStudioSavedProject, buildHomeStudioDesignPacket, homeStudioShoppingStatus } from "../src/lib/homeStudio";
const raw = { title: "Office", summary: "A practical room", conceptPrompt: "Keep the room geometry", shoppingList: [{ item: "Lamp", purpose: "Light", searchTerms: "desk lamp", targetPrice: "$20–40", priority: "Helpful" }] };
test("older plans retain their shape and default to needed", () => {
 const plan = normalizeHomeStudioPlan(raw)!;
 assert.equal(plan.shoppingList[0].status, undefined);
 assert.equal(homeStudioShoppingStatus(plan.shoppingList[0].status), "Needed");
});
test("checklist survives project normalization and JSON roundtrip", () => {
 for (const status of ["Needed", "Already owned", "Purchased", "Deferred"]) {
 const saved = normalizeHomeStudioSavedProject(JSON.parse(JSON.stringify({project:{roomName:"Office",roomType:"Home office",style:"Modern"},plan:{...raw,shoppingList:[{...raw.shoppingList[0],status,notes:"  Check height  "}]}})))!;
 assert.equal(saved.plan!.shoppingList[0].status,status);
 assert.equal(saved.plan!.shoppingList[0].notes,"Check height");
 }
});
test("untrusted checklist values are bounded and escaped in packets", () => {
 const saved = normalizeHomeStudioSavedProject({project:{roomName:"Office",roomType:"Home office",style:"Modern"},plan:{...raw,shoppingList:[{...raw.shoppingList[0],status:"<script>",notes:"<script>alert(1)</script>"+"x".repeat(500)}]}})!;
 assert.equal(saved.plan!.shoppingList[0].status,"Needed");
 assert.equal(saved.plan!.shoppingList[0].notes!.length,400);
 const packet=buildHomeStudioDesignPacket({project:saved.project,plan:saved.plan!});
 assert.ok(packet.includes("Status and notes"));
 assert.ok(packet.includes("&lt;script&gt;"));
 assert.ok(!packet.includes("<script>"));
});
