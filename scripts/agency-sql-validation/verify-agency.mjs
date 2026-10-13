import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=resolve(process.argv[2] || fileURLToPath(new URL('../../', import.meta.url)));
const db = new PGlite();
const results=[]; const hashes={};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const A=id(1),B=id(2),U=id(3),P=id(10),P2=id(11),PB=id(12),C=id(20),C2=id(21),CB=id(22),S=id(30),V=id(40),CON=id(50);
const q=(sql,params=[])=>db.query(sql,params);
const scalar=async(sql,params=[])=>(await q(sql,params)).rows[0]?.value;
async function test(name, fn){try {await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:e.message});console.error('FAIL',name,e.message);}}
async function reject(sql, params=[], pattern=/.+/){await assert.rejects(q(sql,params),pattern);}
async function as(role, actor, fn){await db.exec(`set role ${role}`);await q("select set_config('request.jwt.claim.sub',$1,false)",[actor||'']);try{return await fn();}finally{await db.exec('reset role');}}
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to public; grant execute on function auth.uid() to public;
create table public.profiles(id uuid primary key references auth.users,role text not null); grant select on public.profiles to authenticated;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
const migrations=['20260823161535_add_beast_marketing_foundation.sql','20260823185623_add_beast_marketing_preview_distribution.sql','20260831150054_add_beast_marketing_video_control_plane.sql','20260909214424_add_marketing_growth_cycles.sql','20260921140008_beast_marketing_social.sql','20261012040132_agency_social_bindings.sql','20261012120000_agency_review_only_planning.sql'];
for(const f of migrations){const sql=readFileSync(resolve(root,'supabase/migrations',f),'utf8');hashes[f]=createHash('sha256').update(sql).digest('hex');await db.exec(sql);}
await test('Both candidate migrations apply unchanged to actual predecessor schema',async()=>assert.equal(await scalar("select count(*)::integer value from pg_tables where tablename like 'beast_marketing_agency_%'"),2));
await q('insert into auth.users values ($1),($2),($3)',[A,B,U]);await q("insert into profiles values ($1,'admin'),($2,'admin'),($3,'user')",[A,B,U]);
for(const [p,a] of [[P,A],[P2,A],[PB,B]]) await q("insert into beast_marketing_presenter_profiles(id,owner_id,name,presenter_type) values($1,$2,'Synthetic fixture','future_character')",[p,a]);
for(const [c,a] of [[C,A],[C2,A],[CB,B]]) await q("insert into beast_marketing_campaigns(id,owner_id,title,objective,audience,offer,call_to_action) values($1,$2,'Fixture','Fixture','Fixture','Fixture','Fixture')",[c,a]);
await q("insert into beast_marketing_video_series(id,owner_id,name) values($1,$2,'Fixture')",[S,A]);
const link=(p=P,c=C,s=S)=>scalar('select link_beast_marketing_agency_workstream($1,$2,$3) value',[p,c,s]);
let stream,plan;
await test('Anonymous cannot execute link RPC',()=>as('anon',null,()=>reject('select link_beast_marketing_agency_workstream($1,$2,$3)',[P,C,S],/permission denied/)));
await test('Non-admin cannot execute an authorized link',()=>as('authenticated',U,()=>reject('select link_beast_marketing_agency_workstream($1,$2,$3)',[P,C,S],/Owner access required/)));
await test('Admin cannot link another owner character',()=>as('authenticated',B,()=>reject('select link_beast_marketing_agency_workstream($1,$2,$3)',[P,C,S],/inactive owned character/)));
await test('Owner links fresh inactive character and disabled series',async()=>{stream=await as('authenticated',A,()=>link());assert.equal(stream.owner_id,A);assert.equal(stream.mode,'review_only');assert.equal((await scalar('select settings value from beast_marketing_video_series where id=$1',[S])).publishingEnabled,false);});
await test('Identical link retry has stable identity',async()=>assert.equal((await as('authenticated',A,()=>link())).id,stream.id));
await test('Conflicting character retry is rejected',()=>as('authenticated',A,()=>reject('select link_beast_marketing_agency_workstream($1,$2,$3)',[P2,C,S],/different private workstream/)));
await test('Other admin RLS cannot see owner workstream',()=>as('authenticated',B,async()=>assert.equal(await scalar('select count(*)::integer value from beast_marketing_agency_workstreams'),0)));
await test('Owner RLS can see own workstream',()=>as('authenticated',A,async()=>assert.equal(await scalar('select count(*)::integer value from beast_marketing_agency_workstreams'),1)));
await test('Owner cannot insert workstream directly',()=>as('authenticated',A,()=>reject('insert into beast_marketing_agency_workstreams(owner_id,presenter_profile_id,campaign_id) values($1,$2,$3)',[A,P2,C2],/permission denied/)));
await test('Service role cannot execute owner RPC or write workstreams',()=>as('service_role',A,async()=>{await reject('select link_beast_marketing_agency_workstream($1,$2,$3)',[P,C,S],/permission denied/);await reject('delete from beast_marketing_agency_workstreams where id=$1',[stream.id],/permission denied/);}));
await test('Authenticated clients cannot read private social bindings',()=>as('authenticated',A,()=>reject('select * from beast_marketing_agency_bindings',[],/permission denied/)));
const variantSQL="insert into beast_marketing_ad_variants(id,campaign_id,owner_id,placement_profile_id,platform,placement,call_to_action,destination_url,source_facts,revision_hash,status) values($1,$2,$3,'instagram_story_reel','instagram','story','Learn','https://example.com','[\"synthetic\"]','fnv1a32:12345678',$4)";
await test('Private creative cannot be inserted preapproved',()=>reject(variantSQL,[V,C,A,'approved'],/start unapproved/));
await q(variantSQL,[V,C,A,'draft']);
const queue=(over={})=>{const x={stream:stream.id,p:P,v:V,rev:1,hash:'fnv1a32:12345678',channel:'instagram',date:'2027-01-01T12:00:00Z',tz:'UTC',notes:'fixture',connection:null,...over};return scalar('select queue_beast_marketing_agency_plan($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) value',Object.values(x));};
await test('Unapproved creative cannot be planned',()=>as('authenticated',A,()=>assert.rejects(queue(),/Exact current creative approval/)));
await as('authenticated',A,()=>q("select record_beast_marketing_ad_decision($1,1,'fnv1a32:12345678','approve','synthetic')",[V]));
await test('Other admin cannot plan owner creative',()=>as('authenticated',B,()=>assert.rejects(queue(),/Owned character workstream/)));
await test('Exact approved revision creates review-only ready plan',async()=>{plan=await as('authenticated',A,()=>queue());assert.equal(plan.status,'ready');assert.equal(plan.handoff_payload,null);assert.equal(plan.exported_at,null);});
await test('Exact slot retry is idempotent and offset-equivalent instant',async()=>assert.equal((await as('authenticated',A,()=>queue({date:'2027-01-01T13:00:00+01:00'}))).id,plan.id));
for(const [label,over,pat] of [['notes',{notes:'changed'},/Retry payload/],['timezone',{tz:'Europe/London'},/Retry payload/],['stale revision',{rev:2},/Exact current/],['stale hash',{hash:'fnv1a32:87654321'},/Exact current/],['Facebook',{channel:'facebook_page'},/Valid exact/],['invalid timezone',{tz:'invalid'},/Valid exact/],['infinite date',{date:'infinity'},/Valid exact/]]) await test(`Queue rejects ${label}`,()=>as('authenticated',A,()=>assert.rejects(queue(over),pat)));
await test('Export/handoff is rejected even through direct plan update',()=>as('authenticated',A,()=>reject("update beast_marketing_distribution_plans set status='exported',handoff_payload='{}',exported_at=now() where id=$1",[plan.id],/cannot export or publish/)));
await test('Plan identity cannot be changed or detached',()=>as('authenticated',A,async()=>{await reject("update beast_marketing_distribution_plans set owner_notes='changed' where id=$1",[plan.id],/identity is immutable/);await reject('update beast_marketing_distribution_plans set agency_workstream_id=null where id=$1',[plan.id],/cannot move/);}));
await test('Cancelled slot retry never reactivates it',async()=>{await as('authenticated',A,()=>q("update beast_marketing_distribution_plans set status='cancelled' where id=$1",[plan.id]));assert.equal((await as('authenticated',A,()=>queue())).status,'cancelled');});
let ready=await as('authenticated',A,()=>queue({date:'2027-01-02T12:00:00Z'}));
await test('Revoking approval invalidates a ready plan',async()=>{await as('authenticated',A,()=>q("select record_beast_marketing_ad_decision($1,1,'fnv1a32:12345678','request_changes','synthetic')",[V]));assert.equal(await scalar('select status value from beast_marketing_distribution_plans where id=$1',[ready.id]),'draft');});
await as('authenticated',A,()=>q("select record_beast_marketing_ad_decision($1,1,'fnv1a32:12345678','approve','synthetic')",[V]));
await test('Reapproval and retry do not reactivate invalidated slot',async()=>assert.equal((await as('authenticated',A,()=>queue({date:'2027-01-02T12:00:00Z'}))).status,'draft'));
ready=await as('authenticated',A,()=>queue({date:'2027-01-03T12:00:00Z'}));
await test('Creative edit increments revision and invalidates plan',async()=>{await as('authenticated',A,()=>q("update beast_marketing_ad_variants set headline='edited',revision_hash='fnv1a32:87654321' where id=$1",[V]));assert.equal(await scalar('select revision value from beast_marketing_ad_variants where id=$1',[V]),2);assert.equal(await scalar('select status value from beast_marketing_distribution_plans where id=$1',[ready.id]),'draft');});
for(const [label,sql,params,pat] of [
['character activation','update beast_marketing_presenter_profiles set active=true where id=$1',[P],/remain inactive/],
['series activation','update beast_marketing_video_series set enabled=true where id=$1',[S],/remain disabled/],
['series publishing','update beast_marketing_video_series set settings=\'{"publishingEnabled":true,"approvalMode":"owner_approval"}\' where id=$1',[S],/remain disabled/],
['campaign activation',"update beast_marketing_campaigns set status='active' where id=$1",[C],/cannot activate/],
['variant reassignment','update beast_marketing_ad_variants set campaign_id=$1 where id=$2',[C2,V],/talent boundary/],
['video job',"insert into beast_marketing_video_jobs(owner_id,series_id,presenter_profile_id,idempotency_key) values($1,$2,$3,'fixture')",[A,S,P],/outside private planning/],
['social post',"insert into beast_marketing_social_posts(id,owner_id,channel,content) values($1,$2,'instagram',jsonb_build_object('campaignId',$3::text))",[id(60),A,C],/outside private planning/],
['workstream reassignment','update beast_marketing_agency_workstreams set presenter_profile_id=$1 where id=$2',[P2,stream.id],/links are immutable/],
['legacy asset',"insert into beast_marketing_assets(campaign_id,owner_id,name,asset_type,channel,body) values($1,$2,'fixture','text','instagram','fixture')",[C,A],/outside private planning/]
]) await test(`Database blocks ${label}`,()=>reject(sql,params,pat));
await test('Running growth cycle prevents new linkage',async()=>{await q("insert into beast_marketing_growth_runs(owner_id,cycle_date,status) values($1,current_date,'running')",[A]);await as('authenticated',A,()=>assert.rejects(link(P2,C2,null),/growth cycle is idle/));await q("update beast_marketing_growth_runs set status='completed' where owner_id=$1",[A]);});
await q("insert into beast_marketing_social_connections(id,owner_id,channel,account_id,label,credentials) values($1,$2,'instagram','synthetic-account','fixture','{}')",[CON,A]);
await q("insert into beast_marketing_agency_bindings(owner_id,presenter_profile_id,connection_id,channel) values($1,$2,$3,'instagram')",[A,P,CON]);
await as('authenticated',A,()=>q("select record_beast_marketing_ad_decision($1,2,'fnv1a32:87654321','approve','synthetic')",[V]));
await test('Available exact character binding is accepted',async()=>assert.equal((await as('authenticated',A,()=>queue({rev:2,hash:'fnv1a32:87654321',connection:CON,date:'2027-01-04T12:00:00Z'}))).agency_connection_id,CON));
await test('Disconnected bound account is rejected',async()=>{await q('update beast_marketing_social_connections set disconnected_at=now() where id=$1',[CON]);await as('authenticated',A,()=>assert.rejects(queue({rev:2,hash:'fnv1a32:87654321',connection:CON,date:'2027-01-05T12:00:00Z'}),/available account/));});
await q("insert into beast_marketing_social_connections(id,owner_id,channel,account_id,label,credentials) values($1,$2,'x','another-synthetic-account','fixture','{}')",[id(51),A]);
await test('Binding foreign keys reject cross-owner profile',()=>reject("insert into beast_marketing_agency_bindings(owner_id,presenter_profile_id,connection_id,channel) values($1,$2,$3,'x')",[A,PB,id(51)],/foreign key/));
await test('Non-Agency campaign remains editable',async()=>{await as('authenticated',A,()=>q("update beast_marketing_campaigns set status='active' where id=$1",[C2]));assert.equal(await scalar('select status value from beast_marketing_campaigns where id=$1',[C2]),'active');});
await test('Other admin cannot read owner plans',()=>as('authenticated',B,async()=>assert.equal(await scalar('select count(*)::integer value from beast_marketing_distribution_plans'),0)));
await test('Anonymous cannot execute queue RPC',()=>as('anon',null,()=>assert.rejects(queue(),/permission denied/)));
await test('Service role cannot execute queue RPC',()=>as('service_role',A,()=>assert.rejects(queue(),/permission denied/)));
await test('Legacy outcome write is blocked',()=>reject("insert into beast_marketing_outcomes(campaign_id,owner_id,metric,value,source_label) values($1,$2,'visits',1,'fixture')",[C,A],/outside private planning/));
await test('Legacy assessment write is blocked',()=>reject("insert into beast_marketing_recommendations(campaign_id,owner_id,decision,confidence) values($1,$2,'continue','low')",[C,A],/outside private planning/));
await test('Expired bound account is rejected',async()=>{await q("update beast_marketing_social_connections set disconnected_at=null,expires_at=now()-interval '1 hour' where id=$1",[CON]);await as('authenticated',A,()=>assert.rejects(queue({rev:2,hash:'fnv1a32:87654321',connection:CON,date:'2027-01-06T12:00:00Z'}),/available account/));});
await test('Future-connected bound account is rejected',async()=>{await q("update beast_marketing_social_connections set expires_at=null,connected_at=now()+interval '1 hour' where id=$1",[CON]);await as('authenticated',A,()=>assert.rejects(queue({rev:2,hash:'fnv1a32:87654321',connection:CON,date:'2027-01-06T12:00:00Z'}),/available account/));});
await test('No synthetic post or video job was created',async()=>{assert.equal(await scalar('select count(*)::integer value from beast_marketing_social_posts'),0);assert.equal(await scalar('select count(*)::integer value from beast_marketing_video_jobs'),0);});
await test('Trigger functions have no public/client/service execute grants',async()=>{for(const f of ['guard_beast_marketing_agency_plan()','guard_beast_marketing_agency_bound_resources()','invalidate_beast_marketing_agency_plans()']) for(const role of ['anon','authenticated','service_role']) assert.equal(await scalar("select has_function_privilege($1,$2,'EXECUTE') value",[role,f]),false);});
const report={engine:'PGlite',engineVersion:JSON.parse(readFileSync(new URL('./node_modules/@electric-sql/pglite/package.json',import.meta.url))).version,postgresVersion:await scalar('select version() value'),scope:'Ephemeral in-memory database; synthetic identities only; actual migration SQL unchanged; auth and storage minimal fixture stubs; no live database.',migrationSha256:hashes,passed:results.filter(x=>x.status==='pass').length,failed:results.filter(x=>x.status==='fail').length,results};
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');await db.close();console.log(JSON.stringify({passed:report.passed,failed:report.failed}));process.exitCode=report.failed?1:0;
