import test from 'node:test';
import assert from 'node:assert/strict';
import { limits, reserveAttempt, usageCost } from './director-evaluation-budget.mjs';
const body = () => ({ model: 'gpt-5', max_output_tokens: 2400, store: false, service_tier: 'default', input: 'synthetic' });
test('every attempt including failed/unknown calls consumes a permanent reservation; ninth fails', () => {
  const ledger={attempts:[],reservedUsd:0};
  for(let n=0;n<8;n++)reserveAttempt(ledger,body());
  assert.equal(ledger.attempts.length,8);assert.ok(ledger.reservedUsd<3);
  assert.throws(()=>reserveAttempt(ledger,body()),/cap/);
});
test('spending limit, oversized input and paid tool/model changes stop before a request',()=>{
  assert.throws(()=>reserveAttempt({attempts:[],reservedUsd:2.99},body()),/cap/);
  for(const change of [{model:'another-model'},{tools:[{type:'web_search'}]},{max_output_tokens:2401},{previous_response_id:'history'},{service_tier:'priority'},{input:'x'.repeat(21000)}])assert.throws(()=>reserveAttempt({attempts:[],reservedUsd:0},{...body(),...change}));
});
test('usage accounts for cached and reasoning output; unknown/excess usage fails closed',()=>{
  assert.equal(usageCost({input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:100}}),0.0021375);
  for(const usage of [null,{input_tokens:1,output_tokens:limits.outputTokens+1},{input_tokens:65537,output_tokens:1}])assert.throws(()=>usageCost(usage));
});
