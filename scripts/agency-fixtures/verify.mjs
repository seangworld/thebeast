import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// Reuse PR259's retained isolated pglite lock/runtime; never a production test database.
const {PGlite}=await import(pathToFileURL(process.env.AGENCY_SQL_RUNTIME||'/private/tmp/cole-sql-fixtures/node_modules/@electric-sql/pglite/dist/index.js'));
const db=new PGlite();let checks=0;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',p='33333333-3333-4333-8333-333333333333',q='44444444-4444-4444-8444-444444444444',c='55555555-5555-4555-8555-555555555555';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table public.beast_marketing_presenter_profiles(id uuid primary key,owner_id uuid references auth.users(id),unique(id,owner_id));create table public.beast_marketing_social_connections(id uuid primary key,owner_id uuid references auth.users(id),unique(id,owner_id));insert into auth.users values('${a}'),('${b}');insert into beast_marketing_presenter_profiles values('${p}','${a}'),('${q}','${b}');insert into beast_marketing_social_connections values('${c}','${a}');`);
for(const file of ['20261012040132_agency_social_bindings.sql','20261023190000_cole_agency_manual_workflow.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
async function rejects(sql){await assert.rejects(()=>db.exec(sql));checks++;}
for(const role of ['anon','authenticated']){
 await db.exec(`set role ${role}`);
 for(const table of ['beast_marketing_agency_bindings','beast_marketing_agency_posts']){
  await rejects(`select * from ${table}`);await rejects(`delete from ${table}`);await rejects(`update ${table} set owner_id='${a}'`);
  await rejects(table.endsWith('bindings')?`insert into ${table}(owner_id,presenter_profile_id,connection_id,channel) values('${a}','${p}','${c}','instagram')`:`insert into ${table}(id,owner_id,presenter_profile_id,content,content_hash,profile_hash) values(gen_random_uuid(),'${a}','${p}','{}','hash','brand')`);
 }
 await db.exec('reset role');
}
await db.exec('set role service_role');
await db.exec(`insert into beast_marketing_agency_bindings(owner_id,presenter_profile_id,connection_id,channel,expected_account_id) values('${a}','${p}','${c}','instagram','123')`);checks++;
await rejects(`insert into beast_marketing_agency_bindings(owner_id,presenter_profile_id,connection_id,channel) values('${a}','${q}','${c}','instagram')`);
const insert=`insert into beast_marketing_agency_posts(id,owner_id,presenter_profile_id,content,content_hash,profile_hash) values(gen_random_uuid(),'${a}','${p}','{}','same-creative','brand')`;
await db.exec(insert);checks++;await rejects(insert);
await rejects(`insert into beast_marketing_agency_posts(id,owner_id,presenter_profile_id,content,content_hash,profile_hash) values(gen_random_uuid(),'${a}','${q}','{}','other','brand')`);
await rejects(`update beast_marketing_agency_posts set status='published' where owner_id='${a}'`);
const first=await db.query(`update beast_marketing_agency_posts set status='publishing' where owner_id='${a}' and revision=1 and status='draft' returning id`);const second=await db.query(`update beast_marketing_agency_posts set status='publishing' where owner_id='${a}' and revision=1 and status='draft' returning id`);assert.equal(first.rows.length,1);assert.equal(second.rows.length,0);checks++;
await db.exec(`update beast_marketing_agency_posts set status='publishing',unknown_stage='publish' where owner_id='${a}'`);
let abandoned=await db.query(`update beast_marketing_agency_posts set status='failed' where owner_id='${a}' and status='publishing' and unknown_stage='prepare' returning id`);assert.equal(abandoned.rows.length,0);checks++;
await db.exec(`update beast_marketing_agency_posts set status='publishing',unknown_stage='prepare' where owner_id='${a}'`);
abandoned=await db.query(`update beast_marketing_agency_posts set status='failed' where owner_id='${a}' and status='publishing' and unknown_stage='prepare' returning id`);assert.equal(abandoned.rows.length,1);checks++;
const afterAbandon=await db.query(`update beast_marketing_agency_posts set unknown_stage='publish' where owner_id='${a}' and status='publishing' returning id`);assert.equal(afterAbandon.rows.length,0);checks++;
await db.exec('reset role');
await db.exec(`insert into beast_marketing_presenter_profiles values('66666666-6666-4666-8666-666666666666','${a}');insert into beast_marketing_social_connections values('77777777-7777-4777-8777-777777777777','${a}')`);
await db.exec('set role service_role');
await rejects(`insert into beast_marketing_agency_bindings(owner_id,presenter_profile_id,connection_id,channel,expected_account_id) values('${a}','66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777','instagram','123')`);
await db.exec('reset role');
const rls=await db.query("select relname,relrowsecurity from pg_class where relname in ('beast_marketing_agency_bindings','beast_marketing_agency_posts')");assert.ok(rls.rows.every(r=>r.relrowsecurity));checks++;
console.log(JSON.stringify({scope:'isolated synthetic local PostgreSQL mechanics only',checks,result:'passed',livePublishing:false,paidCalls:0},null,2));await db.close();
