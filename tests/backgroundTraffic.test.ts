import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { startVisiblePolling, type PollingHost } from '../src/lib/visiblePolling';
import { socialRefreshInterval } from '../src/lib/marketingSocialPolling';
import { ATLAS_PAUSED } from '../src/lib/atlas/operatingPolicy';

const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
function host(visibility='visible') {
 const document=Object.assign(new EventTarget(),{visibilityState:visibility});
 const window=new EventTarget(); let now=0, serial=0;
 const timers=new Map<number,{run:()=>void;delay:number}>();
 const value={document,window:Object.assign(window,{setTimeout:(run:()=>void,delay:number)=>{const id=++serial;timers.set(id,{run,delay});return id;},clearTimeout:(id:number)=>timers.delete(id)}),now:()=>now} as unknown as PollingHost;
 return {value,timers,focus:()=>window.dispatchEvent(new Event('focus')),action:()=>window.dispatchEvent(new Event('unread-change')),time:(ms:number)=>{now+=ms;},visibility:(state:string)=>{document.visibilityState=state;document.dispatchEvent(new Event('visibilitychange'));},tick:()=>{const entries=Array.from(timers.values());timers.clear();for(const entry of entries){now+=entry.delay;entry.run();}}};
}
function loadModule(path:string,modules:Record<string,unknown>) {
 const exports:Record<string,any>={};
 const code=transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText;
 new Function('require','exports',code)((name:string)=>{if(name in modules)return modules[name];return require(name);},exports);
 return exports;
}

