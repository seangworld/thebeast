/** Local PostgreSQL + PostgREST integration. Requires dedicated fixture containers.
 * Setup is documented in docs/avery-director-upgrade.md. No credentials or customer data.
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { directorAssignmentStore, directorAssignmentAccess, publicAssignments } from '../.test-dist/src/lib/directorAssignmentStore.js';
import { advanceDirectorObjective } from '../.test-dist/src/lib/directorAssignments.js';

const url = process.env.DIRECTOR_TEST_REST_URL;
if (!url || !/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw new Error('Set DIRECTOR_TEST_REST_URL to the disposable localhost PostgREST port.');
const secret = 'avery-synthetic-only-secret-at-least-32-characters';
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
const goal = '10000000-0000-4000-8000-000000000001';
const bobGoal = '10000000-0000-4000-8000-000000000002';
function client(owner) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'authenticated', sub: owner, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  const token = `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
  return createClient(url, 'synthetic-anon-key', { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(String(input).replace('/rest/v1/', '/'), init) } });
}
const a = client(alice), b = client(bob);
const plan = () => a.rpc('plan_director_reviews', { p_goal_id: goal, p_capabilities: ['health.preparation-review', 'money.cash-review'] });
assert.equal((await plan()).error, null);
assert.equal((await plan()).error, null);
const store = directorAssignmentStore(a);
let tasks = await store.list(alice, goal);
assert.equal(tasks.length, 2, 'repeated planning must deduplicate');
const health = tasks.find(t => t.capability === 'health.preparation-review');
const money = tasks.find(t => t.capability === 'money.cash-review');
assert.deepEqual(money.dependencies, [health.id]);
assert.equal((await b.from('beast_director_assignments').select('*').eq('goal_id', goal)).data.length, 0, 'cross-owner read');
assert.ok((await b.rpc('plan_director_reviews', { p_goal_id: goal, p_capabilities: ['health.preparation-review'] })).error, 'cross-owner RPC');
assert.ok((await a.rpc('plan_director_reviews', { p_goal_id: goal, p_capabilities: ['publish'] })).error, 'unsupported capability');
assert.ok((await a.rpc('plan_director_reviews', { p_goal_id: goal, p_capabilities: [null] })).error, 'null capability');
assert.ok((await a.from('beast_director_assignments').insert({ owner_id: alice, goal_id: bobGoal, capability: 'health.preparation-review' })).error, 'foreign goal insertion');
assert.ok((await a.from('beast_director_assignments').update({ owner_id: bob }).eq('id', health.id)).error, 'ownership reassignment');
assert.ok((await a.from('beast_director_assignments').update({ status: 'verified', result: null }).eq('id', health.id)).error, 'invalid verified state');
assert.ok((await a.from('beast_director_assignments').delete().eq('id', health.id)).error, 'client deletion denied');
assert.equal((await b.from('beast_director_assignments').update({ blocker: 'ATTACK' }).eq('id', health.id).select('id')).data.length, 0, 'cross-owner update');
let enabled = true;
const access = directorAssignmentAccess(a, { id: alice }, goal, async () => enabled);
const run = () => advanceDirectorObjective({ store, access, ownerId: alice, goalId: goal, now: new Date().toISOString(), leaseId: crypto.randomUUID() });
const concurrent = await Promise.all([run(), run()]);
assert.ok(concurrent.some(outcome => outcome.state === 'verified'));
assert.ok(concurrent.some(outcome => ['busy', 'blocked'].includes(outcome.state)), 'competing resume must not duplicate the active checkpoint');
tasks = await store.list(alice, goal);
assert.equal(tasks.find(t => t.id === health.id).attempts, 1, 'CAS prevents duplicate execution');
assert.equal(tasks.find(t => t.id === health.id).result.output.medicationReview.length, 1);
assert.ok(!JSON.stringify(tasks).includes('PRIVATE BOB'), 'specialist sees only current owner data');
// A fresh store/access instance models a new request/session using actual database history.
const resumed = await directorAssignmentStore(a).list(alice, goal);
assert.equal(resumed.find(t => t.id === health.id).status, 'verified');
assert.equal(resumed.find(t => t.id === health.id).events.length, 3);
// Tampering with self-owned history is not accepted as proof by the server verifier.
const fake = structuredClone(resumed.find(t => t.id === health.id).result);
fake.output = { success: true, appointmentCompleted: true };
assert.equal((await a.from('beast_director_assignments').update({ result: fake }).eq('id', health.id)).error, null);
assert.equal((await run()).state, 'needs_correction');
assert.equal((await run()).state, 'verified');
// Change a canonical source, not a mock return value.
assert.equal((await a.from('beast_health_records').update({ title: 'Corrected synthetic medication', updated_at: new Date().toISOString() }).eq('owner_id', alice)).error, null);
assert.equal((await run()).state, 'needs_correction');
assert.equal((await run()).state, 'verified');
enabled = false;
const redacted = await publicAssignments(store, access, alice, goal);
assert.ok(redacted.every(t => t.result === null && t.events.length === 0));
assert.equal((await run()).state, 'needs_correction');
const anonymous = createClient(url, 'synthetic-anon-key', { global: { fetch: (input, init) => fetch(String(input).replace('/rest/v1/', '/'), init) } });
assert.ok((await anonymous.from('beast_director_assignments').select('*')).error, 'anon denied');
assert.ok((await anonymous.rpc('plan_director_reviews', { p_goal_id: goal, p_capabilities: ['health.preparation-review'] })).error, 'anon RPC denied');
console.log('PASS: local PostgreSQL/PostgREST integration: real Supabase adapter, transactional plan/deduplication, dependencies, CAS concurrency, specialist calculation, durable resume, forged evidence rejection, corrections, changed sources, tenant isolation, permission redaction, anonymous denial. Synthetic authorization callback; no real auth or model evaluation.');

// Exercise the actual Next route and shared age/module entitlement checks.
// Only session authentication is a synthetic adapter; all application queries use PostgreSQL.
let activeClient = a;
a.auth.getUser = async () => ({ data: { user: { id: alice } }, error: null });
b.auth.getUser = async () => ({ data: { user: { id: bob } }, error: null });
const originalLoad = Module._load;
const root = fileURLToPath(new URL('../.test-dist/src/', import.meta.url));
Module._load = function(id, ...args) {
  if (id === '@/lib/supabase/server') return { createRouteClient: () => activeClient };
  return originalLoad.call(this, id.startsWith('@/') ? root + id.slice(2) : id, ...args);
};
let route;
try { route = createRequire(import.meta.url)('../.test-dist/src/app/api/director/assignments/route.js'); }
finally { Module._load = originalLoad; }
const post = body => route.POST(new Request('http://localhost/api/director/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const get = id => route.GET(new Request(`http://localhost/api/director/assignments${id ? `?goalId=${id}` : ''}`));
assert.equal((await get()).status, 200);
assert.equal((await get()).headers.get('cache-control'), 'private, no-store');
assert.equal((await route.POST(new Request('http://localhost/api/director/assignments', { method: 'POST', body: '{' }))).status, 400);
assert.equal((await post({ action: 'plan', goalId: goal, capabilities: ['health.preparation-review'] })).status, 200);
assert.equal((await post({ action: 'plan', goalId: goal, capabilities: ['publish'] })).status, 400);
assert.equal((await post({ action: 'deploy', goalId: goal, approved: true })).status, 400);
assert.equal((await post({ action: 'plan', goalId: goal, capabilities: ['health.preparation-review'], ownerId: bob })).status, 200, 'body ownerId cannot change authenticated ownership');
assert.equal((await post({ action: 'resume', goalId: bobGoal })).status, 404);
activeClient = b;
assert.equal((await get(goal)).status, 404);
activeClient = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } };
assert.equal((await get()).status, 401);
assert.equal((await post({ action: 'resume', goalId: goal })).status, 401);
activeClient = a;
for (const suffix of ['3', '4']) {
  const restrictedOwner = `00000000-0000-4000-8000-00000000000${suffix}`;
  const restrictedGoal = `10000000-0000-4000-8000-00000000000${suffix}`;
  const restricted = client(restrictedOwner);
  restricted.auth.getUser = async () => ({ data: { user: { id: restrictedOwner } }, error: null });
  activeClient = restricted;
  assert.equal((await post({ action: 'plan', goalId: restrictedGoal, capabilities: ['health.preparation-review'] })).status, 403, 'minor or disabled module denied by actual route');
  assert.ok((await restricted.rpc('plan_director_reviews', { p_goal_id: restrictedGoal, p_capabilities: ['health.preparation-review'] })).error, 'direct RPC must also enforce module access');
  assert.ok((await restricted.from('beast_director_assignments').insert({ owner_id: restrictedOwner, goal_id: restrictedGoal, capability: 'health.preparation-review' })).error, 'direct table insert cannot bypass module access');
  assert.equal((await restricted.from('beast_director_assignments').select('*').eq('owner_id', restrictedOwner)).data.length, 0, 'stored evidence is hidden after module disablement, including direct REST reads');
}
activeClient = a;
// Verify completion under the actual route, recovering the intentionally invalidated checkpoint.
const correction = await post({ action: 'correction', goalId: goal, assignmentId: health.id });
assert.equal(correction.status, 200);
const response = await post({ action: 'resume', goalId: goal });
assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.outcome.state, 'verified');
const returnedHealth = payload.assignments.find(t => t.id === health.id);
assert.ok(returnedHealth.result, JSON.stringify(returnedHealth));
assert.equal(returnedHealth.result.snapshot, undefined);
const cashResponse = await post({ action: 'resume', goalId: goal });
assert.equal(cashResponse.status, 200);
const cashPayload = await cashResponse.json();
assert.equal(cashPayload.outcome.state, 'verified');
assert.equal(cashPayload.assignments.find(t => t.capability === 'money.cash-review').result.output.currentCash, 1000);
assert.ok(cashPayload.assignments.every(t => t.status === 'verified'));
const completion = await post({ action: 'resume', goalId: goal });
const completionPayload = await completion.json();
assert.equal(completionPayload.outcome.state, 'verified');
assert.match(completionPayload.outcome.detail, /underlying goal is not marked complete/);
assert.equal((await a.from('beast_goals').select('status').eq('id', goal).single()).data.status, 'Active');
console.log('PASS: actual Next assignment routes -> shared module/age entitlement checks -> Supabase JS -> PostgREST -> PostgreSQL -> specialist calculation -> verified response. Synthetic session authentication only; no hosted auth, browser session or paid model evaluation.');
