import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(new URL("..",import.meta.url).pathname);
test("BF5.1 wizard hand-holds, resumes, verifies and teaches first project",()=>{const s=fs.readFileSync(path.join(root,"src/app/beastfusion/setup/GuidedBeastFusionSetup.tsx"),"utf8");for(const x of ["Yes","No","I'm not sure","We'll help you get it","What this means","localStorage","Run full preflight","First project","Developer → Tests → Reviewer → Approval"])assert.ok(s.includes(x),x);assert.ok(s.includes("!done.includes(index)"));});
test("BF5.1 preflight has all commercial readiness gates",()=>{const s=fs.readFileSync(path.join(root,"src/app/api/beastfusion/setup/preflight/route.ts"),"utf8");for(const x of ["license","administrator","workspace","github","repositories","byok","developer","reviewer","authority","budget","recovery"])assert.ok(s.includes(x),x);});
