// Proposed assessment guard only. This module has no transport or credential access.
// Pattern follows existing Director reservations; no consumed Avery authorization is reused.
export const moneyEvaluationLimits=Object.freeze({calls:36,usd:1.50,inputTokens:65536,bodyBytes:32768,planOutput:4800,verifierOutput:1200});
export const moneyEvaluationV2Limits=Object.freeze({calls:36,usd:1.60,inputTokens:80000,bodyBytes:40000,planOutput:4800,verifierOutput:1200});
const limitsFor=authorization=>authorization?.assessmentVersion==="money-coach-competency-v2"?moneyEvaluationV2Limits:moneyEvaluationLimits;
export function moneyAttemptReservation(outputTokens,authorization){return (limitsFor(authorization).inputTokens*(0.20+0.25)+outputTokens*1.20)/1e6;}
export function reserveMoneyAttempt(ledger,body,authorization){
 if(!authorization?.ownerApproved||authorization.issue!==268||!/^https:\/\/github\.com\/seangworld\/thebeast\/issues\/268#issuecomment-\d+$/.test(authorization.commentUrl||''))throw Error('Separate owner spending approval is required');
 const limits=limitsFor(authorization);
 if(authorization.assessmentVersion && authorization.assessmentVersion!=="money-coach-competency-v2")throw Error("Unknown assessment version");
 if(authorization.maxCalls!==limits.calls||authorization.maxUsd!==limits.usd||authorization.model!=='gpt-5.6-luna')throw Error('Approval does not match frozen assessment scope');
 const name=body.text?.format?.name,verifier=name==='member_agent_semantic_verification';
 if(!verifier&&name!=='digital_staff_runtime_plan')throw Error('Unapproved provider phase');
 const keys=['model','store','reasoning','max_output_tokens','service_tier','instructions','input','text','stream'];
 if(Object.keys(body).some(k=>!keys.includes(k))||body.model!=='gpt-5.6-luna'||body.store!==false||body.service_tier!=='default'||body.max_output_tokens!==(verifier?1200:4800)||body.reasoning?.effort!==(verifier?'low':'medium')||Object.keys(body.reasoning).length!==1||body.text?.format?.type!=='json_schema'||body.text.format.strict!==true)throw Error('Unbudgeted provider request');
 if(Buffer.byteLength(JSON.stringify(body))>limits.bodyBytes)throw Error('Input exceeds conservative reservation');
 if(!Array.isArray(ledger.attempts)||!Number.isFinite(ledger.reservedUsd)||ledger.reservedUsd<0||ledger.attempts.some(a=>a.reservedUsd!==moneyAttemptReservation(a.outputTokens,authorization)))throw Error('Invalid ledger');
 const total=ledger.attempts.reduce((n,a)=>n+a.reservedUsd,0);
 if(Math.abs(total-ledger.reservedUsd)>1e-8)throw Error('Ledger integrity failure');
 const cost=moneyAttemptReservation(body.max_output_tokens,authorization);
 if(ledger.attempts.length>=limits.calls||ledger.reservedUsd+cost>limits.usd)throw Error('Call or spending cap reached');
 const attempt={number:ledger.attempts.length+1,state:'reserved_before_dispatch',outputTokens:body.max_output_tokens,reservedUsd:cost};ledger.attempts.push(attempt);ledger.reservedUsd+=cost;return attempt;
}
export function moneyUsageCost(usage,authorization){
 const input=usage?.input_tokens,output=usage?.output_tokens,cached=usage?.input_tokens_details?.cached_tokens??0,writes=usage?.input_tokens_details?.cache_write_tokens??0;
 if(![input,output,cached,writes].every(n=>Number.isSafeInteger(n)&&n>=0)||input>limitsFor(authorization).inputTokens||output>4800||cached+writes>input)throw Error('Unknown/out-of-budget usage; retain reservation and halt');
 return ((input-cached-writes)*.20+cached*.02+writes*.25+output*1.20)/1e6;
}
