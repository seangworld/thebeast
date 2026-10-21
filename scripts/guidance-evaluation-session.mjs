// Dedicated local synthetic evaluation process only. No automatic execution.
import {runDigitalStaffRuntime} from '../.test-dist/src/lib/digitalStaffRuntime/runtime.js';
import {registerEvaluationReservation} from '../.test-dist/src/lib/digitalStaffRuntime/evaluationProviderHook.js';
let active=false;
export async function runGuidanceEvaluationTurn({guard,turnId,context,model,observer={},privateProbe=false}){
 if(active)throw Error('A GC evaluation turn is already active in this process');
 if(process.env.NODE_ENV==='production'||context.professionalId!=='beasteducation.guidance-counselor'||!context.ownerId.startsWith('synthetic-gc-'))throw Error('Dedicated synthetic DEV evaluation required');
 if(!guard.policy.models[model])throw Error('Model not in reviewed policy');
 guard.startTurn(turnId);
 active=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('GC 170-second deadline')),170000);
 registerEvaluationReservation((body,id)=>guard.reserve(body,id));
 try{
  const result=await runDigitalStaffRuntime({...context,requestId:turnId,signal:controller.signal},{...observer,onResponseDelta:async()=>{}},{modelOverride:model,guidancePrivateProbe:privateProbe});
  // The runtime may produce a safe fallback after an unsettled output screen.
  // Do not expose even that fallback as a completed evaluation answer.
  try{guard.ready();}catch(error){guard.retainUndeliveredResult(result);throw error;}
  guard.finishTurn(result);
  await observer.onResponseDelta?.(result.response);
  return result;
 }catch(error){
  const {GuidancePrivateProbeStop}=await import('../.test-dist/src/lib/digitalStaffRuntime/guidanceDiscovery.js');
  if(!privateProbe||!(error instanceof GuidancePrivateProbeStop))throw error;
  guard.ready();guard.finishTurn(error.result);return error.result;
 }finally{clearTimeout(timeout);registerEvaluationReservation(()=>undefined);active=false;}
}