test('hidden mounts do no work; visible focus coalesces, hidden timers stop, and unmount aborts',async()=>{
 const h=host('hidden');let calls=0;let signal:AbortSignal|undefined;
 const poll=startVisiblePolling({host:h.value,intervalMs:300000,load:async s=>{calls++;signal=s;}});
 await flush();assert.equal(calls,0);assert.equal(h.timers.size,0);
 h.visibility('visible');h.focus();await flush();assert.equal(calls,1);assert.equal(Array.from(h.timers.values())[0].delay,300000);
 h.visibility('hidden');assert.equal(h.timers.size,0);h.tick();h.focus();await flush();assert.equal(calls,1);
 h.visibility('visible');await flush();assert.equal(calls,2);
 poll.stop();h.focus();h.visibility('visible');h.tick();await flush();assert.equal(calls,2);assert.equal(h.timers.size,0);
 assert.ok(signal);
});
test('in-flight loads serialize; action during a check gets one trailing fresh result; hide aborts',async()=>{
 const h=host();const finish:Array<()=>void>=[];const signals:AbortSignal[]=[];let active=0,max=0;
 const poll=startVisiblePolling({host:h.value,intervalMs:300000,events:['unread-change'],load:async signal=>{signals.push(signal);active++;max=Math.max(max,active);await new Promise<void>(resolve=>finish.push(resolve));active--;}});
 await flush();h.focus();h.action();h.action();assert.equal(signals.length,1);
 finish.shift()!();await flush();assert.equal(signals.length,2);assert.equal(max,1);
 h.visibility('hidden');assert.equal(signals[1].aborted,true);finish.shift()!();await flush();assert.equal(h.timers.size,0);
 poll.stop();
});
test('idle consumers have no timer; focus and manual actions still refresh and active jobs restart timers',async()=>{
 const h=host();let calls=0;let delay:number|null=null;
 const poll=startVisiblePolling({host:h.value,intervalMs:()=>delay,load:async()=>{calls++;}});
 await flush();assert.equal(h.timers.size,0);h.time(2000);h.focus();await flush();assert.equal(calls,2);
 delay=30000;await poll.refresh();assert.equal(h.timers.size,1);h.tick();await flush();assert.equal(calls,4);
 delay=null;await poll.refresh();assert.equal(h.timers.size,0);poll.stop();
});
test('unread subscribers share one timer/request per user and cannot receive a prior user cache',async()=>{
 const h=host();let loads=0;const seenA:number[]=[],seenB:number[]=[],seenOther:number[]=[];
 const unread=loadModule('src/lib/adminMessageUnreadPolling.ts',{'./beastAdminMessaging':{BEAST_ADMIN_MESSAGE_UNREAD_EVENT:'unread-change'},'./visiblePolling':{startVisiblePolling:(options:Parameters<typeof startVisiblePolling>[0])=>startVisiblePolling({...options,host:h.value})}});
 const loader=async()=>{loads++;return 7;};
 const a=unread.subscribeAdminMessageUnread('A',(n:number)=>seenA.push(n),loader);
 const b=unread.subscribeAdminMessageUnread('A',(n:number)=>seenB.push(n),loader);
 await flush();assert.equal(loads,1);assert.deepEqual(seenA,[7]);assert.deepEqual(seenB,[7]);assert.equal(h.timers.size,1);
 a();h.tick();await flush();assert.equal(loads,2);b();assert.equal(h.timers.size,0);
 h.visibility('hidden');const other=unread.subscribeAdminMessageUnread('B',(n:number)=>seenOther.push(n),async()=>3);await flush();assert.deepEqual(seenOther,[]);
 h.visibility('visible');await flush();assert.deepEqual(seenOther,[3]);other();
});
test('unread transient failures retain confirmed count, and aborted results after unmount are ignored',async()=>{
 const h=host();let fail=false;let finish:((count:number)=>void)|undefined;const seen:number[]=[];
 const unread=loadModule('src/lib/adminMessageUnreadPolling.ts',{'./beastAdminMessaging':{BEAST_ADMIN_MESSAGE_UNREAD_EVENT:'unread-change'},'./visiblePolling':{startVisiblePolling:(options:Parameters<typeof startVisiblePolling>[0])=>startVisiblePolling({...options,host:h.value})}});
 const stop=unread.subscribeAdminMessageUnread('A',(n:number)=>seen.push(n),async()=>{if(fail)throw Error('offline');return 4;});await flush();fail=true;h.action();await flush();assert.deepEqual(seen,[4]);stop();
 const late=unread.subscribeAdminMessageUnread('A',(n:number)=>seen.push(n),()=>new Promise<number>(resolve=>{finish=resolve;}));await flush();late();finish!(9);await flush();assert.deepEqual(seen,[4]);
});
test('social visible polling stops for paused/idle queues and backs off future authorized schedules',()=>{
 assert.equal(socialRefreshInterval(null),null);
 assert.equal(socialRefreshInterval({controls:{paused:true},posts:[{status:'publishing',scheduled_at:null}]}),null);
 assert.equal(socialRefreshInterval({controls:{paused:false},posts:[]}),null);
 assert.equal(socialRefreshInterval({controls:{paused:false},posts:[{status:'draft',scheduled_at:null}]}),null);
 assert.equal(socialRefreshInterval({controls:{paused:false},posts:[{status:'processing',scheduled_at:null}]}),30000);
 assert.equal(socialRefreshInterval({controls:{paused:false},posts:[{status:'scheduled',scheduled_at:'2099-01-01'}]},0),300000);
});

