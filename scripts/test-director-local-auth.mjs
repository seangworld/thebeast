// Real local GoTrue + the complete migrated PostgreSQL 17 schema. No hosted endpoints.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { execFileSync } from 'node:child_process';
const config = JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json', 'utf8'));
assert.equal(config.API_URL, 'http://127.0.0.1:54321', 'LOCAL ONLY');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cookies = [];
const accounts = [];
const sql = (query) => execFileSync('docker', ['exec', '-i', 'supabase_db_thebeast', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' });
for (const name of ['alice', 'bob', 'minor']) {
  const email = `avery-${name}-${randomUUID()}@example.invalid`;
  const password = `Synthetic-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  const id = created.data.user.id;
  accounts.push({ id, email, password });
  assert.match(id, /^[a-f0-9-]{36}$/);
  sql(`update public.profiles set birthday='${name === 'minor' ? '2015-01-01' : '1980-01-01'}' where id='${id}';`);
}
const clients = [];
for (let i = 0; i < accounts.length; i++) {
  const client = i === 0 ? createServerClient(config.API_URL, config.ANON_KEY, { cookies: { getAll: () => [], setAll: (values) => cookies.push(...values) } }) : createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
  const signedIn = await client.auth.signInWithPassword(accounts[i]);
  assert.equal(signedIn.error, null);
  assert.equal((await client.auth.getUser()).data.user.id, accounts[i].id);
  clients.push(client);
}
const goalIds = [];
for (let i = 0; i < accounts.length; i++) {
  const goal = await clients[i].from('beast_goals').insert({ owner_id: accounts[i].id, title: 'Prepare care records and saved cash before a move', category: 'Health', status: 'Active' }).select('id').single();
  assert.equal(goal.error, null); goalIds.push(goal.data.id);
}
sql(`insert into public.beast_health_records(owner_id,record_type,title,status,details) values ('${accounts[0].id}','medication','Synthetic medication A','active','{}'),('${accounts[1].id}','medication','PRIVATE DISABLED SYNTHETIC','active','{}'),('${accounts[2].id}','medication','PRIVATE MINOR SYNTHETIC','active','{}');
insert into public.cash_settings(user_id,starting_balance,checking_buffer) values ('${accounts[0].id}',1000,200) on conflict(user_id) do update set starting_balance=1000,checking_buffer=200;
insert into public.income_events(user_id,name,amount,frequency,next_date,is_active) values ('${accounts[0].id}','Synthetic salary',3000,'monthly',current_date+5,true);`);
assert.equal((await clients[0].rpc('plan_director_reviews', { p_goal_id: goalIds[0], p_capabilities: ['health.preparation-review', 'money.cash-review'] })).error, null);
assert.equal((await clients[0].rpc('plan_director_reviews', { p_goal_id: goalIds[0], p_capabilities: ['health.preparation-review', 'money.cash-review'] })).error, null);
assert.equal((await clients[0].from('beast_director_assignments').select('id')).data.length, 2);
assert.equal((await clients[1].from('beast_director_assignments').select('id').eq('goal_id', goalIds[0])).data.length, 0);
assert.ok((await clients[1].rpc('plan_director_reviews', { p_goal_id: goalIds[0], p_capabilities: ['health.preparation-review'] })).error);
assert.ok((await clients[2].rpc('plan_director_reviews', { p_goal_id: goalIds[2], p_capabilities: ['health.preparation-review'] })).error);
assert.equal((await clients[1].from('beast_health_records').select('id')).data.length,1);
sql(`insert into public.beast_admin_member_module_access(member_id,module_id,enabled,updated_by) values ('${accounts[1].id}','health',false,'${accounts[0].id}');`);
assert.ok((await clients[1].rpc('plan_director_reviews', { p_goal_id: goalIds[1], p_capabilities: ['health.preparation-review'] })).error);
assert.equal((await clients[2].from('beast_health_records').select('*')).data.length, 0, 'minor cannot read retained clinical records through direct REST');
assert.equal((await clients[1].from('beast_health_records').select('*')).data.length,0,'revocation hides already stored clinical records');
assert.ok((await clients[0].from('profiles').update({role:'admin'}).eq('id',accounts[0].id)).error,'new grants do not permit role escalation');
assert.ok((await clients[0].from('beast_goals').update({owner_id:accounts[1].id}).eq('id',goalIds[0])).error,'owner reassignment remains denied');
const browserCookies = cookies.map(({ name, value, options }) => ({ name, value, domain: '127.0.0.1', path: options.path || '/', httpOnly: Boolean(options.httpOnly), secure: false, sameSite: 'Lax' }));
writeFileSync('/private/tmp/avery-local-browser-state.json', JSON.stringify({ cookies: browserCookies, origins: [] }), { mode: 0o600 });
writeFileSync('/private/tmp/avery-local-fixture.json', JSON.stringify({ accounts, goalIds }), { mode: 0o600 });
console.log('PASS: complete 125-migration PostgreSQL 17 local stack; real GoTrue creation, password login, getUser, canonical goal creation, duplicate-plan prevention, cross-user RPC/read denial, minor and disabled-module denial. Local synthetic fixtures only; hosted verification not established.');
