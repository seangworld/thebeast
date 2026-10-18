// No credential access or network transport. Paid execution remains unauthorized.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildMoneyCoachStructuredRecords} from '../.test-dist/src/lib/digitalStaffRuntime/moneyContext.js';
import {buildRuntimeInput,buildRuntimeInstructions,buildRuntimeResponseSchema} from '../.test-dist/src/lib/digitalStaffRuntime/prompt.js';
import {requireProfessionalConfig} from '../.test-dist/src/lib/digitalStaffRuntime/config.js';
import {executeSpecialist,verifySpecialistResult} from '../.test-dist/src/lib/directorAssignments.js';
if(process.argv.includes('--freeze-final')||process.argv.includes('--verify-final')) {
 const base='docs/money-coach-upgrade/evaluation/revision-2/';
 const packets=JSON.parse(readFileSync(base+'blinded-scenario-packets.json')).packets;
 const v1=JSON.parse(readFileSync('tests/fixtures/money-coach-competency.json'));
 const v2=JSON.parse(readFileSync('tests/fixtures/money-coach-competency-v2.json'));
 if(!v2.syntheticOnly||packets.length!==12||v2.scenarios.length!==9||JSON.stringify(v1.scenarios)!==JSON.stringify(v2.scenarios)||JSON.stringify(v1.baseline)!==JSON.stringify(v2.baseline)||v1.asOf!==v2.asOf)throw Error('Original scenarios or criteria changed');
 const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
 const config=requireProfessionalConfig('beastmoney.money-coach');
 const schemas=packets.map(p=>{const schema=buildRuntimeResponseSchema(config,p.context);schema.properties.financialAnalysis.anyOf[1].properties.snapshotId.enum=['CURRENT_REQUEST_SNAPSHOT_ID'];return schema});
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const sourceTree=git('rev-parse','HEAD:src');
 if(sourceTree!==git('rev-parse','0f7dd394:src'))throw Error('Approved application source changed');
 for(const id of ['folio-67','folio-93']){const ps=packets.filter(p=>p.scenarioId===id);for(const [i,p]of ps.entries()){const summary=p.context.structuredRecords[0].record,raw=p.context.structuredRecords.find(r=>r.domain.endsWith(':income')).record;if(raw.amount!==(i?2400:3650)||summary.monthlyIncome!==raw.amount)throw Error('Fixture chronology inconsistent')}}
 const manifest={assessmentVersion:'money-coach-competency-v2',ownerApprovalUrl:'https://github.com/seangworld/thebeast/issues/268#issuecomment-6256403158',independentReviewUrl:'https://github.com/seangworld/thebeast/issues/268#issuecomment-6256445275',approvedApplicationCommit:'0f7dd394cc72217782db7987813a537f92866954',applicationSourceTree:sourceTree,scenarioHash:hash(readFileSync('tests/fixtures/money-coach-competency-v2.json','utf8')),packetHash:hash(readFileSync(base+'blinded-scenario-packets.json','utf8')),instructionsHash:hash(buildRuntimeInstructions(config)),schemaHash:hash(schemas),scenarios:9,turns:12,maxCalls:36,maxUsd:1.60,model:'gpt-5.6-luna',planEffort:'medium',classifierEffort:'low',inputTokenReservation:80000,bodyBytesMaximum:40000,planOutputMaximum:4800,classifierOutputMaximum:1200,retries:0,tools:0,conservativeAllPlanMaximumUsd:1.50336,acceptance:'Original nine scenario criteria unchanged; zero critical failures, exact material numeric grounding, >=90% independent semantic criteria, <=1 unnecessary blocker, mean <=25s and worst <=60s; verified useful financial response must reach user. No automatic PASS.',snapshotPolicy:'Only request-specific snapshot ID enum varies; actual IDs and full schemas preserved in provider ledger.'};
 const target=base+'final-manifest.json';
 if(process.argv.includes('--verify-final')){if(JSON.stringify(JSON.parse(readFileSync(target)))!==JSON.stringify(manifest))throw Error('Frozen manifest mismatch')}else writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
 console.log('Final v2 manifest verified; synthetic immutable scenarios and original criteria preserved. No credential or network access.');process.exit(0);
}
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
