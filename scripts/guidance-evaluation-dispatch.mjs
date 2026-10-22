// Offline by default. Paid execution requires a separate private owner-approval receipt.
import {readFileSync,readdirSync,lstatSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {GuidanceEvaluationBudget} from './guidance-evaluation-budget.mjs';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export function fingerprint(path){
 const walk=p=>readdirSync(p).sort().flatMap(n=>{const f=join(p,n),s=lstatSync(f);if(s.isSymbolicLink())throw Error('Symlink inside frozen tree');return s.isDirectory()?walk(f):[[f.slice(path.length+1),sha(readFileSync(f))]];});
 return sha(JSON.stringify(walk(path)));
}
export function contextFor(packet,prior=[]){
 const empty={currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]};
 if(prior.length!==packet.turn-1)throw Error('Missing genuine preceding turn');
 const date='2026-10-21T12:00:00.000Z';
 const seed=(prior[0]?.packet.seedHistory??packet.seedHistory).map((s,i)=>({...s,id:packet.scenarioId+'-adversarial-seed-'+i,createdAt:date}));
 const actual=prior.flatMap(({packet:p,result})=>[{id:p.id+'-user',role:'user',text:p.prompt,createdAt:date},{id:p.id+'-answer',role:'assistant',text:result.response,createdAt:date}]);
 const history=[...seed,...actual];
 return {ownerId:'synthetic-gc-assessment',professionalId:'beasteducation.guidance-counselor',conversationId:'synthetic-gc-'+packet.scenarioId,message:{id:packet.id,role:'user',text:packet.prompt,createdAt:date},recentMessages:history,state:structuredClone(prior.at(-1)?.result.state??empty),memories:[],structuredRecords:[{domain:'education',record:structuredClone(packet.syntheticRecord),updatedAt:date}],workspace:'/dashboard/education/guidance-counselor'};
}
export function verifyPriorAccounting(m,root=resolve(homedir(),'.config/seangworld/evaluations')){
 const receipts=m.priorAccounting.receipts??[{...m.priorAccounting}];
 if(!receipts.length||new Set(receipts.map(r=>r.runId)).size!==receipts.length)throw Error('Distinct prior receipts required');
 let total=0;
 for(const receipt of receipts){
  if(!/^gc-[a-z0-9-]+$/.test(receipt.runId))throw Error('Invalid prior run identity');
  const file=join(root,receipt.runId,'spend.json'),stat=lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.mode&0o077)throw Error('Original private prior ledger required');
  const bytes=readFileSync(file),prior=JSON.parse(bytes);
  const balance=prior.entries.reduce((n,e)=>n+(e.status==='settled'?e.accountedNanoUsd:e.maximumNanoUsd),0);
  let sealed=false;
  if(receipt.completionSha256){
   const completionFile=join(root,receipt.runId,'completion.json'),cs=lstatSync(completionFile);
   if(!cs.isFile()||cs.isSymbolicLink()||cs.mode&0o077)throw Error('Private completion receipt required');
   const cb=readFileSync(completionFile),c=JSON.parse(cb);
   sealed=sha(cb)===receipt.completionSha256&&c.manifestSha256===receipt.manifestSha256&&c.accountedNanoUsd===balance&&c.inferenceAttempts===prior.entries.length;
   if(!sealed)throw Error('Prior completion mismatch');
  }
  if(!Number.isSafeInteger(balance)||balance<0||sha(bytes)!==receipt.ledgerSha256||balance!==receipt.accountedNanoUsd||(!prior.halted&&!sealed))throw Error('Prior cost/receipt mismatch');
  total+=balance;
 }
 if(total!==m.priorAccounting.accountedNanoUsd||total+m.capNanoUsd>10000000000)throw Error('Prior aggregate mismatch');
 if(m.maximumCumulativeAccountedNanoUsd!==undefined&&total+m.capNanoUsd!==m.maximumCumulativeAccountedNanoUsd)throw Error('Cumulative ceiling mismatch');
 if(m.priorAccounting.receipts&&sha(JSON.stringify(receipts))!==m.priorAccounting.ledgerSha256)throw Error('Prior receipt bundle mismatch');
 return total;
}
export async function verifyDispatch(manifestFile){
 const raw=readFileSync(manifestFile),m=JSON.parse(raw);
 if(!Number.isFinite(Date.parse(m.policy.expiresAt))||Date.now()>=Date.parse(m.policy.expiresAt))throw Error('Pricing expired; refreeze before approval/dispatch');
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
 if(git('rev-parse','HEAD:src')!==m.applicationSrcTree||git('diff','--name-only',m.applicationCommit,'--','src'))throw Error('Application candidate changed');
 if(fingerprint('src')!==m.sourceFilesSha256||fingerprint('.test-dist/src')!==m.compiledRuntimeSha256)throw Error('Source or compiled runtime changed; rebuild/refreeze');
 for(const [path,digest] of Object.entries(m.fileHashes))if(sha(readFileSync(path))!==digest)throw Error('Frozen file changed: '+path);
 const fixture=JSON.parse(readFileSync(m.fixturePath));if(!fixture.syntheticOnly||fixture.packets.length!==11)throw Error('Synthetic fixture required');
 if(m.selectedTurnIds){
  if(new Set(m.selectedTurnIds).size!==m.selectedTurnIds.length||!m.selectedTurnIds.every(id=>fixture.packets.some(p=>p.id===id)))throw Error('Invalid selected frozen turns');
  fixture.packets=fixture.packets.filter(p=>m.selectedTurnIds.includes(p.id));
  for(const p of fixture.packets)if(fixture.packets.filter(q=>q.scenarioId===p.scenarioId&&q.turn<p.turn).length!==p.turn-1)throw Error('Missing genuine-history prerequisite');
 }
 if(m.priorAccounting)verifyPriorAccounting(m);
 const {selectDigitalStaffModel}=await import('../.test-dist/src/lib/digitalStaffRuntime/runtime.js');
 for(const p of fixture.packets){
  // Selection uses the frozen member prompt; no fabricated answers enter execution.
  const c=contextFor({...p,turn:1,seedHistory:p.seedHistory},[]);
  if(selectDigitalStaffModel(c)!==m.turnModels[p.id])throw Error('Effective model configuration changed');
 }
 return {manifest:m,manifestSha256:sha(raw),fixture};
}
export async function verifyModelMetadata(guard,m,fetchImpl=fetch){
   guard.state.metadataReceipt={attempts:[]};guard.save();
   for(const model of [...new Set(Object.values(m.turnModels))]){
    if(guard.state.metadataReceipt.attempts.length>=m.metadataAttempts)guard.halt('Metadata attempt ceiling reached');
    const receipt={model,status:'attempted',startedAt:new Date().toISOString()};guard.state.metadataReceipt.attempts.push(receipt);guard.save();
    try{
     const response=await fetchImpl('https://api.openai.com/v1/models/'+encodeURIComponent(model),{headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},signal:AbortSignal.timeout(15000)});
     receipt.httpStatus=response.status;receipt.status=response.ok?'available':'unavailable';guard.save();
     if(!response.ok)guard.halt('Model metadata unavailable; no inference dispatched');
    }catch{receipt.status='unknown-or-unavailable';guard.save();guard.halt('Metadata check failed; no retry or inference');}
   }
}
export function verifyApproval(file,manifestSha256,m){
 const s=lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.mode&0o077)throw Error('Private approval receipt required');
 const a=JSON.parse(readFileSync(file));
 if(a.owner!=='Sean'||a.approved!==true||a.manifestSha256!==manifestSha256||a.capNanoUsd!==m.capNanoUsd||a.maximumInferenceAttempts!==m.maximumInferenceAttempts||a.runId!==m.runId)throw Error('Exact owner approval required');
 return a;
}
export function enforceAssessmentStop(guard,result,manifest){
 if(manifest.stopOnSafetyFailure&&((result.timings?.semanticVerifierFailureCount??0)>0||result.validationFailures?.includes('guidance-citation-unverified')))guard.halt('Assessment safety/citation check rejected a response; result retained, no further calls');
}
export async function dispatchApproved(manifestFile,approvalFile){
 const {manifest:m,manifestSha256,fixture}=await verifyDispatch(manifestFile);verifyApproval(approvalFile,manifestSha256,m);
 if(process.env.NODE_ENV!=='development'||!process.env.OPENAI_API_KEY||process.env.VERCEL||process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Dedicated authorized DEV process required');
 const root=resolve(homedir(),'.config/seangworld/evaluations',m.runId);mkdirSync(root,{mode:0o700,recursive:true});
 const ledger=join(root,'spend.json');if(existsSync(ledger))throw Error('Existing run cannot be restarted');
 const guard=new GuidanceEvaluationBudget({file:ledger,policy:m.policy,runId:m.runId,capNanoUsd:m.capNanoUsd,maximumAttempts:m.maximumInferenceAttempts,metadataReceipt:m.metadataReceipt,priorAccountedNanoUsd:m.priorAccounting?.accountedNanoUsd??0,priorLedgerSha256:m.priorAccounting?.ledgerSha256??null,turnIds:fixture.packets.map(p=>p.id)});
 const {runGuidanceEvaluationTurn}=await import('./guidance-evaluation-session.mjs');
 const history=new Map();let failure=null;
 try{
  if(m.requireFreshMetadata)await verifyModelMetadata(guard,m);
  for(const p of fixture.packets){
   const prior=history.get(p.scenarioId)??[],context=contextFor(p,prior);
   const result=await runGuidanceEvaluationTurn({guard,turnId:p.id,context,model:m.turnModels[p.id],privateProbe:m.mode==='private-stage-probe'});
   enforceAssessmentStop(guard,result,m);
   prior.push({packet:p,result});history.set(p.scenarioId,prior);
   // Only the genuine delivered reply and returned state are reused.
  }
 }catch(e){failure=e instanceof Error?e.message:'Execution failed';}
 finally{
  const summary=guard.summary();writeFileSync(join(root,'completion.json'),JSON.stringify({manifestSha256,inferenceAttempts:summary.entries.length,metadataAttempts:summary.metadataReceipt?.attempts?.length??m.metadataAttempts,totalDirectProviderAttempts:summary.entries.length+(summary.metadataReceipt?.attempts?.length??m.metadataAttempts),accountedNanoUsd:summary.accountedNanoUsd,completedTurns:m.mode==='private-stage-probe'?0:summary.results.length,completedPrivateProbes:m.mode==='private-stage-probe'?summary.results.length:0,failure,halted:summary.halted},null,2)+'\n',{mode:0o600});guard.close();
 }
 if(failure)throw Error('Assessment stopped; inspect private receipts; no retry');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,manifestFile,approvalFile]=process.argv.slice(2);
 if(mode==='--check'){const {manifest:m,manifestSha256}=await verifyDispatch(manifestFile);console.log(JSON.stringify({status:'OFFLINE PREFLIGHT PASSED; owner spending approval required',manifestSha256,runId:m.runId,turnModels:m.turnModels,capNanoUsd:m.capNanoUsd,maximumInferenceAttempts:m.maximumInferenceAttempts,inferenceCalls:0},null,2));}
 else if(mode==='--execute'&&approvalFile)await dispatchApproved(manifestFile,approvalFile);
 else throw Error('Use --check MANIFEST; --execute additionally requires private exact owner approval receipt');
}
