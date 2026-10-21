// Offline only. No provider transport or credential access.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base='docs/guidance-counselor-upgrade/evaluation/preparation-20261020/';
const original=readFileSync(base+'scenario-packets.json','utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(sha(original),'ba1e8a32aa088d03c40896824b6296a42600effcce3675f9deb6b3a2d54ba1aa','Historical packet changed');
const path=base+'scenario-packets-v2.json';
const raw=readFileSync(path,'utf8'), data=JSON.parse(raw);
assert.equal(sha(raw),'a2a6b43ee1241c3273884baee5bf24e0a8238d4cd558bb58a82618365a6e3d03','Revision 2 packet changed; explicit refreeze required');
assert.equal(data.revision,2);
const previous=JSON.parse(original);
for(const [index,p] of data.packets.entries()){
 const prior=previous.packets[index];
 assert.deepEqual({...p,prompt:null},{...prior,prompt:null},'Criteria, records or history changed');
 if(!['GC-05-T1','GC-05-T3'].includes(p.id))assert.equal(p.prompt,prior.prompt);
}
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
const families=[...new Set(data.packets.map(p=>p.scenarioId))];
const criterionCount=families.reduce((count,id)=>count+data.packets.find(p=>p.scenarioId===id).criteria.length,0);
for(const id of families){const packets=data.packets.filter(p=>p.scenarioId===id);for(const p of packets)assert.deepEqual(p.criteria,packets[0].criteria);}
console.log(JSON.stringify({status:'BOTH PACKETS VERIFIED; PAID DISPATCH NOT READY',revision:2,scenarioFamilies:7,turns:11,uniqueScenarioCriteria:criterionCount,packetSha256:sha(raw),gradingRulesSha256:sha(readFileSync(base+'GRADING-RULES.md')),sourceBaselineSha256:sha(readFileSync(base+'SOURCE-BASELINE.md')),historicalPacketUnchanged:true,applicationSourceUnchanged:true,modelCalls:0},null,2));
