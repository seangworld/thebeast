import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, unlinkSync } from 'node:fs';
import { prepareFollowUp } from './director-second-eval-followups.mjs';
const manifest=JSON.parse(readFileSync('docs/avery-director-retest-plan.json','utf8'));
function parent(id){const s=manifest.cases.find(c=>c.id===id);return {scenario:id,context:s.context,state:'response_validated_requires_manual_review',plan:{steps:[],assessments:[{taskId:s.context.checkpoints.find(t=>t.status!=='verified')?.id,disposition:'resume_existing'}],ownerDecisions:[],missingInformation:[],contradictions:[]}}}
test('actual synthetic correction and dependent recovery retain identity and verify without duplicate execution',async()=>{for(const [index,id] of ['incorrect-specialist-result','interrupted-care-objective','lost-connection-dependent-review'].entries()){const result=await prepareFollowUp(parent(id),90+index);assert.equal(result.execution.executed,true);assert.equal(result.execution.verified,true);assert.equal(result.execution.sameCheckpoint,true);assert.equal(result.execution.noDuplicate,true);assert.equal(result.execution.attemptsAfter,result.execution.attemptsBefore+1);unlinkSync(`/private/tmp/avery-second-followup-${90+index}.json`)}});
test('adapter cannot silently fix a rejected or blocked model action or invent external payment proof',async()=>{const p=parent('incorrect-specialist-result');p.plan.ownerDecisions=['Still blocked'];assert.equal((await prepareFollowUp(p,99)).execution.executed,false);p.state='failed';p.plan.ownerDecisions=[];assert.equal((await prepareFollowUp(p,99)).execution.executed,false);const claim=manifest.cases.find(c=>c.id==='computed-fee-versus-payment-proof');assert.equal((await prepareFollowUp({scenario:claim.id,context:claim.context},99)).execution.externalProofSupplied,false)});

test('rejected-output follow-up retains bounded visible decision and exact safe validation feedback without executing',async()=>{
 const p=parent('incorrect-specialist-result');p.state='failed';delete p.plan;p.failure='Unsupported or unverified evidence scope';p.response={output:[{type:'message',content:[{type:'output_text',text:'{"steps":[],"evidenceClaims":[{"taskId":"cash-check","scope":"saved_record_consistency_only"}]}'}]}]};
 const result=await prepareFollowUp(p,99);assert.equal(result.execution.executed,false);assert.match(result.context.goal.description,/Unsupported or unverified evidence scope/);assert.match(result.context.goal.description,/evidenceClaims/);
});
