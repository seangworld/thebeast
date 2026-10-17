// Replay captured ACTUAL second-batch failures. Hypothetical repairs below are
// no-cost contract fixtures, never reclassified as successful model responses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, unlinkSync } from 'node:fs';
import { validateDirectorReasoning, reasoningInput } from '../.test-dist/src/lib/directorReasoning.js';
import { prepareFollowUp } from './director-second-eval-followups.mjs';
const batch=JSON.parse(readFileSync('docs/avery-director-second-model-results.json','utf8'));
const attempt=id=>batch.attempts.find(a=>a.scenario===id);
function raw(a){return JSON.parse(a.response.output_text||a.response.output.flatMap(x=>x.content||[]).find(x=>x.type==='output_text').text)}
test('actual unverified positive citation remains rejected; valid same-checkpoint retry needs no extra owner reset',async()=>{
 const a=attempt('incorrect-specialist-result');assert.throws(()=>validateDirectorReasoning(raw(a),a.context),/evidence scope/);
 const repaired=raw(a);repaired.evidenceClaims=[];repaired.ownerDecisions=[];repaired.assessments[0].disposition='resume_existing';
 const plan=validateDirectorReasoning(repaired,a.context);const result=await prepareFollowUp({...a,plan,state:'response_validated_requires_manual_review'},95);
 assert.equal(result.execution.verified,true);assert.equal(result.execution.sameCheckpoint,true);assert.equal(result.execution.noDuplicate,true);unlinkSync('/private/tmp/avery-second-followup-95.json');
 const contract=JSON.parse(reasoningInput(a.context)).executionContract.correction;
 assert.match(contract,/Only exhaustion requires explicit member approval/);
});
test('actual dependent-resume duplicated as a new step remains rejected; corrected contract reuses persisted row',async()=>{
 const a=attempt('lost-connection-dependent-review');assert.throws(()=>validateDirectorReasoning(raw(a),a.context),/replace existing work/);
 const repaired=raw(a);repaired.steps=[];
 const plan=validateDirectorReasoning(repaired,a.context);const result=await prepareFollowUp({...a,plan,state:'response_validated_requires_manual_review'},96);
 assert.equal(result.execution.verified,true);assert.equal(result.execution.sameCheckpoint,true);assert.equal(result.execution.attemptsAfter,3);assert.equal(result.execution.noDuplicate,true);unlinkSync('/private/tmp/avery-second-followup-96.json');
});
test('second batch contains only 16 charged attempts and preserves the credential by recorded read-only check',()=>{
 assert.equal(batch.attempts.length,16);assert.equal(batch.reservedUsd,1.69472);assert.equal(batch.credentialPreserved,true);
 assert.equal(batch.attempts.filter(a=>a.state==='failed').length,4);
 assert.ok(batch.actualSpecialistExecution.some(e=>e.executed&&e.verified&&e.noDuplicate));
 assert.equal(batch.actualSpecialistExecution.filter(e=>e.parent!=='computed-fee-versus-payment-proof'&&!e.executed).length,2);
});
