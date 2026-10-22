import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import * as bounds from '../src/lib/learning/providerBounds';
import * as context from '../src/lib/learning/contextBuilder';
import * as homework from '../src/lib/learning/homeworkPolicy';
import * as intent from '../src/lib/learning/intentDetection';
import * as router from '../src/lib/learning/router';
import * as registry from '../src/lib/learning/aiRegistry';
import * as tutorRequest from '../src/lib/learning/tutorRequest';
import * as conversation from '../src/lib/learning/conversationBounds';
import * as safety from '../src/lib/memberAgentResponseSafety';
import * as capability from '../src/lib/memberAgentCapabilityFramework';
import {professionalConfigs} from '../src/lib/digitalStaffRuntime/config';

function load(path:string,modules:Record<string,unknown>){
 const m={exports:{} as Record<string,Function>};
 const code=transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)((name:string)=>{if(name in modules)return modules[name];return require(name);},m,m.exports);return m.exports;
}
function fixture({inputReject=false,outputReject=false,providerFail=false,cancel=false}={}){
 const events:string[]=[],checks:Record<string,unknown>[]=[],c=new AbortController();let released=0,generations=0;
 const query={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},abortSignal(signal:AbortSignal){assert.ok(signal);return this;},maybeSingle:async()=>({data:{focus:'fractions',learning_style:'hints'},error:null}),then(resolve:Function){return Promise.resolve({data:[],error:null}).then(v=>resolve(v));}};
 const route=load('src/app/api/learning/ai/route.ts',{
  'next/server':{NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}},
  '@/lib/supabase/server':{createRouteClient:()=>({auth:{getUser:async()=>({data:{user:{id:'synthetic-member'}},error:null})},from:()=>query})},
  '@/lib/memberAgeServer':{requireProfessionalEntitlement:async()=>({ok:true,profile:{birthday:'2010-01-01'},decision:{ageStatus:'teen'}})},
  '@/lib/digitalStaffRuntime':{acquireDigitalStaffRequestLease:()=>({ok:true,release:()=>released++}),requireProfessionalConfig:()=>professionalConfigs['beasteducation.tutor']},
  '@/lib/server/firstPartyTelemetry':{digitalStaffTelemetryRecord:({status}:{status:string})=>({eventName:status}),recordServerFirstPartyTelemetry:async({record}:{record:{eventName:string}})=>{events.push(record.eventName);}},
  '@/lib/firstPartyTelemetry':{},'@/lib/learning/aiRegistry':registry,'@/lib/learning/contextBuilder':context,'@/lib/learning/homeworkPolicy':homework,'@/lib/learning/intentDetection':intent,'@/lib/learning/router':router,'@/lib/learning/tutorRequest':tutorRequest,'@/lib/learning/conversationBounds':conversation,'@/lib/learning/providerBounds':bounds,'@/lib/memberAgentCapabilityFramework':capability,
  '@/lib/memberAgentResponseSafety':safety,
  '@/lib/learning/openai':{learningProviderModel:'unchanged-model-fixture',callOpenAILearningSpecialist:async(_request:unknown,options:{signal:AbortSignal})=>{generations++;assert.ok(options.signal);return {status:providerFail?'error':'ready',model:'unchanged-model-fixture',content:'Divide both sides by 2. What do you get?',worksheetTranscription:'2x=6; x=2',safetyContract:{consequentialAction:'none',providerConnection:'none',professionalAuthority:'bounded_ai',diagnosis:'none',medicationDirection:'none',emergencyEscalation:'not_applicable',homeworkReview:'evidence_based'}};}},
  '@/lib/memberAgentSemanticVerifier':{verifyMemberAgentSemanticSafety:async(args:Record<string,unknown>)=>{checks.push(args);const reject=args.phase==='input'?inputReject:outputReject;if(cancel&&args.phase==='output')c.abort();return {valid:!reject,verdict:reject?'uncertain':'safe',failure:reject?'fixture-unavailable':null,categories:[]};}},
 });
 return {events,checks,released:()=>released,generations:()=>generations,run:()=>route.POST(new Request('http://local/api/learning/ai',{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({userRequest:'Check my attempt: 2x=6 so x=2',learnerName:'NEVER FORWARD THIS PRIVATE CLIENT ID'})})) as Promise<Response>};
}

test('Tutor completion occurs only after final validation; private evidence never becomes response payload',async()=>{
 const f=fixture();const response=await f.run();const body=await response.json();assert.equal(response.status,200);assert.equal(body.validationFailures.length,0);
 assert.deepEqual(f.events,['professional_turn_started','completed']);assert.equal(f.released(),1);assert.equal(f.generations(),1);
 assert.equal(f.checks.length,2);const evidence=f.checks[1].tutorEvidence;assert.match(JSON.stringify(evidence),/2x=6; x=2/);assert.doesNotMatch(JSON.stringify(evidence),/2010-01-01|PRIVATE CLIENT ID|data:image/);
 assert.doesNotMatch(JSON.stringify(body),/worksheetTranscription|2x=6; x=2|PRIVATE CLIENT ID/);
});

test('Tutor input rejection, final checker rejection, provider failure and cancellation cannot count as completed',async()=>{
 for(const options of [{inputReject:true},{outputReject:true},{providerFail:true},{cancel:true}]){
  const f=fixture(options);const r=await f.run();assert.ok([200,502].includes(r.status));assert.deepEqual(f.events,['professional_turn_started','failed']);assert.equal(f.released(),1);
  if(options.inputReject)assert.equal(f.generations(),0);
  if(options.providerFail)assert.equal(f.checks.length,1);
 }
});

test('Tutor final safety classifier has bounded output, private evidence only on output, and requires terminal completion',async()=>{
 const bodies:Record<string,unknown>[]=[];let status:string|undefined='completed';
 const verifier=load('src/lib/memberAgentSemanticVerifier.ts',{
  './learning/providerBounds':bounds,'./digitalStaffRuntime/guidanceResearch':{guidanceRuntimeLimits:{}},'./memberAgentResponseSafety':safety,
  './digitalStaffRuntime/provider':{requestOpenAIResponse:async(body:Record<string,unknown>,options:{signal:AbortSignal})=>{bodies.push(body);assert.ok(options.signal);return{status,output_text:JSON.stringify({verdict:'safe',categories:[]})};}},
 });
 const evidence={history:[{role:'user',content:'2x=6 so x=2'}],worksheetTranscription:'2x=6; x=2'};
 const args={professionalId:'beasteducation.tutor',memberMessage:'check my attempt',model:'unchanged-model-fixture',tutorEvidence:evidence};
 assert.equal((await verifier.verifyMemberAgentSemanticSafety({...args,phase:'output'})).valid,true);
 assert.equal(bodies[0].max_output_tokens,bounds.tutorRuntimeLimits.safetyTokens);assert.deepEqual(JSON.parse(String(bodies[0].input)).tutorEvidence,evidence);
 await verifier.verifyMemberAgentSemanticSafety({...args,phase:'input'});assert.ok(!('tutorEvidence' in JSON.parse(String(bodies[1].input))));
 for(status of ['incomplete','failed',undefined])assert.equal((await verifier.verifyMemberAgentSemanticSafety({...args,phase:'output'})).valid,false);
});
