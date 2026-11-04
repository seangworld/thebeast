import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/private/tmp/beastguide-release-20261102/package.json');
const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await db.exec(await readFile('supabase/migrations/20261103235724_universal_authentication.sql','utf8'));
 await db.exec(`insert into auth.users values('10000000-0000-4000-8000-000000000001',now(),'{"beast_username":"original"}'),('20000000-0000-4000-8000-000000000002',now(),'{"beast_username":"other"}'),('30000000-0000-4000-8000-000000000003',now(),'{}');`);
 const before=(await db.query('select * from beast_identity.usernames order by user_id')).rows;
 await db.exec(await readFile('supabase/migrations/20261104230605_account_setup_username_readback.sql','utf8'));
 await db.exec('set role anon');await assert.rejects(db.query('select public.beast_auth_current_username()'),/permission denied/);await db.exec('reset role;set role authenticated');
 for(const [subject,expected] of [['10000000-0000-4000-8000-000000000001','original'],['20000000-0000-4000-8000-000000000002','other'],['30000000-0000-4000-8000-000000000003',null]]){
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[subject]);assert.equal((await db.query('select public.beast_auth_current_username() as username')).rows[0].username,expected);
 }
 await assert.rejects(db.query('select * from beast_identity.usernames'),/permission denied/);
 await db.exec('reset role');assert.deepEqual((await db.query('select * from beast_identity.usernames order by user_id')).rows,before);
 console.log('PASS: actual PostgreSQL self-read, anonymous/private-registry denial, account isolation, unassigned identity and exact existing-username preservation.');
}finally{await db.close()}
