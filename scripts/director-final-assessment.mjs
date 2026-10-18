// Assessment driver only. No default transport, executable paid CLI, key access or authorization.
// The caller must provide a newly approved manifest-bound authorization and existing local fixture adapter.
import {directorReasoningRequest,reasonAboutDirectorObjective} from '../.test-dist/src/lib/directorReasoningProvider.js';
import {approveDirectorReasoning} from '../.test-dist/src/lib/directorReasoning.js';
import {prepareFinal,reserveFinalAttempt,schedule,sha} from './prepare-director-final.mjs';

export async function runFinalAssessment({authorization,ledger,save,createAdapter,transport}){
 const manifest=prepareFinal();
 if(!authorization||authorization.approved!==true||authorization.manifestSha256!==sha(manifest)||!Number.isSafeInteger(authorization.issueCommentId)||authorization.issueCommentId<=6242565128||authorization.maxCalls!==16||authorization.maxUsd!==5.50)throw Error('New manifest-bound owner authorization required; consumed approvals cannot be reused');
 if(typeof transport!=='function'||typeof save!=='function'||typeof createAdapter!=='function')throw Error('Explicit transport, durable reservation persistence and local adapter required');
 if(ledger.attempts.length)throw Error('No automatic restart or retry; ambiguous charges require reconciliation and a reviewed continuation');
 ledger.authorization=authorization;ledger.manifestSha256=sha(manifest);await save(ledger);
 let adapter,priorCase;
 for(const slot of schedule){
  if(slot.scenarioId!==priorCase){adapter=await createAdapter(slot.scenarioId);priorCase=slot.scenarioId;if(adapter.environment!=='synthetic-local-postgres')throw Error('Real localhost synthetic PostgreSQL adapter required');}
  // Only predefined independent owner/clock/source events; no reference result or decision injection.
  await adapter.beforeTurn(slot.turn,ledger.attempts.at(-1));
  const context=await adapter.context(slot.turn),body=directorReasoningRequest(context);
  const attempt=reserveFinalAttempt(ledger,body,slot.scenarioId,slot.turn);
  Object.assign(attempt,{request:body,originalInput:context,startedAt:new Date().toISOString(),before:await adapter.evidence()});
  await save(ledger); // Must atomically fsync before dispatch; full reservation is retained forever.
  let sent=false;
  try{
   const plan=await reasonAboutDirectorObjective(adapter.ownerId,context,undefined,async(request,options)=>{
    if(sent||sha(request)!==sha(body))throw Error('Additional or changed provider request refused');sent=true;
    const raw=await transport(request,options);attempt.rawResponse=raw;
    attempt.originalResponseText=raw.output_text||raw.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')||null;
    await save(ledger);return raw;
   },receipt=>{attempt.receipt=receipt;});
   attempt.plan=plan;attempt.execution=[];
   // The adapter is the current real owner approval/RPC/foreground runner, not an oracle plan.
   if(plan.steps.length){
    let caps;
    try{caps=approveDirectorReasoning(plan,context,await adapter.context(slot.turn));}
    catch(error){attempt.execution.push({state:'withheld',reason:error.message});}
    if(caps?.length){const approval=await adapter.ownerApprove(plan,caps,slot.turn);attempt.execution.push(approval);if(approval.approved)attempt.execution.push(...await adapter.advanceApproved(slot.turn));}
   }else if(plan.assessments.some(a=>['resume_existing','request_correction'].includes(a.disposition))){
    attempt.execution.push(...await adapter.advanceApproved(slot.turn));
   }
   attempt.state='completed_with_usage';
  }catch(error){attempt.failure=String(error.message).slice(0,300);attempt.state='failed_reserved';}
  attempt.after=await adapter.evidence();attempt.finishedAt=new Date().toISOString();await save(ledger);
  // No retries for incomplete/invalid output. Unknown charges/identity/budget violations halt the batch.
  if(!sent||!attempt.receipt||attempt.receipt.actualModel!==manifest.modelConfiguration.model||attempt.receipt.serviceTier!=='default'||attempt.receipt.estimatedUsd===null||attempt.receipt.estimatedUsd>attempt.reservedUsd||attempt.receipt.inputTokens>manifest.modelConfiguration.reservedInputTokens||attempt.receipt.outputTokens>manifest.modelConfiguration.maxOutputTokens){ledger.halted='Unknown or unbudgeted outcome; retain reservation and stop';await save(ledger);break;}
 }
 ledger.finished=ledger.attempts.length===16&&!ledger.halted;await save(ledger);return ledger;
}

export function blindedFinalPacket(scenario,attempts){
 return {candidate:'Candidate A',scenarioAndOriginalCriteria:scenario,turns:attempts.filter(a=>a.scenarioId===scenario.id).map(a=>({turn:a.turn,completeModelInputIncludingInstructionsAndEvidence:{instructions:a.request.instructions,input:JSON.parse(a.request.input),responseSchema:a.request.text.format.schema},originalResponseTextVerbatim:a.originalResponseText??null,responseStatus:a.rawResponse?.status??'unknown',serverValidationAndExecutionEvidence:{failure:a.failure??null,execution:a.execution??[]},stateBeforeAndAfter:{before:a.before,after:a.after}})),independentGrades:null};
}

/** Existing exclusive-lock/atomic-fsync ledger pattern, with a new authorization and no slot refunds.
 * No automatic resume: a second invocation must reconcile prior charges and explicitly review continuation. */
export async function withFinalAssessmentLedger(path,authorization,action){
 const fs=await import('node:fs'),{dirname}=await import('node:path'),{randomUUID}=await import('node:crypto');
 const parent=fs.lstatSync(dirname(path));if(!parent.isDirectory()||parent.isSymbolicLink()||(parent.mode&0o077))throw Error('Private ledger directory required');
 const fd=fs.openSync(path+'.lock','wx',0o600);let ledger;
 const save=()=>{const temporary=path+'.'+randomUUID()+'.tmp',out=fs.openSync(temporary,'wx',0o600);try{fs.writeFileSync(out,JSON.stringify(ledger,null,2)+'\n');fs.fsyncSync(out);}finally{fs.closeSync(out);}fs.renameSync(temporary,path);const dir=fs.openSync(dirname(path),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}};
 try{if(fs.existsSync(path))throw Error('Existing ledger is immutable until charges and continuation are independently reconciled');ledger={authorization,attempts:[],reservedUsd:0};save();return await action(ledger,save);}finally{fs.closeSync(fd);fs.unlinkSync(path+'.lock');}
}
