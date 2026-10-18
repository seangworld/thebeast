// No credential access or network transport. Paid execution remains unauthorized.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildMoneyCoachStructuredRecords} from '../.test-dist/src/lib/digitalStaffRuntime/moneyContext.js';
import {buildRuntimeInput,buildRuntimeInstructions,buildRuntimeResponseSchema} from '../.test-dist/src/lib/digitalStaffRuntime/prompt.js';
import {requireProfessionalConfig} from '../.test-dist/src/lib/digitalStaffRuntime/config.js';
import {executeSpecialist,verifySpecialistResult} from '../.test-dist/src/lib/directorAssignments.js';
const revision2=process.argv.includes('--revision-2');
if(process.argv.includes('--execute-paid'))throw Error('No paid Money Coach authorization is recorded. Preparation only.');
const fixture=JSON.parse(readFileSync(revision2?'tests/fixtures/money-coach-competency-v2.json':'tests/fixtures/money-coach-competency.json','utf8'));
if(!fixture.syntheticOnly||fixture.scenarios.length!==9)throw Error('Unexpected scenario scope');
if(!revision2)throw Error('Historical v1 artifacts are frozen. Use --revision-2 for no-cost correction preparation; paid evaluation is not authorized.');
const config=requireProfessionalConfig('beastmoney.money-coach'),packets=[];
const emptyState={currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]};
for(const scenario of fixture.scenarios){let rows=structuredClone(fixture.baseline),previousReceipt=null;
 for(const [index,turn] of scenario.turns.entries()){
  if(turn.addIncome)rows.incomes.push(turn.addIncome);
  if(turn.incomeFrequency)rows.incomes.find(r=>r.id==='rebate-29').frequency=turn.incomeFrequency;
  if(turn.promotionalDebt){rows.debts[0].name='Promotional Card Zenith';rows.debts[0].interest_rate=0;}
  if(turn.shortage){rows.cashSettings.starting_balance=500;rows.bills[0].due_date=19;}
  if(turn.changedRecords){rows.incomes[0].amount=2400;if(scenario.id==='folio-67')rows.bills[0].amount=2200;}
  if(turn.missing){rows.cashSettings=null;delete rows.debts[0].interest_rate;}
  const context={ownerId:'synthetic-money-evaluation-owner',professionalId:config.id,conversationId:'synthetic-'+scenario.id,message:{id:scenario.id+'-'+(index+1),role:'user',text:turn.message,createdAt:fixture.asOf},recentMessages:turn.incorrectPrior?[{id:'incorrect-prior',role:'assistant',text:'Recurring income is 8000; another 3000 payment is safe.',createdAt:fixture.asOf}]:[],state:structuredClone(emptyState),memories:[],structuredRecords:buildMoneyCoachStructuredRecords(rows,new Date(fixture.asOf)),workspace:'/dashboard/money/coach'};
  let executionEvidence=null;
  if(turn.directorReceipt){const snapshot={ownerId:context.ownerId,capability:'money.cash-review',complete:true,money:rows};if(!previousReceipt)previousReceipt=executeSpecialist(snapshot,fixture.asOf);executionEvidence={provenance:'Actual synthetic canonical saved-record execution, not model reasoning',previousReceipt,verificationProblem:verifySpecialistResult(previousReceipt,snapshot,fixture.asOf),goalStatus:'Active'};context.structuredRecords.push({domain:'director:verified-cash-review',record:executionEvidence});}
  packets.push(structuredClone({scenarioId:scenario.id,turn:index+1,scenario:turn.message,context,executionEvidence,expectedResponsibilities:scenario.criteria,followUpProtocol:index?'Before dispatch, replace recentMessages and state with the ORIGINAL preceding user/model messages and returned state; refresh current records as provided. Do not inject a successful fictional earlier response.':null,rawResponse:null,candidate:'Candidate A',grade:null}));
 }
}
const schema=buildRuntimeResponseSchema(config,packets[0].context);
const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const result={status:'REVISION 2 NO-COST CORRECTION FIXTURES ONLY; no new paid authorization',scenarioHash:sha(readFileSync(revision2?'tests/fixtures/money-coach-competency-v2.json':'tests/fixtures/money-coach-competency.json','utf8')),instructionsHash:sha(buildRuntimeInstructions(config)),schemaHash:sha(schema),scenarios:9,turns:packets.length,modelCallsMaximum:36,spendMaximumUsd:1.50,proposedCandidate:{model:'gpt-5.6-luna',reasoningEffort:'medium',safetyVerifierEffort:'low',planMaxOutputTokens:4800,verifierMaxOutputTokens:1200,serviceTier:'default'},callsPerTurnMaximum:3,retries:0,researchCallsAuthorized:0,pricing:{date:'2026-10-18',inputPerMillion:0.20,cachedInputPerMillion:0.02,cacheWritePerMillion:0.25,outputPerMillion:1.20},inputTokenReservation:65536,requestBytesMaximum:32768,conservativeReservationPerCallUsd:0.0352512,conservativeMaximumUsd:1.2690432,notes:['Failed and rejected provider attempts count; reserve and fsync before dispatch. Retain full reservation on missing usage and halt.','No web search or paid research is allowed in this assessment; prevent tools at the transport boundary.','Normal existing semantic input/plan/output calls are all counted; deterministic rejection may use fewer.','Store exact requested/actual model IDs, raw output, usage incl reasoning/cache, latency and estimated costs privately; blinded packets omit identity, prices and implementer grades.','Continuation must use actual previous messages and state; never use development examples as independent proof.'],requestSizes:packets.map(p=>({scenario:p.scenarioId,turn:p.turn,initialBodyBytes:Buffer.byteLength(JSON.stringify({model:'gpt-5.6-luna',store:false,reasoning:{effort:'medium'},max_output_tokens:4800,service_tier:'default',instructions:buildRuntimeInstructions(config),input:buildRuntimeInput(config,p.context),text:{format:{type:'json_schema',name:'digital_staff_runtime_plan',strict:true,schema:buildRuntimeResponseSchema(config,p.context)}}}))}))};
if(packets.length!==12)throw Error('Unexpected scenario count');
result.priorPaidBodyLimitCompatible=result.requestSizes.every(r=>r.initialBodyBytes<=32768);
result.paidExecutionAuthorized=false;
mkdirSync('docs/money-coach-upgrade/evaluation/revision-2',{recursive:true});writeFileSync('docs/money-coach-upgrade/evaluation/revision-2/preflight.json',JSON.stringify(result,null,2)+'\n');writeFileSync('docs/money-coach-upgrade/evaluation/revision-2/blinded-scenario-packets.json',JSON.stringify({status:'Novelty/fairness review only. No model responses yet.',packets},null,2)+'\n');console.log(JSON.stringify({status:result.status,scenarios:9,turns:12,maximumCalls:36,maximumUsd:1.50,largestInitialBody:Math.max(...result.requestSizes.map(r=>r.initialBodyBytes))}));
