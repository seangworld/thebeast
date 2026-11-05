import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();
const a='10000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000002',c='30000000-0000-4000-8000-000000000003';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz,last_sign_in_at timestamptz,created_at timestamptz default now(),raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');`);
 await db.exec(`create table public.profiles(id uuid primary key,role text);
 create schema extensions;create function extensions.hmac(text,text,text) returns bytea language sql as $$select decode(repeat('a',64),'hex')$$;
 create schema vault;create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
 create schema net;create table net.wake_requests(url text,body jsonb,headers jsonb,timeout_milliseconds integer);
 create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin
 if current_setting('test.net.fail',true)='true' then raise exception 'fixture network failure'; end if;
 insert into net.wake_requests values(url,body,headers,timeout_milliseconds);return 1;end$$;`);
 await db.exec(await readFile('supabase/migrations/20261103235724_universal_authentication.sql','utf8'));
 await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'existing@example.test',now(),'{\"beast_username\":\"existing\"}')",[a]);const before=(await db.query('select * from beast_identity.usernames')).rows;const accountsBefore=(await db.query('select * from auth.users')).rows;await db.query("insert into public.profiles values($1,'admin')",[a]);
 await db.exec(await readFile('supabase/migrations/20261105031457_canonical_username_mail.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261105205657_account_mail_configured_owner_recipient.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261105213413_account_mail_recipient_return_type.sql','utf8'));
 assert.equal((await db.query('select count(*)::int n from beast_identity.account_mail_outbox')).rows[0].n,0);assert.deepEqual((await db.query('select * from auth.users')).rows,accountsBefore);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query("select public.beast_account_mail_queue_recovery('existing@example.test')"),/permission denied/);await assert.rejects(db.query('select public.beast_account_mail_claim()'),/permission denied/);await assert.rejects(db.query('select * from beast_identity.account_mail_outbox'),/permission denied/);await db.exec('reset role');}
 await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'new@example.test','{\"beast_username\":\"chosen_name\"}')",[b]);
 await db.exec('set role service_role');assert.equal((await db.query("select public.beast_account_mail_queue_recovery('new@example.test') id")).rows[0].id,null);assert.equal((await db.query('select * from public.beast_account_mail_claim($1,$2)',[b,'username_assigned'])).rows.length,0);await db.exec('reset role');
 await db.query('update auth.users set email_confirmed_at=now(),raw_user_meta_data=$2 where id=$1',[b,{beast_username:'forged_metadata'}]);
 await db.exec('set role service_role');let mail=(await db.query('select * from public.beast_account_mail_claim($1,$2)',[b,'username_assigned'])).rows[0];assert.equal(mail.username,'chosen_name');assert.equal(mail.recipient,'new@example.test');assert.equal((await db.query('select * from public.beast_account_mail_claim($1,$2)',[b,'username_assigned'])).rows.length,0);
 assert.equal((await db.query('select public.beast_account_mail_finish($1,$2,true) ok',[mail.mail_id,a])).rows[0].ok,false);assert.equal((await db.query('select public.beast_account_mail_finish($1,$2,true) ok',[mail.mail_id,mail.delivery_token])).rows[0].ok,true);
 assert.equal((await db.query("select public.beast_account_mail_queue_recovery('unknown@example.test') id")).rows[0].id,null);
 for(let i=0;i<2;i++)await db.query("select public.beast_account_mail_queue_recovery('existing@example.test',$1)",['/account-setup?app=beastguide&next=library']);
 mail=(await db.query('select * from public.beast_account_mail_claim($1,$2)',[a,'username_recovery'])).rows[0];assert.equal(mail.username,'existing');assert.equal(mail.return_path,'/account-setup?app=beastguide&next=library');assert.equal((await db.query('select * from public.beast_account_mail_claim($1,$2)',[a,'username_recovery'])).rows.length,0);
 await db.query('select public.beast_account_mail_finish($1,$2,false)',[mail.mail_id,mail.delivery_token]);assert.equal((await db.query('select * from public.beast_account_mail_claim($1,$2)',[a,'username_recovery'])).rows.length,0);
 await db.exec('reset role');await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'without@example.test',now())",[c]);await db.exec('set role service_role');await db.query("select public.beast_account_mail_queue_recovery('without@example.test','https://evil.test')");mail=(await db.query('select * from public.beast_account_mail_claim($1,$2)',[c,'username_recovery'])).rows[0];assert.equal(mail.username,null);assert.equal(mail.return_path,'/dashboard/settings/profile#account-username');await db.exec('reset role');
 assert.deepEqual((await db.query('select * from beast_identity.usernames where user_id=$1',[a])).rows,before);
 await db.query("update beast_identity.account_mail_outbox set leased_at=now()-interval '6 minutes' where id=$1",[mail.mail_id]);await db.exec('set role service_role');assert.equal((await db.query('select * from public.beast_account_mail_claim($1,$2)',[c,'username_recovery'])).rows.length,0);await db.exec('reset role');assert.equal((await db.query('select state from beast_identity.account_mail_outbox where id=$1',[mail.mail_id])).rows[0].state,'uncertain');
 for(let i=4;i<=7;i++)await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)",['40000000-0000-4000-8000-'+String(i).padStart(12,'0'),'fixture'+i+'@example.test',{beast_username:'fixture'+i}]);
 await db.exec('set role service_role');let dispatched=0;for(let i=0;i<4;i++)dispatched+=(await db.query('select * from public.beast_account_mail_claim()')).rows.length;assert.equal(dispatched,3);await db.exec('reset role');
 await db.exec("update beast_identity.account_mail_outbox set leased_at=now()-interval '2 hours' where leased_at is not null");
 const count=Number((await db.query("select count(*) n from beast_identity.account_mail_outbox where leased_at>now()-interval '1 day'")).rows[0].n);
 for(let i=count;i<20;i++)await db.query("insert into beast_identity.account_mail_outbox(user_id,kind,dedupe_key,state,leased_at) values($1,'username_recovery',$2,'sent',now()-interval '2 hours')",[a,'day-cap-fixture:'+i]);
 await db.exec('set role service_role');assert.equal((await db.query('select * from public.beast_account_mail_claim()')).rows.length,0);await db.exec('reset role');
 console.log('PASS: real local PostgreSQL service-only recovery, verified recipients, no metadata authority, no backfill, exact username preservation, deduplication, delivery ownership, setup instructions and ambiguous-delivery hold.');
}finally{await db.close()}
