// Isolated local evaluation support. Importing this module sends no requests.
import {openSync,closeSync,writeFileSync,fsyncSync,renameSync,lstatSync} from 'node:fs';
import {dirname,isAbsolute} from 'node:path';
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function guidanceCallBound(original,policy,now=Date.now()){
 check(policy.webAccounting===undefined||policy.webAccounting==='processed-actions-conservative-v1','Unknown web accounting policy');
 check(Number.isFinite(Date.parse(policy.expiresAt))&&now<Date.parse(policy.expiresAt),'Pricing expired');
 const body=structuredClone(original),rate=policy.models[body.model];
 check(rate&&[rate.context,rate.inputNano,rate.outputNano].every(x=>integer(x)&&x>0),'Unknown model/pricing');
 check(body.store===false&&!body.background&&!body.previous_response_id&&!body.conversation,'Unbounded stored history');
 check(typeof body.input==='string','Only bounded text input is priced');
 check(body.service_tier===undefined||body.service_tier==='default','Unpriced service tier');
 const allowed=['model','store','instructions','input','text','reasoning','max_output_tokens','max_tool_calls','tools','tool_choice','include','service_tier','stream'];
 check(Object.keys(body).every(k=>allowed.includes(k)),'Unknown request parameter');
 // Evaluation-only ceiling is disclosed in the manifest; smaller runtime caps survive.
 body.max_output_tokens=body.max_output_tokens??4800;
 check(integer(body.max_output_tokens)&&body.max_output_tokens>0&&body.max_output_tokens<=4800,'Output ceiling exceeded');
 body.service_tier='default';
 body.reasoning=body.reasoning??{effort:'medium'};
 check(['minimal','low','medium','high'].includes(body.reasoning.effort),'Unreviewed reasoning effort');
 const tools=body.tools??[];
 check(policy.allowWebSearch!==false||tools.length===0,'Public tools forbidden for private probe');
 check(Array.isArray(tools)&&tools.length<=1&&tools.every(t=>t?.type==='web_search'&&Object.keys(t).every(k=>['type','filters','search_context_size'].includes(k))),'Unpriced tool or tool option');
 const calls=tools.length?body.max_tool_calls:0;
 check(integer(calls)&&calls<=4&&(!tools.length||calls>0),'Tool ceiling exceeded');
 check(Buffer.byteLength(JSON.stringify(body))<=100000,'Request byte ceiling exceeded');
 check(integer(policy.searchNano)&&policy.searchNano>0,'Unknown search price');
 // Conservatively reserve a full context for each possible tool step, plus output.
 const maximumNanoUsd=rate.context*(calls+1)*rate.inputNano+body.max_output_tokens*rate.outputNano+calls*policy.searchNano;
 check(integer(maximumNanoUsd),'Unsafe cost arithmetic');
 return {body,rate,calls,maximumNanoUsd};
}
// Diagnostic observations are deliberately NOT billing units or settlement rules.
// A completed response may include an unfinished tool item (captured in 52b9bbd3).
export function guidanceWebObservations(payload) {
 const items=Array.isArray(payload?.output)?payload.output.filter(x=>x?.type==='web_search_call'):[];
 return {
  emittedItems:items.length,
  completedActions:items.filter(x=>x.status==='completed').length,
  completedSearchActions:items.filter(x=>x.status==='completed'&&x.action?.type==='search').length,
  completedPageOpens:items.filter(x=>x.status==='completed'&&x.action?.type==='open_page').length,
  completedInPageFinds:items.filter(x=>x.status==='completed'&&x.action?.type==='find_in_page').length,
  unfinishedItems:items.filter(x=>x.status!=='completed').length,
  unsupportedActions:items.filter(x=>!['search','open_page','find_in_page'].includes(x.action?.type)).length,
  reportedBillableSearches:payload?.tool_usage?.web_search?.num_requests??null,
  billableCountVerified:false,
 };
}
// Opt-in contract revision for NEW manifests only. Historical ledgers/policies
// remain immutable. max_tool_calls limits processed actions, not emitted attempts.
export function guidanceProcessedWebContract(payload, ceiling) {
 const items=payload.output.filter(x=>x?.type==='web_search_call');
 const completed=items.filter(x=>x.status==='completed');
 const ids=items.map(x=>x.id).filter(x=>x!==undefined);
 const firstUnfinished=items.findIndex(x=>x.status!=='completed');
 const trailing=firstUnfinished<0?[]:items.slice(firstUnfinished);
 const valid=completed.length<=ceiling
  &&ids.every(id=>typeof id==='string'&&id.length>0)&&new Set(ids).size===ids.length
  &&items.every(x=>['search','open_page','find_in_page'].includes(x.action?.type))
  &&(trailing.length===0||(completed.length===ceiling
   &&trailing.every(x=>['in_progress','searching'].includes(x.status))))
  &&(payload.max_tool_calls===undefined||payload.max_tool_calls===ceiling||(ceiling===0&&payload.max_tool_calls===null))
  &&payload.error==null&&payload.incomplete_details==null;
 return {valid,processedCeiling:ceiling,completedActions:completed.length,
  trailingNonterminalAttempts:trailing.length,
  unfinishedItemsUsedAsEvidence:false,
  billingCertainty:'Not invoice-reconciled; charge all configured search fees',
  basis:'Responses max_tool_calls bounds total processed built-in calls; excess attempts are ignored by contract. Emitted length is not the processed count.'};
}
function unpricedProviderOutput(payload) {
 if(!Array.isArray(payload?.output)||payload.output.some(x=>!['message','reasoning','web_search_call'].includes(x?.type)))return true;
 if(payload.output.some(x=>x.type==='message'&&(x.content??[]).some(c=>!['output_text','refusal'].includes(c?.type))))return true;
 // The captured response includes a zero-valued image meter even without that tool.
 // Only that exact kind of zero counter is harmless; never ignore a nonzero/unrecognized meter.
 const zero=v=>typeof v==='number'?v===0:!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(zero);
 return Object.entries(payload.tool_usage??{}).some(([k,v])=>k!=='web_search'&&(k!=='image_gen'||!zero(v)));
}
export class GuidanceEvaluationBudget {
 constructor({file,policy,runId,capNanoUsd,maximumAttempts=88,metadataReceipt=null,priorAccountedNanoUsd=0,priorLedgerSha256=null,turnIds,now=Date.now}){
  check(isAbsolute(file)&&/^gc-[a-z0-9-]+$/.test(runId),'GC ledger identity required');
  check(integer(capNanoUsd)&&capNanoUsd>0&&capNanoUsd<=10_000_000_000,'GC cap must be within $10 proposal');
  check(integer(priorAccountedNanoUsd)&&priorAccountedNanoUsd+capNanoUsd<=10_000_000_000,'Cumulative GC cap exceeds $10');
  check(!priorAccountedNanoUsd||/^[a-f0-9]{64}$/.test(priorLedgerSha256),'Prior receipt hash required');
  check(integer(maximumAttempts)&&maximumAttempts>0&&maximumAttempts<=88,'Invalid attempt ceiling');
  check(Array.isArray(turnIds)&&turnIds.length>0&&new Set(turnIds).size===turnIds.length&&turnIds.every(x=>/^GC-\d\d-T\d+$/.test(x)),'Invalid turn allowlist');
  const dir=lstatSync(dirname(file));check(dir.isDirectory()&&!dir.isSymbolicLink()&&!(dir.mode&0o077),'Private ledger directory required');
  this.file=file;this.now=now;this.policy=structuredClone(policy);this.closed=false;this.activeTurn=null;
  this.state={runId,policy:this.policy,capNanoUsd,maximumAttempts,priorAccountedNanoUsd,priorLedgerSha256,metadataReceipt:structuredClone(metadataReceipt),turnIds:[...turnIds],started:[],entries:[],results:[],halted:null};
  // Exclusive create prohibits overwriting or silently restarting an existing run.
  const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,JSON.stringify(this.state));fsyncSync(fd);}finally{closeSync(fd);}
 }
 save(){
  const tmp=this.file+'.tmp',fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,JSON.stringify(this.state,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,this.file);const dir=openSync(dirname(this.file),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
 }
 summary(){const accountedNanoUsd=this.state.entries.reduce((n,e)=>n+(e.status==='settled'?e.accountedNanoUsd:e.maximumNanoUsd),0);return structuredClone({...this.state,cumulativeAccountedNanoUsd:this.state.priorAccountedNanoUsd+accountedNanoUsd,accountedNanoUsd:this.state.entries.reduce((n,e)=>n+(e.status==='settled'?e.accountedNanoUsd:e.maximumNanoUsd),0)});}
 ready(){check(!this.closed&&!this.state.halted&&!this.state.entries.some(e=>e.status!=='settled'),'Run halted or unresolved');}
 halt(message){this.state.halted=message;this.save();throw Error(message);}
 startTurn(id){this.ready();check(this.activeTurn===null,'Finish preceding turn first');check(this.state.turnIds.includes(id)&&!this.state.started.includes(id),'Unapproved or duplicate turn');this.state.started.push(id);this.activeTurn=id;this.save();}
 retainUndeliveredResult(result){
  // Evidence only: never a completed turn or a settled provider charge.
  this.state.undeliveredResults??=[];this.state.undeliveredResults.push({turnId:this.activeTurn,result:structuredClone(result)});this.save();
 }
 finishTurn(result){this.ready();check(this.activeTurn!==null,'No active turn');if(result!==undefined)this.state.results.push({turnId:this.activeTurn,result:structuredClone(result)});this.save();this.activeTurn=null;}
 reserve(original,requestId){
  this.ready();check(this.activeTurn!==null,'No active turn');
  if(typeof requestId!=='string'||!requestId||this.state.entries.some(e=>e.requestId===requestId))return this.halt('Duplicate or invalid request ID; retries prohibited');
  if(this.policy.allowedRequestSuffixes&&!this.policy.allowedRequestSuffixes.some(s=>requestId.endsWith(s)))return this.halt('Stage forbidden for private probe');
  const turnLimit=this.policy.turnAttemptLimits?.[this.activeTurn]??8;
  if(!integer(turnLimit)||turnLimit<1||turnLimit>8)return this.halt('Invalid per-turn attempt ceiling');
  if(this.state.entries.length>=this.state.maximumAttempts||this.state.entries.filter(e=>e.turnId===this.activeTurn).length>=turnLimit)return this.halt('Attempt ceiling reached');
  let bound;try{bound=guidanceCallBound(original,this.policy,this.now());}catch(error){return this.halt(error.message);}
  if(this.summary().accountedNanoUsd+bound.maximumNanoUsd>this.state.capNanoUsd)return this.halt('Next reservation exceeds cap');
  const entry={requestId,turnId:this.activeTurn,status:'reserved',startedAt:new Date(this.now()).toISOString(),maximumNanoUsd:bound.maximumNanoUsd,request:bound.body};
  this.state.entries.push(entry);this.save();
  return {body:bound.body,settle:payload=>this.settle(entry,bound,payload),unknown:diagnostic=>this.unknown(entry,diagnostic),diagnostic:payload=>{entry.streamDiagnostic=structuredClone(payload);this.save();}};
 }
 unknown(entry,diagnostic){if(diagnostic!==undefined)entry.streamDiagnostic=structuredClone(diagnostic);if(!this.state.entries.includes(entry))throw Error('Foreign reservation');entry.status='unknown';entry.latencyMs=this.now()-Date.parse(entry.startedAt);delete entry.accountedNanoUsd;this.state.halted='Unknown outcome; full reservation retained';this.save();}
 settle(entry,bound,p){
  check(entry.status==='reserved'&&this.state.entries.includes(entry),'Invalid settlement');
  entry.response=structuredClone(p);
  entry.latencyMs=this.now()-Date.parse(entry.startedAt);
  const input=p?.usage?.input_tokens,output=p?.usage?.output_tokens;
  entry.contractDiagnostic=guidanceWebObservations(p);
  const calls=Array.isArray(p?.output)?entry.contractDiagnostic.emittedItems:Infinity;
  const native=this.policy.webAccounting==='processed-actions-conservative-v1';
  if(native&&Array.isArray(p?.output))entry.processedWebContract=guidanceProcessedWebContract(p,bound.calls);
  const toolContractInvalid=native?!entry.processedWebContract?.valid:(calls>bound.calls||entry.contractDiagnostic.unfinishedItems>0);
  const reportedSearches=p?.tool_usage?.web_search?.num_requests;
  if(reportedSearches!==undefined&&(!integer(reportedSearches)||reportedSearches>bound.calls)){this.unknown(entry);throw Error('Reported tool usage exceeds reservation');}
  if(p?.status!=='completed'||unpricedProviderOutput(p)||!integer(input)||!integer(output)||input>bound.rate.context*(bound.calls+1)||output>bound.body.max_output_tokens||toolContractInvalid||entry.contractDiagnostic.unsupportedActions>0||!bound.rate.returned.includes(p.model)||(p.service_tier!==undefined&&p.service_tier!=='default')||p.output.some(x=>x.type?.endsWith('_call')&&x.type!=='web_search_call')){
   this.unknown(entry);throw Error('Unverified usage/model/tools');
  }
  // No cache discounts; retain all reserved search charges.
  const accounted=input*bound.rate.inputNano+output*bound.rate.outputNano+bound.calls*this.policy.searchNano;
  if(!integer(accounted)||accounted>entry.maximumNanoUsd){this.unknown(entry);throw Error('Usage exceeds reservation');}
  if(native)entry.accountingBasis='Validated complete token usage plus ALL configured search fees, not reported search count; conservative estimate, not invoice';
  entry.response=structuredClone(p);entry.accountedNanoUsd=accounted;entry.status='settled';this.save();
 }
 async dispatch(body,id,transport){const ticket=this.reserve(body,id);try{const result=await transport(ticket.body);ticket.settle(result);return result;}catch(error){ticket.unknown();throw error;}}
 close(){this.closed=true;}
}