test('paused Atlas is fail-closed before database/auth/provider work; persisted records are untouched',async()=>{
 assert.equal(ATLAS_PAUSED,true);let dbCalls=0,authCalls=0;
 const json=(body:unknown,options?:{status?:number})=>new Response(JSON.stringify(body),{status:options?.status||200});
 const modules={'@/lib/atlas/operatingPolicy':{ATLAS_PAUSED:true,ATLAS_PAUSED_MESSAGE:'Paused'},'next/server':{NextResponse:{json},after:()=>{throw Error('must not dispatch');}},'@/lib/atlas/server':{atlasAuth:()=>{authCalls++;throw Error('must not authenticate/read');},atlasDB:()=>{dbCalls++;throw Error('must not query');}},'@/lib/atlas/shared':{},'@/lib/digitalStaffRuntime/provider':{}};
 const route=loadModule('src/app/api/atlas/[action]/route.ts',modules);
 const context={params:Promise.resolve({action:'state'})};
 assert.equal((await route.GET(new Request('https://example.test/api/atlas/state'),context)).status,423);
 assert.equal((await route.POST(new Request('https://example.test/api/atlas/turn',{method:'POST'}),context)).status,423);
 const cron=loadModule('src/app/api/cron/atlas/route.ts',{'@/lib/atlas/operatingPolicy':{ATLAS_PAUSED:true},'next/server':{NextResponse:{json}},'@/lib/standingObservation':{verifyCronAuthorization:(v:string)=>v==='Bearer fixture'},'@/lib/atlas/server':modules['@/lib/atlas/server']});
 assert.equal((await cron.GET(new Request('https://example.test/cron'))).status,401);
 assert.equal((await (await cron.GET(new Request('https://example.test/cron',{headers:{authorization:'Bearer fixture'}}))).json()).status,'paused');
 assert.equal(dbCalls,0);assert.equal(authCalls,0);
 const server=loadModule('src/lib/atlas/server.ts',{'./operatingPolicy':{ATLAS_PAUSED:true,ATLAS_PAUSED_MESSAGE:'Paused'},'./connections':{},'@/lib/supabase/admin':{createAdminClient:()=>{dbCalls++;throw Error('no db');}},'@/lib/supabase/server':{},'./shared':{},'@/lib/digitalStaffRuntime/provider':{}});
 await server.runAtlasTurn('existing-turn','owner');assert.throws(()=>server.atlasDB(),/Paused/);assert.equal(dbCalls,0);
});
test('owner-disabled Atlas and marketing schedules are absent; unrelated schedule remains',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.deepEqual(config.crons.filter((c:{path:string})=>!c.path.startsWith('/api/cron/agency-cole-daily?')),[{path:'/api/cron/orchestrator-observation',schedule:'0 10 * * *'}]);
 assert.equal(config.crons.filter((c:{path:string})=>c.path.startsWith('/api/cron/agency-cole-daily?')).length,4);
});

