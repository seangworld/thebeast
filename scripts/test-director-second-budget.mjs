import test from 'node:test';
import assert from 'node:assert/strict';
import { limits, secondEvaluationLimits, reserveAttempt } from './director-evaluation-budget.mjs';
const body={model:'gpt-5',max_output_tokens:2400,store:false,service_tier:'default',input:'synthetic'};
test('second authorization permits at most 16 permanently reserved attempts below $2',()=>{const ledger={attempts:[],reservedUsd:0};for(let i=0;i<16;i++)reserveAttempt(ledger,body,secondEvaluationLimits);assert.equal(ledger.reservedUsd,1.69472);assert.throws(()=>reserveAttempt(ledger,body,secondEvaluationLimits),/cap/)});
test('second batch cannot overwrite first-batch cap or use an invented authorization profile',()=>{const ledger={attempts:[],reservedUsd:0};for(let i=0;i<8;i++)reserveAttempt(ledger,body);assert.equal(limits.calls,8);assert.throws(()=>reserveAttempt(ledger,body),/cap/);assert.throws(()=>reserveAttempt({attempts:[],reservedUsd:0},body,{...secondEvaluationLimits,calls:99}),/Unknown/)});
test('second batch refuses overdraft, corrupt ledger and oversized follow-up before dispatch',()=>{for(const reservedUsd of [1.99,NaN,-1])assert.throws(()=>reserveAttempt({attempts:[],reservedUsd},body,secondEvaluationLimits));assert.throws(()=>reserveAttempt({attempts:[],reservedUsd:0},{...body,input:'x'.repeat(21000)},secondEvaluationLimits))});
