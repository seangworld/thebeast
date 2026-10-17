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
  process.env.BEAST_DIRECTOR_REASONING_ENABLED = "true"; process.env.OPENAI_API_KEY = "sk-synthetic-not-a-real-key";
  let calls = 0;
  const proposal = { interpretation: "No supported tool can do this objective.", steps: [], alternatives: [], contradictions: [], missingInformation: [], ownerDecisions: [], unsupportedWork: ["Required capability is unavailable."], assessments: [] };
  try {
    const result = await reasonAboutDirectorObjective("synthetic-owner", context, undefined, (async (body: unknown) => {
      calls++; const request = body as Record<string, unknown>;
      assert.equal(request.store, false); assert.equal(request.max_output_tokens, 2400); assert.equal(request.tools, undefined);
      return { status: "completed", output_text: JSON.stringify(proposal) };
    }) as typeof requestOpenAIResponse);
    assert.equal(calls, 1); assert.deepEqual(result, proposal);
  } finally {
    if (enabled === undefined) delete process.env.BEAST_DIRECTOR_REASONING_ENABLED; else process.env.BEAST_DIRECTOR_REASONING_ENABLED = enabled;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});
test("incomplete provider output is never parsed, assigned, or automatically retried", async()=>{
  const enabled=process.env.BEAST_DIRECTOR_REASONING_ENABLED,key=process.env.OPENAI_API_KEY;
  process.env.BEAST_DIRECTOR_REASONING_ENABLED="true";process.env.OPENAI_API_KEY="sk-synthetic-not-a-real-key";let calls=0;
  try { await assert.rejects(reasonAboutDirectorObjective("synthetic-incomplete-owner",context,undefined,(async()=>{calls++;return{status:"incomplete",incomplete_details:{reason:"max_output_tokens"},output_text:'{"interpretation":'};}) as typeof requestOpenAIResponse),/incomplete.*No plan/);assert.equal(calls,1); }
  finally {if(enabled===undefined)delete process.env.BEAST_DIRECTOR_REASONING_ENABLED;else process.env.BEAST_DIRECTOR_REASONING_ENABLED=enabled;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
