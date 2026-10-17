// Replay actual saved model output without making any model calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDirectorReasoning, approveDirectorReasoning } from '../.test-dist/src/lib/directorReasoning.js';
const evidence=JSON.parse(readFileSync('docs/avery-director-real-model-results.json','utf8'));
const attempt=id=>evidence.attempts.find(a=>a.scenario===id);
test('actual model replacement proposal is rejected by strengthened checkpoint guard',()=>{
 const a=attempt('incorrect-specialist-result');
 assert.throws(()=>validateDirectorReasoning(a.plan,a.context),/replace existing work/);
});
test('actual model unnecessary blockers cannot silently authorize work',()=>{
 const a=attempt('cross-domain-transition');
 assert.throws(()=>approveDirectorReasoning(a.plan,a.context,a.context),/Resolve/);
});
test('actual model accepted narrow completed work without proposing duplicate tools',()=>{
 for(const id of ['verify-not-life-completion','repeat-completed-request']){
  const a=attempt(id);assert.equal(validateDirectorReasoning(a.plan,a.context).steps.length,0);
 }
});
