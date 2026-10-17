import test from "node:test";
import assert from "node:assert/strict";
import { reasonAboutDirectorObjective } from "../src/lib/directorReasoningProvider";
import type { requestOpenAIResponse } from "../src/lib/digitalStaffRuntime/provider";
const context = { goal: { id: "goal", title: "Unfamiliar objective", updated_at: "synthetic" }, availableCapabilities: [], checkpoints: [] };
test("AI planning fails closed without enablement and never silently uses scripted success", async () => {
  const enabled = process.env.BEAST_DIRECTOR_REASONING_ENABLED;
  delete process.env.BEAST_DIRECTOR_REASONING_ENABLED;
  let calls = 0;
  try { await assert.rejects(reasonAboutDirectorObjective("owner", context, undefined, (async () => { calls++; return {}; }) as typeof requestOpenAIResponse), /not enabled/); assert.equal(calls, 0); }
  finally { if (enabled === undefined) delete process.env.BEAST_DIRECTOR_REASONING_ENABLED; else process.env.BEAST_DIRECTOR_REASONING_ENABLED = enabled; }
});
test("mocked provider contract is one bounded structured request, not proof of model competence", async () => {
  const enabled = process.env.BEAST_DIRECTOR_REASONING_ENABLED, key = process.env.OPENAI_API_KEY;
  process.env.BEAST_DIRECTOR_MODEL_CONFIG = "sol-high-v1"; process.env.BEAST_DIRECTOR_REASONING_ENABLED = "true"; process.env.OPENAI_API_KEY = "sk-synthetic-not-a-real-key";
  let calls = 0;
  const proposal = { contractVersion: 2, requirements: [], interpretation: "No supported tool can do this objective.", steps: [], alternatives: [], contradictions: [], missingInformation: [], ownerDecisions: [], unsupportedWork: ["Required capability is unavailable."], assessments: [] };
  try {
    const result = await reasonAboutDirectorObjective("synthetic-owner", context, undefined, (async (body: unknown) => {
      calls++; const request = body as Record<string, unknown>;
      assert.equal(request.store, false); assert.equal(request.max_output_tokens, 4800); assert.equal(request.tools, undefined);
      return { model: "gpt-6.1-sol", service_tier: "default", status: "completed", usage: { input_tokens: 100, output_tokens: 50 }, output_text: JSON.stringify(proposal) };
    }) as typeof requestOpenAIResponse);
    assert.equal(calls, 1); assert.deepEqual(result, proposal);
  } finally {
    if (enabled === undefined) delete process.env.BEAST_DIRECTOR_REASONING_ENABLED; else process.env.BEAST_DIRECTOR_REASONING_ENABLED = enabled;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});
test("incomplete provider output is never parsed, assigned, or automatically retried", async()=>{
  const enabled=process.env.BEAST_DIRECTOR_REASONING_ENABLED,key=process.env.OPENAI_API_KEY;
  process.env.BEAST_DIRECTOR_MODEL_CONFIG="sol-high-v1"; process.env.BEAST_DIRECTOR_REASONING_ENABLED="true";process.env.OPENAI_API_KEY="sk-synthetic-not-a-real-key";let calls=0;
  try { await assert.rejects(reasonAboutDirectorObjective("synthetic-incomplete-owner",context,undefined,(async()=>{calls++;return{model:"gpt-6.1-sol",service_tier:"default",status:"incomplete",incomplete_details:{reason:"max_output_tokens"},output_text:'{"interpretation":'};}) as typeof requestOpenAIResponse),/incomplete.*No plan/);assert.equal(calls,1); }
  finally {if(enabled===undefined)delete process.env.BEAST_DIRECTOR_REASONING_ENABLED;else process.env.BEAST_DIRECTOR_REASONING_ENABLED=enabled;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test("Director-specific configuration is explicit and cannot inherit another agent's model", async()=>{
  const old={...process.env};
  process.env.BEAST_DIRECTOR_REASONING_ENABLED="true"; process.env.OPENAI_API_KEY="sk-synthetic-not-a-real-key";
  delete process.env.BEAST_DIRECTOR_MODEL_CONFIG;
  try {
    let calls=0;
    await assert.rejects(reasonAboutDirectorObjective("config-owner",context,undefined,(async()=>{calls++;return{};}) as typeof requestOpenAIResponse),/not enabled/); assert.equal(calls,0);
    process.env.BEAST_DIRECTOR_MODEL_CONFIG="sol-high-v1"; process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL="unapproved-premium";
    const receipts: unknown[]=[];
    await assert.rejects(reasonAboutDirectorObjective("config-owner",context,undefined,(async(body:unknown)=>{
      const b=body as {model:string;reasoning:{effort:string};service_tier:string};assert.equal(b.model,"gpt-6.1-sol");assert.equal(b.reasoning.effort,"high");assert.equal(b.service_tier,"default");
      return{status:"completed",model:"wrong-model",usage:{input_tokens:100,output_tokens:10}};
    }) as typeof requestOpenAIResponse,value=>{receipts.push(value);}),/identity/);assert.equal(receipts.length,1);
  } finally {for(const name of ["BEAST_DIRECTOR_MODEL_CONFIG","BEAST_DIRECTOR_REASONING_ENABLED","OPENAI_API_KEY","OPENAI_DIGITAL_STAFF_STRONG_MODEL"]){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}}
});
