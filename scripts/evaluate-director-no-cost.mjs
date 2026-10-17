// Held-out prompt cases are not included in production prompts or routing logic.
// Probe an existing local Ollama only. Never download, provision or call a paid API.
import { readFileSync, writeFileSync } from 'node:fs';
import { directorReasoningInstructions, directorReasoningSchema, reasoningInput, validateDirectorReasoning } from '../.test-dist/src/lib/directorReasoning.js';
const cases = JSON.parse(readFileSync('tests/fixtures/director-competency.json', 'utf8'));
const results = [];
let model;
try {
  const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1000) });
  const listing = await response.json();
  model = listing.models?.find(item => item.details?.parameter_size && !/cloud/i.test(item.name))?.name;
} catch { /* No local inference service is an evaluation blocker, not a pass. */ }
for (const scenario of cases) {
  const context = { goal: { id: scenario.id, title: scenario.objective, updated_at: 'synthetic-current' }, availableCapabilities: scenario.available, checkpoints: scenario.tasks };
  if (!model) { results.push({ id: scenario.id, status: 'blocked', reason: 'No existing no-cost local model is available. No paid calls authorized or attempted.' }); continue; }
  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, format: directorReasoningSchema, messages: [{ role: 'system', content: directorReasoningInstructions }, { role: 'user', content: reasoningInput(context) }], options: { num_predict: 2400, temperature: 0 } }), signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Local inference returned ${response.status}`);
    const generated = await response.json();
    const plan = validateDirectorReasoning(JSON.parse(generated.message.content), context);
    const rubric = scenario.rubric;
    const checks = [
      !rubric.capabilities || rubric.capabilities.every(cap => plan.steps.some(step => step.capability === cap)),
      !rubric.noSteps || plan.steps.length === 0,
      !rubric.unsupported || plan.unsupportedWork.length > 0,
      !rubric.conflict || plan.contradictions.length + plan.missingInformation.length > 0,
      !rubric.approval || plan.ownerDecisions.length + plan.unsupportedWork.length > 0,
      !rubric.accept || plan.assessments.some(a => a.taskId === rubric.accept && a.disposition === 'accept_verified_evidence'),
      !rubric.correction || plan.assessments.some(a => a.taskId === rubric.correction && a.disposition !== 'accept_verified_evidence'),
      !rubric.investigate || plan.assessments.some(a => a.taskId === rubric.investigate && a.disposition === 'investigate'),
    ];
    results.push({ id: scenario.id, status: checks.every(Boolean) ? 'structural_checks_passed' : 'failed', model, plan, manualReasoningReview: 'required; structural checks alone are not competency acceptance' });
  } catch (error) { results.push({ id: scenario.id, status: 'failed', reason: error.message }); }
}
const report = { evidenceType: model ? 'local_model_only_not_production_model' : 'no_model_evaluated', realModelEvaluated: Boolean(model), paidCalls: 0, overallCompetency: 'partial-pass', results };
writeFileSync('/private/tmp/avery-director-reasoning-evaluation.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
