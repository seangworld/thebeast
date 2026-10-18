// Publish completed real evaluation evidence; never dispatches models or reads credentials.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {blindedFinalPacket} from './director-final-assessment.mjs';
import {finalCases,sha,prepareFinal} from './prepare-director-final.mjs';
const root='/private/tmp/avery-final-approved-6250327717';
const ledger=JSON.parse(readFileSync(root+'/ledger.json','utf8'));
if(!ledger.finished&&!ledger.halted)throw Error('Assessment still active or needs reconciliation; do not publish provisional evidence');
const persistence=JSON.parse(readFileSync(root+'/persistence-audit.json','utf8'));
const manifest=prepareFinal();if(ledger.manifestSha256!==sha(manifest)||ledger.attempts.length>16||ledger.reservedUsd>5.50||!ledger.credentialPreserved)throw Error('Assessment integrity/cap/credential precondition');
const folder='docs/avery-final-completed';mkdirSync(folder,{recursive:true});
const cases=[];
for(const scenario of finalCases){
 const attempts=ledger.attempts.filter(a=>a.scenarioId===scenario.id),packet=blindedFinalPacket(scenario,attempts);
 packet.postRunPersistenceAudit={provenance:persistence.provenance,rows:persistence.rows.filter(r=>r.goalId===attempts[0]?.originalInput.goal.id)};
 packet.executionConstraints={maxOutputTokens:4800,timeoutMs:80000,maximumAttemptedCalls:16};
 for(const [i,a] of attempts.entries())packet.turns[i].providerCompletionEvidence={incompleteDetails:a.rawResponse?.incomplete_details??null,refusalContentVerbatim:a.rawResponse?.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='refusal')??[]};
 writeFileSync(`${folder}/${scenario.id}.json`,JSON.stringify(packet,null,2)+'\n');
 for(const a of attempts)if(a.originalResponseText!==undefined&&a.originalResponseText!==null)writeFileSync(`${folder}/${scenario.id}-turn-${a.turn}-response.txt`,a.originalResponseText);
 const final=attempts.at(-1)?.after,rows=final?.assignments||[];
 cases.push({scenarioId:scenario.id,attemptedCalls:attempts.length,plannedCalls:scenario.turns,runtimeValidResponses:attempts.filter(a=>a.state==='completed_with_usage').length,failures:attempts.filter(a=>a.failure).map(a=>({turn:a.turn,failure:a.failure})),finalVisibleCheckpoints:rows.map(t=>({id:t.id,capability:t.capability,status:t.status,attempts:t.attempts,dependencies:t.dependencies,resultCurrentlyExposed:Boolean(t.result)})),goalStatus:final?.goalStatus??null,elapsedMs:attempts.length?Date.parse(attempts.at(-1).finishedAt)-Date.parse(attempts[0].startedAt):null,independentSemanticGrade:null,objectiveSuccess:null,criticalFailureCount:null});
}
const counts={input:0,output:0,cachedInput:0,cacheWrite:0,reasoning:0};let estimated=0,unknownCharges=0;const times=[];
const attempts=ledger.attempts.map(a=>{
 const r=a.receipt;
 if(r?.inputTokens!==null&&r?.inputTokens!==undefined)counts.input+=r.inputTokens;
 if(r?.outputTokens!==null&&r?.outputTokens!==undefined)counts.output+=r.outputTokens;
 counts.cachedInput+=r?.cachedInputTokens||0;counts.cacheWrite+=r?.cacheWriteTokens||0;counts.reasoning+=r?.reasoningTokens||0;
 if(r?.estimatedUsd!==null&&r?.estimatedUsd!==undefined)estimated+=r.estimatedUsd;else unknownCharges++;
 if(r?.latencyMs!==undefined)times.push(r.latencyMs);
 return{scenarioId:a.scenarioId,turn:a.turn,state:a.state,responseStatus:a.rawResponse?.status??null,failure:a.failure??null,receipt:r??null,returnedReasoning:a.rawResponse?.reasoning??null,requestSha256:a.requestSha256,responseTextSha256:a.originalResponseText?sha(a.originalResponseText):null,rawResponseSha256:a.rawResponse?sha(a.rawResponse):null,originalInputSha256:sha(a.originalInput),executionSha256:sha({before:a.before,execution:a.execution,after:a.after}),networkAttemptedAt:a.networkAttemptedAt??null};
});
const results={status:ledger.finished?'EXECUTION COMPLETE; INDEPENDENT GRADING PENDING':'HALTED; INDEPENDENT REVIEW REQUIRED',authorization:ledger.authorization,sourceCommit:ledger.preflight?.sourceCommit,manifestSha256:ledger.manifestSha256,maximumCalls:16,maximumUsd:5.50,attemptedCalls:ledger.attempts.length,dispatchedCalls:ledger.attempts.filter(a=>a.networkAttemptedAt).length,conservativeReservedUsd:ledger.reservedUsd,usageDerivedEstimatedUsd:Number(estimated.toFixed(9)),unknownChargeCalls:unknownCharges,invoiceReconciled:false,credentialPreserved:ledger.credentialPreserved,automaticRetries:0,actualModelIds:[...new Set(attempts.map(a=>a.receipt?.actualModel).filter(Boolean))],actualReasoningEfforts:[...new Set(attempts.map(a=>a.returnedReasoning?.effort).filter(Boolean))],actualReasoningModes:[...new Set(attempts.map(a=>a.returnedReasoning?.mode).filter(Boolean))],actualServiceTiers:[...new Set(attempts.map(a=>a.receipt?.serviceTier).filter(Boolean))],tokens:counts,latencyMs:{mean:times.length?times.reduce((n,t)=>n+t,0)/times.length:null,worst:times.length?Math.max(...times):null,measuredCalls:times.length,provisionalMeanTarget:45000,provisionalWorstTarget:80000},costPerSuccessfulObjective:null,successDenominatorPendingIndependentReview:true,criticalFailureRate:null,independentSemanticGrades:null,engineeringSemanticGradesNotIncluded:true,halted:ledger.halted??null,cases,attempts,limitations:['Six known regression scenarios, not held-out generalization proof.','Single-candidate model identity is inferable from the approved public plan; packets exclude operational identities/grades but blinding is limited.','Original response text is preserved verbatim; any self-identification is disclosed without rewriting.','Current public task visibility can omit revoked modules; absence does not prove those assignments completed or did not exist.','Local synthetic auth/API/database execution does not prove hosted production identity or release readiness.']};
results.postRunPersistenceAuditPath='avery-director-final-persistence.json';
results.objectiveLatencyMs={mean:cases.reduce((n,c)=>n+(c.elapsedMs||0),0)/cases.length,worst:Math.max(...cases.map(c=>c.elapsedMs||0)),scope:'Model plus foreground tools/control and prescribed owner fixture events, excluding initial per-case account setup; no engineering pauses or extra inference.'};
writeFileSync('docs/avery-director-final-persistence.json',JSON.stringify(persistence,null,2)+'\n');
writeFileSync('docs/avery-director-final-results.json',JSON.stringify(results,null,2)+'\n');
const reviewer={status:results.status,candidate:'Candidate A',independentReviewer:'ChatGPT',semanticGrades:null,engineeringGradesOmitted:true,packets:finalCases.map(s=>({scenarioId:s.id,path:`avery-final-completed/${s.id}.json`,responseFiles:ledger.attempts.filter(a=>a.scenarioId===s.id&&a.originalResponseText).map(a=>`avery-final-completed/${s.id}-turn-${a.turn}-response.txt`)})),instructions:'Grade each case against its original rubric using complete actual inputs, verbatim responses and execution evidence. Distinguish independently correct reasoning from unsafe attempts rejected by safeguards, actual execution from plans, and saved-record verification from completion of underlying objectives. Record critical failures, false completion claims, interventions and untested requirements. Do not assume omission means success. Lock grades before consulting operational model/cost metadata.',blindingLimitations:results.limitations.slice(0,3)};
writeFileSync('docs/avery-director-final-grading-index.json',JSON.stringify(reviewer,null,2)+'\n');
console.log(JSON.stringify({calls:results.attemptedCalls,reservedUsd:results.conservativeReservedUsd,estimatedUsd:results.usageDerivedEstimatedUsd,unknownCharges,latencyMs:results.latencyMs,runtimeValid:cases.reduce((n,s)=>n+s.runtimeValidResponses,0),halted:results.halted}));
