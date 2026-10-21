// Isolated local evaluation support. Importing this module sends no requests.
import {openSync,closeSync,writeFileSync,fsyncSync,renameSync,lstatSync} from 'node:fs';
import {dirname,isAbsolute} from 'node:path';
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function guidanceCallBound(original,policy,now=Date.now()){
 check(Number.isFinite(Date.parse(policy.expiresAt))&&now<Date.parse(policy.expiresAt),'Pricing expired');
 const body=structuredClone(original),rate=policy.models[body.model];
 check(rate&&[rate.context,rate.inputNano,rate.outputNano].every(x=>integer(x)&&x>0),'Unknown model/pricing');
 check(body.store===false&&!body.background&&!body.previous_response_id&&!body.conversation,'Unbounded stored history');
 check(body.service_tier===undefined||body.service_tier==='default','Unpriced service tier');
 const allowed=['model','store','instructions','input','text','reasoning','max_output_tokens','max_tool_calls','tools','tool_choice','include','service_tier','stream'];
 check(Object.keys(body).every(k=>allowed.includes(k)),'Unknown request parameter');
 // Evaluation-only ceiling is disclosed in the manifest; smaller runtime caps survive.
 body.max_output_tokens=body.max_output_tokens??4800;
 check(integer(body.max_output_tokens)&&body.max_output_tokens>0&&body.max_output_tokens<=4800,'Output ceiling exceeded');
 body.service_tier='default';
 const tools=body.tools??[];
 check(Array.isArray(tools)&&tools.length<=1&&tools.every(t=>t?.type==='web_search'),'Unpriced tool');
 const calls=tools.length?body.max_tool_calls:0;
 check(integer(calls)&&calls<=4&&(!tools.length||calls>0),'Tool ceiling exceeded');
 check(Buffer.byteLength(JSON.stringify(body))<=100000,'Request byte ceiling exceeded');
 check(integer(policy.searchNano)&&policy.searchNano>0,'Unknown search price');
 // Conservatively reserve a full context for each possible tool step, plus output.
 const maximumNanoUsd=rate.context*(calls+1)*rate.inputNano+body.max_output_tokens*rate.outputNano+calls*policy.searchNano;
 check(integer(maximumNanoUsd),'Unsafe cost arithmetic');
 return {body,rate,calls,maximumNanoUsd};
}
export class GuidanceEvaluationBudget {
 constructor({file,policy,runId,capNanoUsd,maximumAttempts=88,turnIds,now=Date.now}){
  check(isAbsolute(file)&&/^gc-[a-z0-9-]+$/.test(runId),'GC ledger identity required');
  check(integer(capNanoUsd)&&capNanoUsd>0&&capNanoUsd<=10_000_000_000,'GC cap must be within $10 proposal');
  check(integer(maximumAttempts)&&maximumAttempts>0&&maximumAttempts<=88,'Invalid attempt ceiling');
  check(Array.isArray(turnIds)&&turnIds.length>0&&new Set(turnIds).size===turnIds.length&&turnIds.every(x=>/^GC-\d\d-T\d+$/.test(x)),'Invalid turn allowlist');
  const dir=lstatSync(dirname(file));check(dir.isDirectory()&&!dir.isSymbolicLink()&&!(dir.mode&0o077),'Private ledger directory required');
  this.file=file;this.now=now;this.policy=structuredClone(policy);this.closed=false;this.activeTurn=null;
  this.state={runId,policy:this.policy,capNanoUsd,maximumAttempts,turnIds:[...turnIds],started:[],entries:[],halted:null};
  // Exclusive create prohibits overwriting or silently restarting an existing run.
  const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,JSON.stringify(this.state));fsyncSync(fd);}finally{closeSync(fd);}
 }
 save(){
  const tmp=this.file+'.tmp',fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,JSON.stringify(this.state,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,this.file);const dir=openSync(dirname(this.file),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
 }
 summary(){return structuredClone({...this.state,accountedNanoUsd:this.state.entries.reduce((n,e)=>n+(e.status==='settled'?e.accountedNanoUsd:e.maximumNanoUsd),0)});}
 ready(){check(!this.closed&&!this.state.halted&&!this.state.entries.some(e=>e.status!=='settled'),'Run halted or unresolved');}
 halt(message){this.state.halted=message;this.save();throw Error(message);}
 startTurn(id){this.ready();check(this.activeTurn===null,'Finish preceding turn first');check(this.state.turnIds.includes(id)&&!this.state.started.includes(id),'Unapproved or duplicate turn');this.state.started.push(id);this.activeTurn=id;this.save();}
 finishTurn(){this.ready();check(this.activeTurn!==null,'No active turn');this.activeTurn=null;}
 reserve(original,requestId){
  this.ready();check(this.activeTurn!==null,'No active turn');
  if(typeof requestId!=='string'||!requestId||this.state.entries.some(e=>e.requestId===requestId))return this.halt('Duplicate or invalid request ID; retries prohibited');
  if(this.state.entries.length>=this.state.maximumAttempts||this.state.entries.filter(e=>e.turnId===this.activeTurn).length>=8)return this.halt('Attempt ceiling reached');
  let bound;try{bound=guidanceCallBound(original,this.policy,this.now());}catch(error){return this.halt(error.message);}
  if(this.summary().accountedNanoUsd+bound.maximumNanoUsd>this.state.capNanoUsd)return this.halt('Next reservation exceeds cap');
  const entry={requestId,turnId:this.activeTurn,status:'reserved',maximumNanoUsd:bound.maximumNanoUsd,request:bound.body};
  this.state.entries.push(entry);this.save();
  return {body:bound.body,settle:payload=>this.settle(entry,bound,payload),unknown:()=>this.unknown(entry)};
 }
 unknown(entry){if(!this.state.entries.includes(entry))throw Error('Foreign reservation');entry.status='unknown';delete entry.accountedNanoUsd;this.state.halted='Unknown outcome; full reservation retained';this.save();}
 settle(entry,bound,p){
  check(entry.status==='reserved'&&this.state.entries.includes(entry),'Invalid settlement');
  const input=p?.usage?.input_tokens,output=p?.usage?.output_tokens;
  const calls=Array.isArray(p?.output)?p.output.filter(x=>x.type==='web_search_call').length:Infinity;
  if(!integer(input)||!integer(output)||input>bound.rate.context*(bound.calls+1)||output>bound.body.max_output_tokens||calls>bound.calls||!bound.rate.returned.includes(p.model)||(p.service_tier!==undefined&&p.service_tier!=='default')||p.output.some(x=>x.type?.endsWith('_call')&&x.type!=='web_search_call')){
   this.unknown(entry);throw Error('Unverified usage/model/tools');
  }
  // No cache discounts; retain all reserved search charges.
  const accounted=input*bound.rate.inputNano+output*bound.rate.outputNano+bound.calls*this.policy.searchNano;
  if(!integer(accounted)||accounted>entry.maximumNanoUsd){this.unknown(entry);throw Error('Usage exceeds reservation');}
  entry.response=structuredClone(p);entry.accountedNanoUsd=accounted;entry.status='settled';this.save();
 }
 async dispatch(body,id,transport){const ticket=this.reserve(body,id);try{const result=await transport(ticket.body);ticket.settle(result);return result;}catch(error){ticket.unknown();throw error;}}
 close(){this.closed=true;}
}
