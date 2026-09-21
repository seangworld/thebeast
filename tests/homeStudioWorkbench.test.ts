import assert from "node:assert/strict";
import test from "node:test";
import * as h from "../src/lib/homeStudio";
import { parseHomeStudioAffiliates } from "../src/lib/homeStudioAffiliates";
const project = h.normalizeHomeStudioProject({roomName:"Office",roomType:"Home office",style:"Modern",roomLength:"12",roomWidth:"10"})!;
const base = h.normalizeHomeStudioPlan({title:"Office",summary:"Keep desk",conceptPrompt:"Preserve geometry"})!;
const item = {item:"Lamp",purpose:"Light",searchTerms:"desk lamp",targetPrice:"$5–500 estimate",priority:"Helpful" as const};

test("budget uses exact entered cents and quantities, not AI estimates",()=>{
 const p={...project,workspace:{...h.normalizeHomeStudioWorkspace(null),budgetLimit:"100"}};
 const plan={...base,shoppingList:[{...item,unitPrice:"10.10",quantity:3,status:"Purchased" as const},{...item,unitPrice:"20.25",quantity:2},{...item,unitPrice:"900",status:"Already owned" as const},{...item,unitPrice:"800",status:"Deferred" as const},{...item},{...item,unitPrice:"0"}]};
 assert.deepEqual(h.homeStudioBudget(p,plan),{spent:3030,remainingPurchases:4050,total:7080,unpriced:1,remaining:2920});
 assert.equal(h.homeStudioBudget({...p,workspace:{...p.workspace,budgetLimit:"1"}},plan).remaining,-6980);
 assert.equal(h.normalizeHomeStudioMoney("1e4"),""); assert.equal(h.normalizeHomeStudioMoney("-1"),"");assert.equal(h.normalizeHomeStudioQuantity(Infinity),1);
});
test("versions are independent bounded snapshots with no nested history or images",()=>{
 const p={...project,workspace:h.normalizeHomeStudioWorkspace(null)};
 const plan={...base,shoppingList:[{...item,notes:"Keep original"}]};
 const version=h.createHomeStudioVersion(p,plan,"Option A","v1","2026-09-21T00:00:00Z");
 plan.shoppingList[0].notes="Changed";assert.equal(version.plan.shoppingList[0].notes,"Keep original");
 const normalized=h.normalizeHomeStudioWorkspace({versions:Array(9).fill({...version,project:{...p,workspace:{versions:[version]},photo:"secret"}})});
 assert.equal(normalized.versions.length,5);assert.equal(new Set(normalized.versions.map(v=>v.id)).size,5);
 assert.ok(!JSON.stringify(normalized).includes("secret"));assert.equal((normalized.versions[0].project as h.HomeStudioProject).workspace,undefined);
 assert.equal(h.homeStudioBriefMatches(project,p),true);
});
test("backups preserve client/layout/budget/version data and reject malformed input",()=>{
 const p={...project,workspace:h.normalizeHomeStudioWorkspace({budgetLimit:"100",client:{name:"Client",scope:"One room"},layout:[{id:"a",label:"Desk",kind:"Furniture",x:1,y:2,width:3,depth:2}],versions:[h.createHomeStudioVersion(project,base,"A","a","2026-09-21")]})};
 const restored=h.parseHomeStudioBackup(JSON.stringify({schemaVersion:2,project:p,plan:base,sourceImages:["private photo"]}));
 assert.deepEqual(restored,{project:p,plan:base});
 for(const text of ["null","[]","{}","not json",JSON.stringify({schemaVersion:99,project}),JSON.stringify({project:{...project,roomLength:"-1"}}),"x".repeat(500001)]) assert.throws(()=>h.parseHomeStudioBackup(text));
 assert.equal(h.parseHomeStudioBackup(JSON.stringify({project,plan:null})).plan,null);
});
test("layout detects overlaps and room boundaries, and escapes exported labels",()=>{
 const p={...project,workspace:h.normalizeHomeStudioWorkspace({layout:[{id:"a",label:"<script>",kind:"Furniture",x:1,y:1,width:3,depth:2},{id:"b",label:"Door",kind:"Door",x:2,y:1,width:1,depth:1},{id:"c",label:"Sofa",x:11,y:0,width:2,depth:2}]})};
 assert.ok(h.homeStudioLayoutIssues(p).some(x=>x.includes("overlaps")));
 assert.ok(h.homeStudioLayoutIssues(p).some(x=>x.includes("outside")));
 const svg=h.buildHomeStudioFloorPlanSvg(p);assert.ok(svg.includes("&lt;script&gt;"));assert.ok(!svg.includes("<script>"));
 assert.equal(h.normalizeHomeStudioLayout([{x:0,y:0,width:0,depth:1}]).length,0);
});
test("client quote contains only delivery-facing fields and safe Stripe links",()=>{
 const p={...project,workspace:h.normalizeHomeStudioWorkspace({client:{name:"<Client>",email:"private@example.com",scope:"One concept",fee:"25",paymentLink:"https://buy.stripe.com/test_123",payment:"Paid externally"}})};
 const quote=h.buildHomeStudioClientQuote(p);assert.ok(quote.includes("$25.00"));assert.ok(quote.includes("&lt;Client&gt;"));assert.ok(quote.includes("https://buy.stripe.com/test_123"));assert.ok(!quote.includes("private@example.com"));assert.ok(!quote.includes("Paid externally"));
 for (const url of ["javascript:alert(1)","https://buy.stripe.com.evil.test/pay","https://user:pass@buy.stripe.com/test"]) assert.equal(h.homeStudioPaymentLink(url),"");
});
test("affiliate activation is explicit, validated and query-encoded",()=>{
 const config=JSON.stringify([{retailer:"Amazon",template:"https://www.amazon.com/s?k={query}&tag=example-20"},{retailer:"IKEA",template:"javascript:alert(1)"}]);
 assert.deepEqual(parseHomeStudioAffiliates(config,undefined),[]);
 // One malformed entry must not activate any unexpected destinations.
 const good=parseHomeStudioAffiliates(JSON.stringify([{retailer:"Amazon",template:"https://www.amazon.com/s?k={query}&tag=example-20"}]),"true");
 assert.equal(good.length,1);const links=h.homeStudioRetailerLinks("desk & chair",good);
 assert.equal(links[0].affiliate,true);assert.ok(links[0].href.includes("desk%20%26%20chair"));assert.equal(links[1].affiliate,false);
 assert.equal(parseHomeStudioAffiliates(JSON.stringify([{retailer:"Amazon",template:"https://amazon.com.evil.test/?q={query}"}]),"true").length,0);
 assert.ok(h.homeStudioRetailerLinks("desk").every(link=>!link.affiliate));
});
