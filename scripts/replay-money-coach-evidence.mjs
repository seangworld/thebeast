// No transport/credential access. Diagnosis of frozen outputs, never a new AI evaluation.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {moneyEvidenceCatalog} from '../.test-dist/src/lib/moneyCoachEvidence.js';
import {verifyMoneyCoachReasoning} from '../.test-dist/src/lib/moneyCoachReasoning.js';
import {validateRuntimePlan} from '../.test-dist/src/lib/digitalStaffRuntime/runtime.js';
const root='docs/money-coach-upgrade/evaluation',packets=JSON.parse(readFileSync(root+'/executed-20261018/blinded-completed-packets.json')).packets;
const rows=[];
function lookup(root,path){let v=root;for(const k of path.split('.')){if(!v||typeof v!=='object'||!Object.hasOwn(v,k))return undefined;v=v[k]}return v}
function diagnosticPath(path){
 // EXPLICIT OFFLINE diagnosis only. No aliases are accepted by the runtime verifier.
 return path.replace(/debtComparisons\[(\d+)\]/g,'debtComparisons.$1').replace(/debtComparisons\[strategy=(minimum|snowball|avalanche)\]/g,'debtComparisons.$1')
 .replace(/^financialAssessment\.(supportedExtraPayment|requestedExtraPayment|lowestProjectedBalance|cashShortfall)/,'financialAssessment.facts.$1')
 .replace(/^structuredRecords\[canonical-affordability\]\./,'').replace(/^monthlyBills\[Rent\]$/,'monthlyBills');
}
for(const p of packets){
 if(!p.originalModelOutput)continue;
 const raw=JSON.parse(p.originalModelOutput),c=structuredClone(p.relevantEvidence),catalog=moneyEvidenceCatalog(c),summary=c.structuredRecords.find(r=>r.domain==='beastmoney.money-coach:canonical-affordability').record;
 const diagnoses=raw.financialAnalysis.claims.map(claim=>{
  const normalized=diagnosticPath(claim.path),direct=lookup(summary,claim.path),candidate=catalog.entries.find(e=>e.selector===normalized||e.canonicalPath===normalized);
  let category=direct===claim.value&&(direct===null||typeof direct==='number')?'exact_existing_path_and_value':candidate&&candidate.value===claim.value?'supported_value_with_unsupported_representation':candidate?'incorrect_or_unavailable_value_for_mapped_fact':'unsupported_reference_or_computation';
  return {originalClaim:claim,category,diagnosticCandidate:candidate||null,fixtureConflict:catalog.conflicts.length>0,notes:category==='unsupported_reference_or_computation'?'Not certified. Missing numeric evidence, expressions and booleans/objects cannot become numeric facts; no automatic repair.':null};
 });
 rows.push({scenarioId:p.scenarioId,turn:p.turn,originalFailures:p.deterministicToolResults.validationFailures,newVerbatimReplayFailures:verifyMoneyCoachReasoning(c,raw.financialAnalysis,raw.intent),sourceConflicts:catalog.conflicts,claims:diagnoses});
}
const selected=packets.find(p=>p.scenarioId==='folio-24'),c=structuredClone(selected.relevantEvidence),raw=JSON.parse(selected.originalModelOutput),catalog=moneyEvidenceCatalog(c);
const adapted={...raw,proposals:[],navigationTarget:null,financialAnalysis:{...raw.financialAnalysis,snapshotId:catalog.snapshotId,status:'conditional',claims:catalog.entries.filter(e=>['monthlyIncome','cashBuffer','financialAssessment.debtComparisons.avalanche.totalInterest','financialAssessment.debtComparisons.snowball.totalInterest'].includes(e.selector)).map(e=>({path:e.selector,value:e.value,meaning:e.selector}))}};
const result=validateRuntimePlan(c,adapted);
const counts={};for(const row of rows)for(const claim of row.claims)counts[claim.category]=(counts[claim.category]||0)+1;
mkdirSync(root+'/revision-2',{recursive:true});writeFileSync(root+'/revision-2/historical-replay.json',JSON.stringify({provenance:'No-cost replay/diagnosis. Original outputs remain unchanged and failed. Explicit offline representations are never runtime aliases. This is not fresh model reasoning or a revised grade.',historicalFinancialOutputs:rows.length,categories:counts,rows,authoredContractAdaptation:{scenarioId:'folio-24',provenance:'AUTHORED selector/assessment adaptation only; original narrative preserved exactly. Not actual AI compliance with v2.',narrativeUnchanged:result.response===raw.response,financialAssessmentDelivered:!!result.financialAnalysis,validationFailures:result.validationFailures}},null,2)+'\n');console.log(JSON.stringify({outputs:rows.length,categories:counts,authoredAdaptationDelivered:!!result.financialAnalysis}));
