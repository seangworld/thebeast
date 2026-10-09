import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";
import { beastMoneyNavigation, memberBeastMoneyNavigation } from "../src/lib/moduleNavigation";

test("Money Settings is a visible top-level item for owners and members", () => {
 const item={label:"Settings",href:"/dashboard/money/settings"};
 assert.deepEqual(beastMoneyCoreNavigation.find(x=>x.href===item.href),item);
 assert.ok(beastMoneyNavigation.children?.some(x=>x.href===item.href));
 assert.ok(memberBeastMoneyNavigation.children?.some(x=>x.href===item.href));
 assert.equal(isBeastMoneyNavigationActive(item,item.href),true);
});
test("Settings link opens the existing page containing the cash buffer control",()=>{
 const page=readFileSync("src/app/dashboard/money/settings/page.tsx","utf8");
 assert.match(page,/title="Money Settings"/);
 assert.match(page,/>Cash Settings</);
 assert.match(page,/>Buffer</);
 assert.match(page,/checking_buffer: Number\(buffer\)/);
 assert.match(page,/Save All Settings/);
});
