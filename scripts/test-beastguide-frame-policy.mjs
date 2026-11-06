// Real browser/CSP regression with the shipped Guide artifact and synthetic read-only data.
// Does not use hosted credentials, accounts, cloud writes or mail.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,join,extname} from 'node:path';
import {chromium,webkit,devices} from '@playwright/test';
const require=createRequire(import.meta.url),config=require('../next.config.js');
const rules=await config.headers();
const globalHeaders=Object.fromEntries(rules.find(r=>r.source==='/(.*)').headers.map(h=>[h.key,h.value]));
const childHeaders=Object.fromEntries(rules.find(r=>r.source==='/beastguide-app/:path*').headers.map(h=>[h.key,h.value]));
const output=process.env.BEASTGUIDE_FRAME_EVIDENCE||'/private/tmp/beastguide-frame-evidence';
await mkdir(output,{recursive:true});
const ids={A:'10000000-0000-4000-8000-000000000001',B:'10000000-0000-4000-8000-000000000002'};
let legacyPolicy=false,unexpectedWrites=0;
const hostScript=`
 const account=localStorage.getItem('qa-account')||'A';
 const user={id:account==='A'?'${ids.A}':'${ids.B}',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01',app_metadata:{},user_metadata:{}};
 window.__BEASTGUIDE_HOST__={version:1,preview:true,apiBase:'/api/beastguide',accountHref:'/dashboard/settings/profile',supabase:{auth:{
 getSession:async()=>({data:{session:{user,access_token:'fixture-'+account}},error:null}),
 getUser:async()=>({data:{user},error:null}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}};
 function openGuide(){history.pushState({},'', '/dashboard/beastguide');document.getElementById('workspace').innerHTML='<iframe title="BeastGuide" src="/beastguide-app/index.html" style="width:100%;height:900px;border:0"></iframe>';}
 document.getElementById('open').onclick=e=>{e.preventDefault();openGuide()};
 if(location.pathname==='/dashboard/beastguide')openGuide();`;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 for(const [k,v] of Object.entries(globalHeaders))res.setHeader(k,v.replace('; upgrade-insecure-requests',''));
 if(url.pathname.startsWith('/beastguide-app/')){
  for(const [k,v] of Object.entries(childHeaders))res.setHeader(k,v.replace('; upgrade-insecure-requests',''));
  const relative=url.pathname.slice('/beastguide-app/'.length);if(relative.includes('..')){res.writeHead(400).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(relative)]||'text/plain');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');res.end(await readFile(join('public/beastguide-app',relative)));return;
 }
 if(url.pathname==='/api/beastguide/identity'){
  let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw);let data=[];
  const a=req.headers.authorization==='Bearer fixture-A';
  if(body.action==='data'){
   if(body.operation?.kind!=='select'){unexpectedWrites++;res.writeHead(403).end('{}');return;}
   const own=body.operation.filters?.user_id===(a?ids.A:ids.B);assert.ok(own,'fixture ownership must match session');
   if(a&&body.operation.table==='beastguide_library')data=[{provider_id:'tvmaze:1',content_type:'series',created_at:'2026-01-01'}];
   if(a&&body.operation.table==='beastguide_episode_progress')data=[{series_id:'tvmaze:1',season_number:1,episode_number:1,watched:true}];
  }else if(body.action==='status')data={linked:true};else throw Error('unexpected fixture operation');
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data}));return;
 }
 if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({catalogEnabled:false,items:[]}));return;}
 if(legacyPolicy)res.setHeader('Content-Security-Policy',globalHeaders['Content-Security-Policy'].replace("frame-src 'self'","frame-src 'none'").replace('; upgrade-insecure-requests',''));
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>BeastOS Guide navigation fixture</title></head><body style="margin:0"><h1>Beast applications</h1><a href="/dashboard/beastguide" id="open">Open BeastGuide</a><div id="workspace"></div><script>'+hostScript+'</script></body></html>');
 }catch(e){res.writeHead(500).end('Fixture error');console.error(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{
 for(const [engineName,engine] of [['webkit',webkit],['chromium',chromium]]){
  const browser=await engine.launch({headless:true});try{
   for(const before of [true,false]){
    legacyPolicy=before;
    const context=await browser.newContext({...devices['iPhone 13']});
    await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true});const originalMatchMedia=window.matchMedia.bind(window);window.matchMedia=query=>{const result=originalMatchMedia(query);if(query==='(display-mode: standalone)')Object.defineProperty(result,'matches',{value:true});return result};window.__frameViolations=[];document.addEventListener('securitypolicyviolation',e=>window.__frameViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
    await context.route('https://api.tvmaze.com/**',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({json:p.includes('episodes')?[{id:1,season:1,number:1,name:'Fixture pilot',airdate:'2020-01-01'}]:{id:1,name:'Preserved fixture series',status:'Ended',url:'https://www.tvmaze.com/shows/1'}})});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/dashboard/applications');await page.getByRole('link',{name:'Open BeastGuide'}).click();
    const frame=page.frameLocator('iframe[title="BeastGuide"]');
    if(before){
     await page.waitForFunction(()=>window.__frameViolations.some(e=>e.directive==='frame-src'));
     assert.equal(page.url(),origin+'/dashboard/beastguide');
     assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation')[0].name),origin+'/dashboard/applications');
     await page.screenshot({path:join(output,engineName+'-before.png')});
     console.log('PASS counterexample '+engineName+': retained Applications CSP blocks Guide after client navigation');
    }else{
     await frame.getByRole('heading',{name:'My Library',exact:true}).waitFor();
     await frame.getByText('Preserved fixture series',{exact:true}).waitFor();
     assert.equal(await page.evaluate(()=>performance.getEntriesByType('navigation')[0].name),origin+'/dashboard/applications');
     await page.screenshot({path:join(output,engineName+'-after.png'),fullPage:true});
     await frame.getByRole('button',{name:'View Episodes',exact:true}).click();await frame.locator('[data-real-episode="1"]:checked').waitFor();
     await page.reload();await frame.getByRole('heading',{name:'My Library',exact:true}).waitFor();await frame.getByText('Preserved fixture series',{exact:true}).waitFor();
     await page.goto(origin+'/dashboard/today');await page.getByRole('link',{name:'Open BeastGuide'}).click();await frame.getByRole('heading',{name:'My Library',exact:true}).waitFor();
     await page.goto(origin+'/login');await page.getByRole('link',{name:'Open BeastGuide'}).click();await frame.getByRole('heading',{name:'My Library',exact:true}).waitFor();
     await frame.getByRole('button',{name:'Bookmark',exact:true}).click();await frame.getByText('Add BeastGuide to your Home Screen',{exact:true}).waitFor();
     await page.evaluate(()=>{const f=document.createElement('iframe');f.src='https://frames.example.invalid/probe';document.body.append(f)});
     await page.waitForFunction(()=>window.__frameViolations.some(e=>e.directive==='frame-src'&&e.blocked.startsWith('https://frames.example.invalid')));
     const child=page.frames().find(f=>f.url()===origin+'/beastguide-app/index.html');
     await child.evaluate(()=>{const nested=document.createElement('iframe');nested.src='/beastguide-app/index.html';document.body.append(nested)});
     await child.waitForFunction(()=>window.__frameViolations.some(e=>e.directive==='frame-src'));
     await page.evaluate(()=>localStorage.setItem('qa-account','B'));
     await page.goto(origin+'/dashboard/applications');await page.getByRole('link',{name:'Open BeastGuide'}).click();
     await frame.getByRole('heading',{name:'Your library is empty',exact:true}).waitFor();assert.equal(await frame.getByText('Preserved fixture series',{exact:true}).count(),0);
     await page.reload();await frame.getByRole('heading',{name:'Your library is empty',exact:true}).waitFor();
     assert.deepEqual(errors,[]);
     console.log('PASS '+engineName+': standalone-sized Applications/Today/login navigation, real artifact/library/progress/readback, Bookmark, account isolation and external/nested-frame denial');
    }
    await context.close();
   }
  }finally{await browser.close();}
 }
 assert.equal(unexpectedWrites,0,'navigation and persistence checks must never write any account data');
 console.log('PASS: no hosted credentials/accounts/mail or data writes; production Guide artifact unchanged');
}finally{await new Promise(r=>server.close(r));}
