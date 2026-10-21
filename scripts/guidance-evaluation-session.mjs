// Dedicated local synthetic evaluation process only. No automatic execution.
import {runDigitalStaffRuntime} from '../.test-dist/src/lib/digitalStaffRuntime/runtime.js';
import {registerEvaluationReservation} from '../.test-dist/src/lib/digitalStaffRuntime/evaluationProviderHook.js';
export async function runGuidanceEvaluationTurn({guard,turnId,context,model,observer={}}){
 if(process.env.NODE_ENV==='production'||context.professionalId!=='beasteducation.guidance-counselor'||!context.ownerId.startsWith('synthetic-gc-'))throw Error('Dedicated synthetic DEV evaluation required');
 if(!guard.policy.models[model])throw Error('Model not in reviewed policy');
 guard.startTurn(turnId);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('GC 170-second deadline')),170000);
 registerEvaluationReservation((body,id)=>guard.reserve(body,id));
 try{
  const result=await runDigitalStaffRuntime({...context,requestId:turnId,signal:controller.signal},observer,{modelOverride:model});
  guard.ready(); // A runtime fallback must not disguise uncertain billing.
  guard.finishTurn();
  return result;
 }finally{clearTimeout(timeout);registerEvaluationReservation(()=>undefined);}
}
