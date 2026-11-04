import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerClient} from '@supabase/ssr';

test('actual SSR SDK keeps signup proof in cookies and exchanges a PKCE callback with that proof',async()=>{
 const jar=new Map<string,string>(),requests:Array<{url:string;body:Record<string,unknown>}> = [];
 const user={id:'10000000-0000-4000-8000-000000000001',aud:'authenticated',email:'fixture@example.test',created_at:'2026-11-04T00:00:00Z',app_metadata:{},user_metadata:{}};
 const makeClient=()=>createServerClient('https://canonical.supabase.co','fixture-public-key',{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))},global:{fetch:async(url,options)=>{
  const body=JSON.parse(String(options?.body||'{}'));requests.push({url:String(url),body});
  return new Response(JSON.stringify(String(url).includes('/signup')?user:{access_token:'fixture.access.signature',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user}),{status:200,headers:{'Content-Type':'application/json'}});
 }}});
 const registration=await makeClient().auth.signUp({email:user.email,password:'fixture-password-123',options:{emailRedirectTo:'https://beast.test/auth/callback?next=%2Fdashboard%2Fbeastguide'}});
 assert.equal(registration.error,null);assert.equal(registration.data.session,null);
 assert.equal(requests[0].body.code_challenge_method,'s256');assert.equal(typeof requests[0].body.code_challenge,'string');
 assert.ok([...jar.keys()].some(name=>/-code-verifier(?:\.\d+)?$/.test(name)));
 const exchange=await makeClient().auth.exchangeCodeForSession('fixture-authorization-code');
 assert.equal(exchange.error,null);const token=requests.find(r=>r.url.includes('/token'))!;assert.equal(token.body.auth_code,'fixture-authorization-code');assert.equal(typeof token.body.code_verifier,'string');assert.ok(String(token.body.code_verifier).length>32);
});
