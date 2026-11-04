import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {NextRequest,NextResponse} from 'next/server';
import * as experience from '../src/lib/auth/experience';
import * as emails from '../src/lib/auth/emailWorkflows';
import {accountSetupReturn} from '../src/lib/auth/accountSetup';
function callback({valid=true,verified=true}={}){
 const exports:{GET?:(request:NextRequest)=>Promise<NextResponse>}={};let signups=0;
 const client={auth:{exchangeCodeForSession:async()=>({error:valid?null:{code:'otp_expired'}}),getUser:async()=>({data:{user:{id:'same-canonical-subject',email_confirmed_at:verified?'2026-11-04':null,app_metadata:{}}},error:null}),signUp:()=>{signups++;throw Error('not allowed in callback')}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/auth/callback/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URL,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://canonical.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture'}},require:(name:string)=>{if(name==='next/server')return {NextResponse};if(name==='@supabase/ssr')return {createServerClient:()=>client};if(name.endsWith('/experience'))return experience;if(name.endsWith('/emailWorkflows'))return emails;if(name.endsWith('/admin'))return {createAdminClient:()=>null};throw Error(name)}});
 return {run:(next:string)=>exports.GET!(new NextRequest('https://beast.test/auth/callback?flow=email_verification&purpose=registration&code=fixture&next='+encodeURIComponent(next))),signups:()=>signups};
}
test('BeastOS registration callback keeps initiating origin and requested workspace, confirming only verified success',async()=>{
 const service=callback();const response=await service.run('/dashboard/money?view=month#summary');const location=new URL(response.headers.get('location')!);assert.equal(location.origin,'https://beast.test');assert.equal(location.pathname,'/dashboard/money');assert.equal(location.searchParams.get('view'),'month');assert.equal(location.hash,'#summary');assert.equal(location.searchParams.get('registration'),'complete');assert.equal(service.signups(),0);
 for(const settings of [{valid:false},{verified:false}]){const r=await callback(settings).run('/dashboard/today');assert.equal(new URL(r.headers.get('location')!).searchParams.has('registration'),false)}
});
test('caller-supplied foreign destinations cannot silently move BeastOS registration to a different app',async()=>{
 for(const next of ['https://beastguide.seangworld.com','//evil.test']){const result=await callback().run(next);const url=new URL(result.headers.get('location')!);assert.equal(url.origin,'https://beast.test');assert.equal(url.pathname,'/dashboard/today')}
});
test('explicit BeastGuide setup handoff returns only to fixed BeastGuide pages without session tokens',()=>{
 const guide=accountSetupReturn('beastguide','discover');const target=new URL(guide.href);assert.equal(target.origin,'https://beastguide.seangworld.com');assert.equal(target.searchParams.get('next'),'discover');assert.equal(target.searchParams.has('access_token'),false);assert.equal(accountSetupReturn('beastguide','https://evil.test').href,'https://beastguide.seangworld.com/?beast_return=1&next=library');
 assert.equal(experience.getSafeAuthDestination(guide.loginDestination),guide.loginDestination);assert.equal(accountSetupReturn('beastos','/dashboard/money').href,'/dashboard/money');assert.equal(accountSetupReturn('unknown','https://evil.test').href,'/dashboard/today');
});
