import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {NextRequest,NextResponse} from 'next/server';
import * as setup from '../src/lib/auth/accountSetup';
import * as experience from '../src/lib/auth/experience';
import * as registry from '../src/lib/moduleRegistry';
import * as age from '../src/lib/memberAgeEntitlements';
function fixture({username='preserved',verified=true,identityError=false,profileError=false}: {username?:string|null;verified?:boolean;identityError?:boolean;profileError?:boolean}={}){
 const client={rpc:async(name:string)=>({data:name==='beast_auth_current_username'?username:true,error:name==='beast_auth_current_username'&&identityError?{code:'unavailable'}:null}),auth:{getUser:async()=>({data:{user:{id:'own-id',email_confirmed_at:verified?'2026-11-04':null,app_metadata:{}}},error:null}),signOut:async()=>({error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'member',preferred_name:'Existing name',birthday:'1980-01-01'},error:profileError?{code:'unavailable'}:null})})})})};
 const exports:{middleware?:(request:NextRequest)=>Promise<NextResponse>}={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URL,process:{env:{BEAST_ACCOUNT_SETUP_REQUIRED:'true'}},require:(name:string)=>{
  if(name==='next/server')return {NextResponse};if(name==='@supabase/ssr')return {createServerClient:()=>client};if(name.endsWith('/accountSetup'))return setup;if(name.endsWith('/experience'))return experience;if(name.endsWith('/moduleRegistry'))return registry;if(name.endsWith('/memberAgeEntitlements'))return age;if(name.endsWith('/config'))return {resolveSupabasePublicConfiguration:()=>({ok:true,configuration:{url:'https://canonical.supabase.co',publicKey:'fixture'}})};throw Error(name);
 }});return (path:string)=>exports.middleware!(new NextRequest('https://beast.test'+path));
}
test('required setup returns unassigned and unverified users to their requested app after setup',async()=>{
 for(const options of [{username:null},{verified:false}]){const response=await fixture(options)('/dashboard/beastguide?filter=sports');assert.equal(response.status,307);const url=new URL(response.headers.get('location')!);assert.equal(url.pathname,'/account-setup');assert.equal(url.searchParams.get('next'),'/dashboard/beastguide?filter=sports')}
});
test('setup gate denies protected APIs without issuing a redirect or falling back on an unavailable registry',async()=>{
 const required=await fixture({username:null})('/api/beastguide/identity');assert.equal(required.status,403);assert.equal((await required.json()).error,'ACCOUNT_SETUP_REQUIRED');
 for(const options of [{identityError:true},{profileError:true}])assert.equal((await fixture(options)('/dashboard/today')).status,503);
});
test('completed existing identities enter unchanged and account settings stay reachable for completion',async()=>{
 assert.equal((await fixture()('/dashboard/today')).status,200);
 assert.equal((await fixture({username:null})('/dashboard/settings/profile')).status,200);
});
