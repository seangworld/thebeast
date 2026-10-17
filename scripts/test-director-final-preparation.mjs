import test from 'node:test';import assert from 'node:assert/strict';
import {prepareFinal,reserveFinalAttempt,schedule} from './prepare-director-final.mjs';
import {directorReasoningRequest} from '../.test-dist/src/lib/directorReasoningProvider.js';
const body=()=>directorReasoningRequest({goal:{id:'test',title:'Synthetic',updated_at:'test'},availableCapabilities:[],checkpoints:[]});
test('final proposal uses exact live contract, unchanged six cases, 16 calls and conservative bound',()=>{const p=prepareFinal();assert.equal(p.paidCalls,0);assert.equal(p.cases.length,6);assert.equal(p.schedule.length,16);assert.equal(p.worstCaseReservedUsd,5.486592);assert.equal(p.bounds.usd,5.50);assert.equal(p.modelConfiguration.reasoningEffort,'high');});
test('no retries or extra calls, modified contracts, oversized input, wrong sequence or fabricated spend ledger',()=>{
 const ledger={attempts:[],reservedUsd:0};for(const s of schedule)reserveFinalAttempt(ledger,body(),s.scenarioId,s.turn);
 assert.throws(()=>reserveFinalAttempt(ledger,body(),'folio-76',2),/limit/);
 for(const b of [{...body(),model:'different'},{...body(),max_output_tokens:5000},{...body(),input:'x'.repeat(60000)},{...body(),tools:[]}])assert.throws(()=>reserveFinalAttempt({attempts:[],reservedUsd:0},b,'folio-17',1),/contract/);
 assert.throws(()=>reserveFinalAttempt({attempts:[],reservedUsd:1},body(),'folio-17',1),/integrity/);
 assert.throws(()=>reserveFinalAttempt({attempts:[],reservedUsd:0},body(),'folio-28',1),/limit/);
 assert.throws(()=>directorReasoningRequest({goal:{id:'test',title:'x'.repeat(24000),updated_at:'test'},availableCapabilities:[],checkpoints:[]}),/budget/);
});
test('final driver refuses exhausted or missing approval before transport/fixtures and packets preserve verbatim responses',async()=>{
 const {runFinalAssessment,blindedFinalPacket}=await import('./director-final-assessment.mjs');let calls=0;
 await assert.rejects(runFinalAssessment({authorization:{approved:true,issueCommentId:6241324460},ledger:{attempts:[],reservedUsd:0},save:async()=>{},createAdapter:async()=>{calls++;},transport:async()=>{calls++;}}),/authorization/);assert.equal(calls,0);
 const text='Exact response\nwith original spacing';const p=blindedFinalPacket({id:'folio-17'},[{scenarioId:'folio-17',turn:1,request:{instructions:'test',input:'{}',text:{format:{schema:{}}}},originalResponseText:text,rawResponse:{status:'completed',model:'hidden'},receipt:{actualModel:'hidden'},plan:{preferred:'hidden'},before:{},after:{}}]);
 assert.equal(p.turns[0].originalResponseTextVerbatim,text);assert.doesNotMatch(JSON.stringify(p),/hidden|actualModel|preferred/);
});