function socialCronFixture(rows:Array<Record<string,any>>=[],enabled=['enabled'],failRead=false) {
 const calls:Array<{table:string;operation:string}>=[],published:string[]=[];
 const db={from(table:string){let operation='select',values:Record<string,unknown>={},limit=Infinity;const filters:Array<(row:Record<string,any>)=>boolean>=[];let order='';
  const q={select(){return q;},update(v:Record<string,unknown>){operation='update';values=v;return q;},eq(k:string,v:unknown){filters.push(row=>row[k]===v);return q;},in(k:string,v:unknown[]){filters.push(row=>v.includes(row[k]));return q;},lt(k:string,v:string){filters.push(row=>row[k]<v);return q;},lte(k:string,v:string){filters.push(row=>row[k]<=v);return q;},order(k:string){order=k;return q;},limit(n:number){limit=n;return q;},or(expression:string){
   const due=/scheduled_at\.lte\.([^)]*)/.exec(expression)?.[1],stale=/updated_at\.lt\.([^)]*)/.exec(expression)?.[1];
   assert.ok(due&&stale);filters.push(row=>(['scheduled','processing'].includes(row.status)&&row.scheduled_at&&row.scheduled_at<=due!)||(row.status==='publishing'&&row.updated_at<stale!));return q;
  },then(resolve:(v:unknown)=>unknown){calls.push({table,operation});if(failRead)return Promise.resolve({data:null,error:'offline'}).then(resolve);let data=(table.endsWith('controls')?enabled.map(owner_id=>({owner_id,paused:false})):rows).filter(row=>filters.every(f=>f(row)));if(order)data.sort((a,b)=>String(a[order]).localeCompare(String(b[order])));data=data.slice(0,limit);if(operation==='update')data.forEach(row=>Object.assign(row,values));return Promise.resolve({data,error:null}).then(resolve);}};return q;}};
 const cron=loadModule('src/app/api/cron/marketing-social/route.ts',{'@/lib/standingObservation':{verifyCronAuthorization:(v:string)=>v==='Bearer fixture'},'@/lib/supabase/service':{createBeastFusionPublicationClient:()=>db},'@/lib/server/social/publish':{publishSocialPost:async(_owner:string,id:string)=>{published.push(id);return {status:'published'};}},'@/lib/server/social/auth':{socialJson:(body:unknown,status=200)=>new Response(JSON.stringify(body),{status})}});
 return {calls,published,rows,run:(authorized=true)=>cron.GET(new Request('https://example.test/cron',{headers:authorized?{authorization:'Bearer fixture'}:{}}))};
}
test('idle/future-only social ticks perform one eligibility read, no controls query/write/provider call',async()=>{
 for(const rows of [[],[{id:'future',owner_id:'enabled',status:'scheduled',scheduled_at:'2099-01-01',updated_at:'2020-01-01'}]]){
  const f=socialCronFixture(rows);assert.equal((await (await f.run()).json()).status,'idle');assert.equal(f.calls.length,1);assert.equal(f.calls[0].operation,'select');assert.equal(f.published.length,0);
 }
});
test('social cron authorization/read errors fail closed with no write or provider dispatch',async()=>{
 const denied=socialCronFixture();assert.equal((await denied.run(false)).status,401);assert.equal(denied.calls.length,0);
 const failed=socialCronFixture([],[],true);assert.equal((await failed.run()).status,503);assert.equal(failed.calls.length,1);assert.equal(failed.published.length,0);
});
test('paused-owner backlog cannot starve enabled-owner scheduled publishing',async()=>{
 const rows=Array.from({length:30},(_,i)=>({id:'paused'+i,owner_id:'paused',status:'scheduled',scheduled_at:'2020-01-01',updated_at:'2020-01-01'}));rows.push({id:'approved',owner_id:'enabled',status:'scheduled',scheduled_at:'2021-01-01',updated_at:'2021-01-01'});
 const f=socialCronFixture(rows);await f.run();assert.deepEqual(f.published,['approved']);assert.equal(f.calls.filter(c=>c.operation==='update').length,0);
 const paused=socialCronFixture(rows,[]);assert.equal((await (await paused.run()).json()).status,'paused');assert.equal(paused.published.length,0);assert.equal(paused.calls.filter(c=>c.operation==='update').length,0);
});
test('only observed stale publishing claims become unconfirmed; no automatic repeat publication',async()=>{
 const f=socialCronFixture([{id:'interrupted',owner_id:'enabled',status:'publishing',updated_at:'2020-01-01'},{id:'fresh',owner_id:'enabled',status:'publishing',updated_at:'2099-01-01'}]);
 await f.run();assert.equal(f.rows[0].status,'unconfirmed');assert.equal(f.rows[1].status,'publishing');assert.equal(f.published.length,0);assert.equal(f.calls.filter(c=>c.operation==='update').length,1);
 f.calls.length=0;await f.run();assert.equal(f.calls.length,1);assert.equal(f.calls[0].operation,'select');assert.equal(f.published.length,0);
});

test('transient Strict Mode setup/cleanup sends no initial request',async()=>{
 const h=host();let calls=0;const options={host:h.value,intervalMs:300000,load:async()=>{calls++;}};
 const probe=startVisiblePolling(options);probe.stop();const mounted=startVisiblePolling(options);
 await flush();assert.equal(calls,1);mounted.stop();
});

test('duplicate callback consumers and repeated cleanup cannot orphan or delete a new user subscription',async()=>{
 const h=host();let loads=0;const seen:number[]=[];
 const unread=loadModule('src/lib/adminMessageUnreadPolling.ts',{'./beastAdminMessaging':{BEAST_ADMIN_MESSAGE_UNREAD_EVENT:'unread-change'},'./visiblePolling':{startVisiblePolling:(options:Parameters<typeof startVisiblePolling>[0])=>startVisiblePolling({...options,host:h.value})}});
 const listener=(n:number)=>seen.push(n),load=async()=>{loads++;return 2;};
 const a=unread.subscribeAdminMessageUnread('A',listener,load),b=unread.subscribeAdminMessageUnread('A',listener,load);
 await flush();assert.equal(loads,1);a();assert.equal(h.timers.size,1);b();
 const next=unread.subscribeAdminMessageUnread('A',listener,load);b();await flush();assert.equal(h.timers.size,1);h.tick();await flush();assert.equal(loads,3);next();assert.equal(h.timers.size,0);
});
