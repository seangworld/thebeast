import { openSync, closeSync, readFileSync, writeFileSync, fsyncSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
// Conservative fixed reservation: <=20KB JSON text plus framing fits well below
// 65,536 byte-BPE input tokens; output cap includes reasoning tokens.
export const limits = Object.freeze({ calls: 8, usd: 3, inputTokens: 65536, outputTokens: 2400, bodyBytes: 20000, reservationUsd: 0.10592 });
export const secondEvaluationLimits = Object.freeze({ ...limits, calls: 16, usd: 2 });
export function reserveAttempt(ledger, body, budget = limits) {
  if (budget !== limits && budget !== secondEvaluationLimits) throw new Error('Unknown authorized budget profile');
  if (!Number.isFinite(ledger.reservedUsd) || ledger.reservedUsd < 0) throw new Error('Invalid spending ledger');
  if (body.model !== 'gpt-5' || body.max_output_tokens !== limits.outputTokens || body.store !== false || body.tools || body.previous_response_id || body.service_tier !== 'default') throw new Error('Unbudgeted request configuration');
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > limits.bodyBytes) throw new Error('Input exceeds conservative reservation');
  if (ledger.attempts.length >= budget.calls || ledger.reservedUsd + limits.reservationUsd > budget.usd) throw new Error('Evaluation call or dollar cap reached');
  ledger.reservedUsd = Number((ledger.reservedUsd + limits.reservationUsd).toFixed(8));
  const attempt = { number: ledger.attempts.length + 1, state: 'reserved_before_request', reservedUsd: limits.reservationUsd };
  ledger.attempts.push(attempt);
  return attempt;
}
export function usageCost(usage) {
  const input = usage?.input_tokens, output = usage?.output_tokens, cached = usage?.input_tokens_details?.cached_tokens || 0;
  if (![input, output, cached].every(Number.isSafeInteger) || input < 0 || output < 0 || cached < 0 || cached > input || input > limits.inputTokens || output > limits.outputTokens) throw new Error('Missing or out-of-budget usage; stop evaluation');
  return ((input - cached) * 1.25 + cached * 0.125 + output * 10) / 1_000_000;
}

