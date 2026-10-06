import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(new URL("..",import.meta.url).pathname);
test("BF4 Control Center exposes core operator destinations without a new paid surface",()=>{
 const text=fs.readFileSync(path.join(root,"src/app/dashboard/operations/fusion/page.tsx"),"utf8");
 for(const label of ["Projects","Work Queue","Approvals","Agents","Releases","Costs","Evidence","Diagnostics"]) assert.match(text,new RegExp(label));
 assert.match(text,/deterministic/);assert.doesNotMatch(text,/openai|anthropic|paid api/i);
});
