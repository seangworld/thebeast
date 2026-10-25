// Offline PostgreSQL fixtures. Use an existing PGlite installation; no downloads.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const modulePath=process.env.AGENCY_PGLITE_MODULE;
if(!modulePath)throw Error('Set AGENCY_PGLITE_MODULE to an existing @electric-sql/pglite module.');
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const owner='00000000-0000-4000-8000-000000000001',profile='00000000-0000-4000-8000-000000000002';
await db.exec(`create schema auth; create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table public.beast_marketing_presenter_profiles(id uuid,owner_id uuid,name text,presenter_type text,visual_identity jsonb,disclosure_rules text[],updated_at timestamptz,unique(id,owner_id));create table public.beast_marketing_agency_posts(id uuid primary key);insert into auth.users values('${owner}');insert into public.beast_marketing_presenter_profiles(id,owner_id) values('${profile}','${owner}');create table public.beast_marketing_agency_bindings(owner_id uuid,presenter_profile_id uuid,expected_username text,channel text);`);
await db.exec(readFileSync('supabase/migrations/20261025174755_cole_daily_approval_workflow.sql','utf8'));
await db.query(`insert into agency_cole_daily_controls(owner_id,presenter_profile_id,enabled,paused)values($1,$2,true,false)`,[owner,profile]);
async function job(day){return (await db.query(`insert into agency_cole_daily_jobs(owner_id,local_day,control_epoch,theme,caption)values($1,$2,0,'Fitness','Private caption')returning id`,[owner,day])).rows[0].id;}
const a=await job('2026-10-25'),b=await job('2026-10-26'),c=await job('2026-10-27');
async function reserve(id,cost){return (await db.query('select agency_cole_reserve($1,$2,$3,$4,$5) as id',[owner,id,cost,'synthetic-model','synthetic-pricing'])).rows[0].id;}
const outcomes=await Promise.allSettled([reserve(a,6000000),reserve(b,6000000)]);
assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.match(outcomes.find(x=>x.status==='rejected').reason.message,/budget_exhausted/);
const rid=outcomes.find(x=>x.status==='fulfilled').value;
await assert.rejects(reserve(a,1),/duplicate key/);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid])).rows[0].ok,true);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid])).rows[0].ok,false);
await assert.rejects(reserve(c,1),/spending_unresolved/);
await db.query('select agency_cole_settle($1,$2,$3)',[owner,rid,150000]);
const rid2=await reserve(b,1000000);
await db.query('update agency_cole_daily_controls set paused=true,epoch=epoch+1 where owner_id=$1',[owner]);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid2])).rows[0].ok,false);
await db.query('update agency_cole_daily_controls set paused=false where owner_id=$1',[owner]);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid2])).rows[0].ok,false,'pause/resume must invalidate old job epoch');
await db.query('update agency_cole_daily_jobs set control_epoch=1 where id=$1',[b]);
await db.query("update agency_cole_ai_reservations set month='2000-01' where id=$1",[rid2]);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid2])).rows[0].ok,false,'old-month reservation cannot dispatch in new month');
await db.query("update agency_cole_ai_reservations set month=to_char(now() at time zone 'America/New_York','YYYY-MM') where id=$1",[rid2]);
assert.equal((await db.query('select agency_cole_dispatch($1,$2) as ok',[owner,rid2])).rows[0].ok,true);
await db.query('select agency_cole_settle($1,$2,$3)',[owner,rid2,null]);
assert.equal((await db.query('select state from agency_cole_ai_reservations where id=$1',[rid2])).rows[0].state,'uncertain');
assert.equal((await db.query('select paused from agency_cole_daily_controls where owner_id=$1',[owner])).rows[0].paused,true);
await db.query('update agency_cole_daily_controls set paused=false where owner_id=$1',[owner]);
await db.query('update agency_cole_daily_jobs set control_epoch=(select epoch from agency_cole_daily_controls where owner_id=$1) where id=$2',[owner,c]);
await assert.rejects(reserve(c,1),/spending_unresolved/);
for(const table of ['agency_cole_daily_controls','agency_cole_daily_jobs','agency_cole_ai_reservations']){
 const row=(await db.query("select relrowsecurity,has_table_privilege('anon',$1,'select') as anon_read,has_table_privilege('authenticated',$1,'insert') as member_write from pg_class where oid=$1::regclass",[table])).rows[0];assert.equal(row.relrowsecurity,true);assert.equal(row.anon_read,false);assert.equal(row.member_write,false);
}
assert.equal((await db.query("select has_function_privilege('authenticated','public.agency_cole_reserve(uuid,uuid,bigint,text,text)','execute') as allowed")).rows[0].allowed,false);
await assert.rejects(job('2026-10-25'),/duplicate key/);
await assert.rejects(db.query("update agency_cole_daily_controls set mode='unattended' where owner_id=$1",[owner]),/check constraint/);
await db.close();console.log('PASS: budget serialization, duplicate reservation/day, settlement, unknown usage, pause epoch, month rollover, RLS/grants, approval-only mode. Offline synthetic PostgreSQL; no paid/provider calls.');
