// Offline only. No provider transport or credential access.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const path='docs/guidance-counselor-upgrade/evaluation/preparation-20261020/scenario-packets.json';
const raw=readFileSync(path,'utf8'), data=JSON.parse(raw);
assert.equal(data.syntheticOnly,true);
assert.match(data.status,/not executed/);
assert.equal(data.packets.length,11);
assert.equal(new Set(data.packets.map(p=>p.scenarioId)).size,7);
assert.equal(new Set(data.packets.map(p=>p.id)).size,11);
for(const p of data.packets){
 assert.equal(p.answer,null); assert.equal(p.grade,null);
 assert.ok(p.criteria.length>=2); assert.ok(p.prompt);
 if(p.turn>1){assert.ok(data.packets.some(q=>q.scenarioId===p.scenarioId && q.turn===p.turn-1));assert.match(p.historyPolicy,/actual/);}
 if(p.seedHistory.length) assert.match(p.seedHistoryPurpose,/not an observed/);
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('rev-parse','HEAD:src'),git('rev-parse','73187630:src'));
assert.equal(git('diff','--name-only','73187630','--','src'),'');
console.log(JSON.stringify({status:'PREPARATION VERIFIED; PAID DISPATCH NOT READY',scenarioFamilies:7,turns:11,packetSha256:createHash('sha256').update(raw).digest('hex'),applicationSourceUnchanged:true,modelCalls:0},null,2));
