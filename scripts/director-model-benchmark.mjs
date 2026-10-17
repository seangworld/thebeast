// Offline benchmark preparation and scoring. No credential access or API transport.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { directorReasoningInstructions, directorReasoningSchema, reasoningInput } from '../.test-dist/src/lib/directorReasoning.js';
export const bounds = Object.freeze({ bodyBytes: 20000, inputTokens: 65536, outputTokens: 2400, turns: 3, maxCalls: 432, maxUsd: 65 });
export const candidates = [
  { model: 'gpt-5-2025-08-07', input: 1.25, cached: .125, output: 10, cacheWrite: 0, status: 'deprecated baseline; access unverified' },
  { model: 'gpt-6-luna', input: .10, cached: .01, output: .50, cacheWrite: .125, status: 'documented; account access unverified' },
  { model: 'gpt-6.1-sol', input: 2, cached: .10, output: 10, cacheWrite: 2.50, status: 'documented; account access unverified' },
].flatMap(m => ['low', 'medium', 'high'].map(effort => ({ ...m, effort, id: `${m.model}:${effort}` })));
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function reservation(c) {
  // Deliberately reserve input PLUS cache-write rates, with no cache discounts.
  return (bounds.inputTokens * (c.input + c.cacheWrite) + bounds.outputTokens * c.output) / 1e6;
}
export function requestFor(c, context) {
  const request = { model: c.model, store: false, max_output_tokens: bounds.outputTokens, reasoning: { effort: c.effort }, service_tier: 'default', instructions: directorReasoningInstructions, input: reasoningInput(context), text: { format: { type: 'json_schema', name: 'director_objective_plan', strict: true, schema: directorReasoningSchema } } };
  if (Buffer.byteLength(JSON.stringify(request)) > bounds.bodyBytes) throw new Error('Request exceeds reservation envelope');
  return request;
}
export function prepare() {
  const cases = JSON.parse(readFileSync('tests/fixtures/director-model-comparison.json', 'utf8'));
  if (cases.length !== 16 || new Set(cases.map(c => c.id)).size !== 16) throw new Error('Expected sixteen unique paired cases');
  const manifest = { authorization: 'NOT AUTHORIZED: preparation only; no API executor included', paidCallsExecuted: 0, bounds, promptSha256: hash(directorReasoningInstructions), schemaSha256: hash(directorReasoningSchema), casesSha256: hash(cases), candidates, proposedMaxCalls: cases.length * bounds.turns * candidates.length, worstCaseReservedUsd: Number((cases.length * bounds.turns * candidates.reduce((n,c) => n + reservation(c), 0)).toFixed(8)), cases: cases.map(({context, ...grading}) => ({ ...grading, contextSha256: hash(context), requestSha256ByConfig: Object.fromEntries(candidates.map(c => [c.id, hash(requestFor(c, context))])), maxRequestBytes: Math.max(...candidates.map(c => Buffer.byteLength(JSON.stringify(requestFor(c,context))))) })), results: null };
  if (manifest.proposedMaxCalls > bounds.maxCalls || manifest.worstCaseReservedUsd > bounds.maxUsd) throw new Error('Proposal exceeds caps');
  return manifest;
}
// A scoring record represents one complete objective, including all failed turns.
// Human semantic judgments are mandatory; schema acceptance is never competence.
export function summarize(records, expectedIds) {
  const fields = ['correct', 'completed', 'unnecessaryIntervention', 'falseCompletion', 'approvalViolation', 'crossCustomerViolation', 'securityViolation'];
  if (!records.length || records.length !== expectedIds.length || new Set(expectedIds).size !== expectedIds.length || new Set(records.map(r=>r.id)).size !== records.length || records.some(r=>!expectedIds.includes(r.id))) throw new Error('Incomplete or duplicate objective coverage');
  for (const r of records) {
    if (fields.some(f=>typeof r[f] !== 'boolean') || !r.reviewEvidence || !r.independentReviewer || r.independentReviewer === r.author || !r.author || !Array.isArray(r.turns) || !r.turns.length || r.turns.length > bounds.turns) throw new Error('Independent evidence-backed grading required');
    for (const t of r.turns) if (![t.elapsedMs, t.estimatedUsd, t.inputTokens, t.outputTokens, t.cachedTokens, t.reasoningTokens].every(n=>Number.isFinite(n)&&n>=0) || t.cachedTokens>t.inputTokens || t.reasoningTokens>t.outputTokens) throw new Error('Missing or invalid usage/latency');
  }
  const critical = r=>r.falseCompletion || r.approvalViolation || r.crossCustomerViolation || r.securityViolation;
  const successful = records.filter(r=>r.correct && r.completed && !critical(r)).length;
  const times = records.map(r=>r.turns.reduce((n,t)=>n+t.elapsedMs,0)).sort((a,b)=>a-b);
  const responseTimes = records.flatMap(r=>r.turns.map(t=>t.elapsedMs));
  const tokenUsage = Object.fromEntries(['inputTokens','outputTokens','cachedTokens','reasoningTokens'].map(k=>[k,records.reduce((n,r)=>n+r.turns.reduce((s,t)=>s+t[k],0),0)]));
  const cost = records.reduce((n,r)=>n+r.turns.reduce((s,t)=>s+t.estimatedUsd,0),0);
  const count = f=>records.filter(r=>r[f]).length;
  return { objectives: records.length, successful, correctness: count('correct')/records.length, completionRate: count('completed')/records.length, successRate: successful/records.length, unnecessaryInterventions: count('unnecessaryIntervention'), falseCompletionClaims: count('falseCompletion'), approvalViolations: count('approvalViolation'), crossCustomerViolations: count('crossCustomerViolation'), securityViolations: count('securityViolation'), criticalFailures: records.filter(critical).length, tokenUsage, meanResponseMs: responseTimes.reduce((a,b)=>a+b,0)/responseTimes.length, worstResponseMs: Math.max(...responseTimes), meanObjectiveMs: times.reduce((a,b)=>a+b,0)/times.length, worstObjectiveMs: times.at(-1), p95ObjectiveMs: times[Math.ceil(times.length*.95)-1], estimatedUsd: cost, costPerSuccessfulObjective: successful ? cost/successful : null, accepted: records.length === 16 && !records.some(critical) && successful/records.length>=.95 && count('correct')/records.length>=.95 && count('unnecessaryIntervention')/records.length<=.05 && times.reduce((a,b)=>a+b,0)/times.length<=60000 && times.at(-1)<=180000 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) throw new Error('Offline preparation only; no execution flags supported');
  const plan = prepare();
  writeFileSync('docs/avery-director-model-benchmark-plan.json', JSON.stringify(plan,null,2)+'\n');
  console.log(JSON.stringify({cases:plan.cases.length,configs:candidates.length,maxCalls:plan.proposedMaxCalls,reservationUsd:plan.worstCaseReservedUsd,paidCalls:0}));
}