// Stage 1 authorization 6236922578 is independent of both consumed GPT-5 batches.
// This pure reservation/usage layer performs no network calls or credential access.
export const stageOneEvaluationLimits = Object.freeze({calls:24,usd:3,inputTokens:65536,outputTokens:2400,bodyBytes:20000,callsPerConfig:8});
export const stageOneRates = Object.freeze({
 'gpt-6-luna:low':Object.freeze({model:'gpt-6-luna',effort:'low',input:.10,cached:.01,cacheWrite:.125,output:.50}),
 'gpt-6-luna:medium':Object.freeze({model:'gpt-6-luna',effort:'medium',input:.10,cached:.01,cacheWrite:.125,output:.50}),
 'gpt-6.1-sol:high':Object.freeze({model:'gpt-6.1-sol',effort:'high',input:2,cached:.10,cacheWrite:2.50,output:10}),
});
const stageOneCases=Object.freeze(['routine-a','multi-specialist-a','conflicting-evidence-a','incorrect-result-a','interrupted-recovery-a','approval-boundary-a','unsupported-tools-a','tenant-and-verification-a']);
export function stageOneReservation(configId){
 const r=Object.hasOwn(stageOneRates,configId)?stageOneRates[configId]:null;if(!r)throw Error('Unknown Stage 1 configuration');
 return Number(((stageOneEvaluationLimits.inputTokens*(r.input+r.cacheWrite)+stageOneEvaluationLimits.outputTokens*r.output)/1e6).toFixed(8));
}
export function reserveStageOneAttempt(ledger,body,configId,scenario){
 const r=Object.hasOwn(stageOneRates,configId)?stageOneRates[configId]:null;
 if(!r || !stageOneCases.includes(scenario))throw Error('Outside Stage 1 scope');
 const keys=['model','store','max_output_tokens','reasoning','service_tier','instructions','input','text'];
 if(Object.keys(body).some(k=>!keys.includes(k)) || body.model!==r.model || body.reasoning?.effort!==r.effort || Object.keys(body.reasoning).length!==1 || body.store!==false || body.max_output_tokens!==2400 || body.service_tier!=='default' || typeof body.instructions!=='string' || typeof body.input!=='string' || body.text?.format?.type!=='json_schema' || body.text.format.strict!==true)throw Error('Unbudgeted Stage 1 request');
 if(Buffer.byteLength(JSON.stringify(body))>20000)throw Error('Input exceeds Stage 1 reservation');
 if(!Array.isArray(ledger.attempts) || !Number.isFinite(ledger.reservedUsd))throw Error('Invalid Stage 1 ledger');
 const recorded=Number(ledger.attempts.reduce((sum,a)=>sum+stageOneReservation(a.configId),0).toFixed(8));
 if(recorded!==ledger.reservedUsd || ledger.attempts.some(a=>!stageOneCases.includes(a.scenario)) || new Set(ledger.attempts.map(a=>a.configId+'|'+a.scenario)).size!==ledger.attempts.length)throw Error('Stage 1 ledger integrity failure');
 if(ledger.attempts.length>=24 || ledger.attempts.filter(a=>a.configId===configId).length>=8 || ledger.attempts.some(a=>a.configId===configId&&a.scenario===scenario))throw Error('Stage 1 call or case cap reached');
 const reservedUsd=stageOneReservation(configId);
 if(Number((ledger.reservedUsd+reservedUsd).toFixed(8))>3)throw Error('Stage 1 dollar cap reached');
 ledger.reservedUsd=Number((ledger.reservedUsd+reservedUsd).toFixed(8));
 const attempt={number:ledger.attempts.length+1,configId,scenario,state:'reserved_before_request',reservedUsd};
 ledger.attempts.push(attempt);return attempt;
}
export function stageOneUsageCost(configId,usage){
 const r=Object.hasOwn(stageOneRates,configId)?stageOneRates[configId]:null;if(!r)throw Error('Unknown Stage 1 configuration');
 const input=usage?.input_tokens,output=usage?.output_tokens,cached=usage?.input_tokens_details?.cached_tokens??0,writes=usage?.input_tokens_details?.cache_write_tokens??0,reasoning=usage?.output_tokens_details?.reasoning_tokens??0;
 if(![input,output,cached,writes,reasoning].every(n=>Number.isSafeInteger(n)&&n>=0) || input>65536 || output>2400 || cached+writes>input || reasoning>output)throw Error('Unknown or out-of-budget Stage 1 usage; retain reservation and halt');
 // Conservative usage estimate includes input plus separately reported cache writes.
 return ((input-cached)*r.input+cached*r.cached+writes*r.cacheWrite+output*r.output)/1e6;
}

// Same exclusive-lock/atomic-fsync pattern as the prior evaluated batch runner.
// A crashed process leaves its lock; an ambiguous reserved attempt blocks restart.
export async function withStageOneLedger(destination, action) {
 const lock=destination+'.lock';
 const lockFd=openSync(lock,'wx',0o600);
 let ledger;
 const save=()=>{
  const temporary=destination+'.'+randomUUID()+'.tmp';
  const fd=openSync(temporary,'wx',0o600);
  try{writeFileSync(fd,JSON.stringify(ledger,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(temporary,destination);
  const dir=openSync(dirname(destination),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
 };
 try {
  ledger=existsSync(destination)?JSON.parse(readFileSync(destination,'utf8')):{authorizationId:6236922578,stage:1,maxCalls:24,maxUsd:3,attempts:[],reservedUsd:0};
  if(ledger.authorizationId!==6236922578 || ledger.stage!==1 || ledger.maxCalls!==24 || ledger.maxUsd!==3 || !Array.isArray(ledger.attempts))throw Error('Unrecognized Stage 1 authorization ledger');
  if(ledger.attempts.some(a=>!['completed_with_usage','failed_with_usage'].includes(a.state) || !Number.isFinite(a.usageDerivedEstimatedUsd) || a.usageDerivedEstimatedUsd<0 || a.usageDerivedEstimatedUsd>stageOneReservation(a.configId)))throw Error('Ambiguous prior charge; retain reservation and reconcile before restart');
  const total=Number(ledger.attempts.reduce((n,a)=>n+stageOneReservation(a.configId),0).toFixed(8));
  if(total!==ledger.reservedUsd || ledger.attempts.length>24 || total>3)throw Error('Stage 1 persisted ledger integrity failure');
  if(!existsSync(destination))save();
  return await action(ledger,save);
 } finally {closeSync(lockFd);unlinkSync(lock);}
}
