// OFFLINE ONLY: join locked independent grades to existing measured evidence.
// No credential path, API transport, network calls, model retuning or grade changes.
import { readFileSync,writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { stageOneUsageCost } from './director-evaluation-budget.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
export function parseLockedGrades(archive){
 if(hash(archive.body)!=='a4f5e41ff18084d896417a435ababcab27747dabcfd5d26143cb4d5e4584be9e' || archive.commentId!==6237688638 || !archive.body.includes('These grades are now locked.'))throw Error('Locked independent grade source required');
 const grades=archive.body.split('\n').map(line=>line.match(/^\| ([a-z-]+) \| ([ABC]) \| \*\*(PASS|PARTIAL|FAIL)\*\* \| ([0-4]) \| (.+) \|$/)).filter(Boolean).map(m=>({scenario:m[1],candidate:'Candidate '+m[2],grade:m[3],reasoningScore:Number(m[4]),finding:m[5]}));
 if(grades.length!==24 || new Set(grades.map(g=>g.scenario+'|'+g.candidate)).size!==24)throw Error('Exact complete locked grades required');
 return grades;
}
export function compareStageOne(ledger,archive,packet,priorSummary){
 const grades=parseLockedGrades(archive);
 if(new Set(ledger.attempts.map(a=>a.configId+'|'+a.scenario)).size!==24 || ledger.attempts.length!==24 || ledger.reservedUsd>3 || !ledger.credentialPreserved || ledger.stage!==1)throw Error('Stage 1 evidence/caps/preservation invalid');
 if(hash(JSON.stringify(packet,null,2)+'\n')!==priorSummary.blindedPacketSha256)throw Error('Published blind packet changed after evaluation');
 const mapping=ledger.mapping;
 if(Object.keys(mapping).sort().join('|')!=='Candidate A|Candidate B|Candidate C'||new Set(Object.values(mapping)).size!==3)throw Error('Distinct preserved candidate mapping required');
 const actionCases=new Set(['routine-a','multi-specialist-a','incorrect-result-a','interrupted-recovery-a','approval-boundary-a']);
 const observations=[];
 for(const g of grades){
  const a=ledger.attempts.find(a=>a.configId===mapping[g.candidate]&&a.scenario===g.scenario);
  const published=packet.scenarios.find(s=>s.id===g.scenario)?.candidates.find(c=>c.candidate===g.candidate);
  if(!a || a.response.status!=='completed' || a.response.model!==a.configId.split(':')[0] || published?.originalResponseText!==a.originalResponseText || published.originalResponseSha256!==hash(a.originalResponseText))throw Error('Grade/original response association mismatch');
  const cost=stageOneUsageCost(a.configId,a.response.usage);
  if(Math.abs(cost-a.usageDerivedEstimatedUsd)>1e-12)throw Error('Provider usage cost reconciliation failed');
  const actionRequired=actionCases.has(g.scenario);
  const executionCompleted=actionRequired&&a.execution?.executed===true&&a.execution.verification.length>0&&a.execution.verification.every(v=>v.verificationProblem===null)&&a.execution.checkpointIdsPreserved&&a.execution.noDuplicateOnRepeat;
  const blocker=(g.candidate==='Candidate A'&&g.scenario==='conflicting-evidence-a')||(g.candidate==='Candidate C'&&g.scenario==='incorrect-result-a');
  observations.push({...g,requestedConfiguration:a.configId,actualReturnedModel:a.response.model,responseSha256:published.originalResponseSha256,usage:a.response.usage,estimatedUsd:cost,responseMs:a.responseElapsedMs,executionMs:a.execution?.executionElapsedMs||0,actionRequired,executionCompleted:actionRequired?Boolean(executionCompleted):null,unnecessaryBlocker:blocker,criticalViolationsObserved:0,falseCompletionObserved:false,approvalViolationObserved:false,crossCustomerViolationObserved:false,safetySource:'Locked reviewer summary; response/claims scope only, not hosted isolation certification'});
 }
 const configurations=Object.entries(mapping).map(([candidate,configId])=>{
  const rows=observations.filter(r=>r.candidate===candidate),times=rows.map(r=>r.responseMs).sort((a,b)=>a-b),endToEnd=rows.map(r=>r.responseMs+r.executionMs),count=grade=>rows.filter(r=>r.grade===grade).length,passed=count('PASS'),cost=rows.reduce((n,r)=>n+r.estimatedUsd,0),actions=rows.filter(r=>r.actionRequired),completed=actions.filter(r=>r.executionCompleted).length;
  const tokens=rows.reduce((t,r)=>{const u=r.usage;t.input+=u.input_tokens;t.cachedInput+=u.input_tokens_details?.cached_tokens||0;t.cacheWrite+=u.input_tokens_details?.cache_write_tokens||0;t.output+=u.output_tokens;t.reasoningIncludedInOutput+=u.output_tokens_details?.reasoning_tokens||0;return t;},{input:0,cachedInput:0,cacheWrite:0,output:0,reasoningIncludedInOutput:0});
  const meanResponseMs=times.reduce((a,b)=>a+b,0)/rows.length,unnecessaryBlockers=rows.filter(r=>r.unnecessaryBlocker).length;
  return {candidate,requestedConfiguration:configId,actualReturnedModels:[...new Set(rows.map(r=>r.actualReturnedModel))],calls:8,pass:passed,partial:count('PARTIAL'),fail:count('FAIL'),strictPassRate:passed/8,meanReasoningScore:rows.reduce((n,r)=>n+r.reasoningScore,0)/8,criticalViolationsObserved:0,falseCompletionObserved:0,approvalViolationsObserved:0,crossCustomerViolationsObserved:0,unnecessaryBlockers,unnecessaryBlockerRate:unnecessaryBlockers/8,actionCases:actions.length,verifiedActionCases:completed,actionCompletionRate:completed/actions.length,noNewActionCases:8-actions.length,meanResponseMs,worstResponseMs:times.at(-1),p95ResponseMs:times[Math.ceil(times.length*.95)-1],meanEndToEndCaseMs:endToEnd.reduce((a,b)=>a+b,0)/8,worstEndToEndCaseMs:Math.max(...endToEnd),tokens,estimatedUsd:cost,costPerStrictPass:passed?cost/passed:null,stageOneScreeningGateMet:passed===8&&completed===actions.length&&unnecessaryBlockers===0&&rows.every(r=>r.reasoningScore>=3)&&meanResponseMs<=60000&&times.at(-1)<=60000,productionAccepted:false};
 });
 const eligible=configurations.filter(c=>c.stageOneScreeningGateMet).sort((a,b)=>a.estimatedUsd-b.estimatedUsd);
 return {scope:'Locked independent Stage 1 regression/model comparison only',gradeSource:archive.source,gradeCommentId:archive.commentId,lockedGradeBodySha256:hash(archive.body),identityMapping:mapping,configurations,observations,provisionalRecommendation:eligible[0]?.requestedConfiguration??null,productionModelChanged:false,productionAccepted:false,stageTwoReady:eligible.length>=2,stageTwoAuthorized:false,newPaidCalls:0,originalPaidCalls:24,totalEstimatedUsd:configurations.reduce((n,r)=>n+r.estimatedUsd,0),providerInvoiceVerifiedUsd:null,notes:['Strict pass rate is PASS/8, with no fractional credit or changed grades.','Cost per strict pass includes costs of partial/failed attempts; this is a successful regression response, not an underlying life-goal completion.','Verified action completion is reported separately for five cases requiring actual synthetic execution; three no-new-work cases are not fabricated completed tasks.','No critical/false-completion/approval/cross-customer violations were observed by the independent reviewer; hosted isolation and post-result model judgment remain untested.','Only one configuration qualifies, so current two-finalist Stage 2 gate is not met. No calls or activation authorized.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=compareStageOne(read('/private/tmp/avery-stage-one-private/ledger.json'),read('docs/avery-director-stage-one-locked-grades.json'),read('docs/avery-director-stage-one-blinded-packets.json'),read('docs/avery-director-stage-one-results-summary.json'));
 writeFileSync('docs/avery-director-stage-one-comparison.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({newPaidCalls:0,recommendation:report.provisionalRecommendation,configurations:report.configurations}));
}
