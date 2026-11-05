// Real isolated PostgreSQL; Vault/pg_net transport stubs never contact any network.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const owner='10000000-0000-4000-8000-000000000001';
const member='20000000-0000-4000-8000-000000000002';
const unassigned='30000000-0000-4000-8000-000000000003';
const guide='40000000-0000-4000-8000-000000000004';
const failed='50000000-0000-4000-8000-000000000005';
const queueFailed='60000000-0000-4000-8000-000000000006';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz,last_sign_in_at timestamptz,created_at timestamptz default now(),raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
 create table public.profiles(id uuid primary key,role text);
 create schema extensions;create function extensions.hmac(text,text,text) returns bytea language sql as $$select decode(repeat('a',64),'hex')$$;
 create schema vault;create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
 create schema net;create table net.wake_requests(url text,body jsonb,headers jsonb,timeout_milliseconds integer);
 grant usage on schema net to anon,authenticated;grant select on net.wake_requests to anon,authenticated;
 create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin
 if current_setting('test.net.fail',true)='true' then raise exception 'fixture network failure';end if;
 insert into net.wake_requests values(url,body,headers,timeout_milliseconds);return 1;end$$;`);
 await db.exec(await readFile('supabase/migrations/20261103235724_universal_authentication.sql','utf8'));
 await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'owner@example.test',now(),'{\"beast_username\":\"original_owner\"}')",[owner]);
 await db.query("insert into profiles values($1,'user')",[owner]);
 const accounts=(await db.query('select * from auth.users order by id')).rows;
 const mappings=(await db.query('select * from beast_identity.usernames order by user_id')).rows;
 const profiles=(await db.query('select * from profiles order by id')).rows;
 await db.exec(await readFile('supabase/migrations/20261105031457_canonical_username_mail.sql','utf8'));
 const originalClaim=(await db.query("select pg_get_functiondef('public.beast_account_mail_claim(uuid,text,text)'::regprocedure) definition,proacl::text privileges from pg_proc where oid='public.beast_account_mail_claim(uuid,text,text)'::regprocedure")).rows[0];
 const correction=await readFile('supabase/migrations/20261105205657_account_mail_configured_owner_recipient.sql','utf8');
 await db.exec(correction);
 const correctedClaim=(await db.query("select pg_get_functiondef('public.beast_account_mail_claim(uuid,text,text)'::regprocedure) definition,proacl::text privileges from pg_proc where oid='public.beast_account_mail_claim(uuid,text,text)'::regprocedure")).rows[0];
 assert.equal(correctedClaim.privileges,originalClaim.privileges,'CREATE OR REPLACE preserves exact service-only grants');
 const normalize=s=>s.replace('-- Recipient is server configuration, AND must be a current verified canonical admin.','-- Service-only caller supplies the private owner-approved server configuration.\n -- Receiving a notice grants no administrative permissions.').replace('from auth.users u join public.profiles p on p.id=u.id','from auth.users u').replace(" and p.role='admin'",'');
 assert.equal(correctedClaim.definition,normalize(originalClaim.definition),'only configured recipient role dependency changes; leases/caps/dedupe/claim logic identical');

 assert.deepEqual((await db.query('select * from auth.users order by id')).rows,accounts);
 assert.deepEqual((await db.query('select * from profiles order by id')).rows,profiles);
 assert.deepEqual((await db.query('select * from beast_identity.usernames order by user_id')).rows,mappings);
 assert.equal((await db.query('select count(*)::int n from beast_identity.account_mail_outbox')).rows[0].n,0);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  for(const sql of ["select public.beast_account_mail_claim(null,null,'owner@example.test')","select * from beast_identity.account_mail_outbox","select beast_identity.dispatch_account_mail()","select * from vault.decrypted_secrets"]){await assert.rejects(db.query(sql),e=>e.code==='42501');}
  await db.exec('reset role');
 }
 await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'registered@example.test','{\"beast_username\":\"selected_name\",\"origin_app\":\"forged_app\"}')",[member]);
 let queued=(await db.query("select * from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[member])).rows;
 assert.equal(queued.length,1);assert.equal(queued[0].dedupe_key,'registration:'+member);assert.equal(queued[0].registration_email,'registered@example.test');assert.equal(queued[0].verified_at_creation,false);
 assert.equal((await db.query('select email_confirmed_at from auth.users where id=$1',[member])).rows[0].email_confirmed_at,null);
 assert.equal((await db.query('select count(*)::int n from net.wake_requests')).rows[0].n,0,'wake-up is off without separately approved Vault binding');
 await db.exec('set role service_role');
 assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','attacker@example.test')",[member])).rows.length,0);
 let notice=(await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','owner@example.test')",[member])).rows[0];
 assert.equal(notice.recipient,'owner@example.test');assert.equal(notice.registration_email,'registered@example.test');assert.equal(notice.verified_at_creation,false);assert.equal(notice.username,null);
 assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'username_assigned')",[member])).rows.length,0,'member informational mail still waits for verified email');
 await db.query('select public.beast_account_mail_finish($1,$2,true)',[notice.mail_id,notice.delivery_token]);
 await db.exec('reset role');
 await db.query('update auth.users set email_confirmed_at=now(),last_sign_in_at=now(),email=$2 where id=$1',[member,'updated@example.test']);
 await db.query("insert into auth.users(id,email) values($1,'setup@example.test')",[unassigned]);
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[unassigned]);
 await db.exec('set role service_role');await db.query("select public.beast_auth_claim('later_selected',$1)",[unassigned]);await db.exec('reset role');
 assert.equal((await db.query("select count(*)::int n from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[member])).rows[0].n,1,'verification/login/email changes cannot create another registration notice');
 assert.equal((await db.query("select count(*)::int n from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[unassigned])).rows[0].n,1,'later username claim cannot duplicate the account-created event');
 assert.equal((await db.query("select registration_email from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[member])).rows[0].registration_email,'registered@example.test','registration snapshot does not change with account email');
 await db.exec('set role service_role');assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','owner@example.test')",[member])).rows.length,0);await db.exec('reset role');
 await db.query("insert into vault.decrypted_secrets values('beast_account_mail_dispatch_secret','too-short')");
 assert.equal((await db.query('select beast_identity.dispatch_account_mail() as request')).rows[0].request,null,'weak dedicated binding cannot dispatch');
 assert.equal((await db.query('select count(*)::int n from net.wake_requests')).rows[0].n,0);
 await db.query("update vault.decrypted_secrets set decrypted_secret='fixture-only-dedicated-account-mail-dispatch-secretxxxxxxxxxxxxxxxxxxxx'");
 await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'guide@example.test','{\"beast_app\":\"beastguide\"}')",[guide]);
 let wake=(await db.query('select * from net.wake_requests')).rows;
 assert.ok(wake.length>0);for(const request of wake){assert.equal(request.url,'https://thebeast.seangworld.com/api/cron/account-mail');assert.deepEqual(request.body,{});assert.equal(request.headers.Authorization,undefined);assert.equal(request.headers['x-beast-mail-signature'],'a'.repeat(64));assert.match(request.headers['x-beast-mail-time'],/^\d+$/);assert.match(request.headers['x-beast-mail-nonce'],/^[a-f0-9-]{36}$/);assert.ok(!JSON.stringify(request).includes('fixture-only-dedicated-account-mail-dispatch-secretxxxxxxxxxxxxxxxxxxxx'));assert.equal(request.timeout_milliseconds,2000);}
 assert.equal((await db.query("select count(*)::int n from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[guide])).rows[0].n,1,'Guide/future apps are covered by the central Auth insert, not per-app login code');
 await db.exec('set role authenticated');assert.ok((await db.query('select * from net.wake_requests')).rows.length>0,'simulate existing queue readability without exposing reusable secrets or account payload');await db.exec('reset role');
 const wakeCount=wake.length;await db.exec('begin');await db.query("insert into auth.users(id,email) values('70000000-0000-4000-8000-000000000007','rollback@example.test')");await db.exec('rollback');
 assert.equal((await db.query('select count(*)::int n from net.wake_requests')).rows[0].n,wakeCount,'rolled-back transactions do not retain a wake-up');
 await db.query("select set_config('test.net.fail','true',false)");await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'failure@example.test','{\"beast_username\":\"failure_user\"}')",[failed]);
 assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[failed])).rows[0].n,1);
 assert.equal((await db.query("select state from beast_identity.account_mail_outbox where user_id=$1 and kind='owner_registration'",[failed])).rows[0].state,'pending','network failure retains the durable event');
 await db.query("select set_config('test.net.fail','false',false)");
 await db.query("insert into profiles values($1,'user')",[member]);
 // No configured address, unknown/unverified/deleted/banned/disabled destinations fail closed.
 await db.exec('set role service_role');
 for(const email of [null,'attacker@example.test'])assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'owner_registration',$2)",[failed,email])).rows.length,0);
 await db.exec('reset role');
 const recipientSnapshot=(await db.query('select * from auth.users where id=$1',[owner])).rows[0];
 for(const update of ["email_confirmed_at=null","deleted_at=now()","banned_until=now()+interval '1 day'","raw_app_meta_data='{\"is_disabled\":true}'","raw_app_meta_data='{\"account_status\":\"disabled\"}'"]){
  await db.query('update auth.users set '+update+' where id=$1',[owner]);
  await db.exec('set role service_role');
  assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','owner@example.test')",[failed])).rows.length,0,'invalid configured owner must not claim a notification');
  await db.exec('reset role');
  await db.query('update auth.users set email_confirmed_at=$2,deleted_at=$3,banned_until=$4,raw_app_meta_data=$5 where id=$1',[owner,recipientSnapshot.email_confirmed_at,recipientSnapshot.deleted_at,recipientSnapshot.banned_until,JSON.stringify(recipientSnapshot.raw_app_meta_data)]);
 }
 await db.exec('set role service_role');
 notice=(await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','owner@example.test')",[failed])).rows[0];await db.query('select public.beast_account_mail_finish($1,$2,false)',[notice.mail_id,notice.delivery_token]);assert.equal((await db.query("select * from public.beast_account_mail_claim($1,'owner_registration','owner@example.test')",[failed])).rows.length,0,'ambiguous SMTP failure never blindly resends');await db.exec('reset role');
 await db.exec(`alter table beast_identity.account_mail_outbox add constraint fixture_queue_failure check(user_id<>'${queueFailed}'::uuid)`);
 await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'queue-failure@example.test','{\"beast_username\":\"queue_failure\"}')",[queueFailed]);
 assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[queueFailed])).rows[0].n,1,'outbox failure does not reject registration');
 assert.equal((await db.query('select username from beast_identity.usernames where user_id=$1',[queueFailed])).rows[0].username,'queue_failure','mail failure cannot undo the canonical username');
 assert.deepEqual((await db.query('select * from beast_identity.usernames where user_id=$1',[owner])).rows,mappings);
 assert.deepEqual((await db.query('select * from profiles where id=$1',[owner])).rows,profiles);
 const beforeRollback=(await db.query("select (select jsonb_agg(to_jsonb(t) order by id) from auth.users t) users,(select jsonb_agg(to_jsonb(t) order by id) from profiles t) profiles,(select jsonb_agg(to_jsonb(t) order by id) from beast_identity.account_mail_outbox t) outbox")).rows;
 await db.exec(await readFile('supabase/operations/account-mail-recipient-policy-rollback.sql','utf8'));
 assert.equal((await db.query("select pg_get_functiondef('public.beast_account_mail_claim(uuid,text,text)'::regprocedure) definition")).rows[0].definition,originalClaim.definition,'rollback restores only the exact prior claim function');
 assert.deepEqual((await db.query("select (select jsonb_agg(to_jsonb(t) order by id) from auth.users t) users,(select jsonb_agg(to_jsonb(t) order by id) from profiles t) profiles,(select jsonb_agg(to_jsonb(t) order by id) from beast_identity.account_mail_outbox t) outbox")).rows,beforeRollback,'rollback preserves accounts, roles and all delivery receipts');
 console.log('PASS: canonical Auth creation before verification, all-app trigger, no backfill, UUID deduplication, no verification/login/claim duplicates, private verified active non-admin recipient, invalid-recipient rejection, unchanged grants and roles, fixed payload-free wake-up, rollback and failure isolation, immutable existing records.');
}finally{await db.close()}
