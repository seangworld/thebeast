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
export async function verifyDispatch(manifestFile){
 const raw=readFileSync(manifestFile),m=JSON.parse(raw);
 if(!Number.isFinite(Date.parse(m.policy.expiresAt))||Date.now()>=Date.parse(m.policy.expiresAt))throw Error('Pricing expired; refreeze before approval/dispatch');
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
 if(git('rev-parse','HEAD:src')!==m.applicationSrcTree||git('diff','--name-only',m.applicationCommit,'--','src'))throw Error('Application candidate changed');
 if(fingerprint('src')!==m.sourceFilesSha256||fingerprint('.test-dist/src')!==m.compiledRuntimeSha256)throw Error('Source or compiled runtime changed; rebuild/refreeze');
 for(const [path,digest] of Object.entries(m.fileHashes))if(sha(readFileSync(path))!==digest)throw Error('Frozen file changed: '+path);
 const fixture=JSON.parse(readFileSync(m.fixturePath));if(!fixture.syntheticOnly||fixture.packets.length!==11)throw Error('Synthetic fixture required');
 const {selectDigitalStaffModel}=await import('../.test-dist/src/lib/digitalStaffRuntime/runtime.js');
 for(const p of fixture.packets){
  // Selection uses the frozen member prompt; no fabricated answers enter execution.
  const c=contextFor({...p,turn:1,seedHistory:p.seedHistory},[]);
  if(selectDigitalStaffModel(c)!==m.turnModels[p.id])throw Error('Effective model configuration changed');
 }
 return {manifest:m,manifestSha256:sha(raw),fixture};
}
export function verifyApproval(file,manifestSha256,m){
 const s=lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.mode&0o077)throw Error('Private approval receipt required');
 const a=JSON.parse(readFileSync(file));
 if(a.owner!=='Sean'||a.approved!==true||a.manifestSha256!==manifestSha256||a.capNanoUsd!==m.capNanoUsd||a.maximumInferenceAttempts!==m.maximumInferenceAttempts||a.runId!==m.runId)throw Error('Exact owner approval required');
 return a;
}
export async function dispatchApproved(manifestFile,approvalFile){
 const {manifest:m,manifestSha256,fixture}=await verifyDispatch(manifestFile);verifyApproval(approvalFile,manifestSha256,m);
 if(process.env.NODE_ENV!=='development'||!process.env.OPENAI_API_KEY||process.env.VERCEL||process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Dedicated authorized DEV process required');
 const root=resolve(homedir(),'.config/seangworld/evaluations',m.runId);mkdirSync(root,{mode:0o700,recursive:true});
 const ledger=join(root,'spend.json');if(existsSync(ledger))throw Error('Existing run cannot be restarted');
 const guard=new GuidanceEvaluationBudget({file:ledger,policy:m.policy,runId:m.runId,capNanoUsd:m.capNanoUsd,maximumAttempts:m.maximumInferenceAttempts,metadataReceipt:m.metadataReceipt,turnIds:fixture.packets.map(p=>p.id)});
 const {runGuidanceEvaluationTurn}=await import('./guidance-evaluation-session.mjs');
 const history=new Map();let failure=null;
 try{
  for(const p of fixture.packets){
   const prior=history.get(p.scenarioId)??[],context=contextFor(p,prior);
   const result=await runGuidanceEvaluationTurn({guard,turnId:p.id,context,model:m.turnModels[p.id]});
   prior.push({packet:p,result});history.set(p.scenarioId,prior);
   // Only the genuine delivered reply and returned state are reused.
  }
 }catch(e){failure=e instanceof Error?e.message:'Execution failed';}
 finally{
  const summary=guard.summary();writeFileSync(join(root,'completion.json'),JSON.stringify({manifestSha256,inferenceAttempts:summary.entries.length,metadataAttempts:m.metadataAttempts,totalDirectProviderAttempts:summary.entries.length+m.metadataAttempts,accountedNanoUsd:summary.accountedNanoUsd,completedTurns:summary.results.length,failure,halted:summary.halted},null,2)+'\n',{mode:0o600});guard.close();
 }
 if(failure)throw Error('Assessment stopped; inspect private receipts; no retry');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,manifestFile,approvalFile]=process.argv.slice(2);
 if(mode==='--check'){const {manifest:m,manifestSha256}=await verifyDispatch(manifestFile);console.log(JSON.stringify({status:'OFFLINE PREFLIGHT PASSED; owner spending approval required',manifestSha256,runId:m.runId,turnModels:m.turnModels,capNanoUsd:m.capNanoUsd,maximumInferenceAttempts:m.maximumInferenceAttempts,inferenceCalls:0},null,2));}
 else if(mode==='--execute'&&approvalFile)await dispatchApproved(manifestFile,approvalFile);
 else throw Error('Use --check MANIFEST; --execute additionally requires private exact owner approval receipt');
}
