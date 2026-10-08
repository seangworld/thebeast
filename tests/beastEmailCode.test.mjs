import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const transpile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:99,target:99}}).outputText;
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const experience=moduleURL(transpile('src/lib/auth/experience.ts'));
const {verifyBeastEmailCode}=await import(moduleURL(transpile('src/lib/auth/emailCode.ts').replace('"./experience"',JSON.stringify(experience))));
function fixture({error=null,user={id:'user'},userError=null}={}){let verify=0,reads=0,signouts=0,args;return {auth:{verifyOtp:async(input)=>{verify++;args=input;return {error};},getUser:async()=>{reads++;return {data:{user},error:userError};},signOut:async()=>{signouts++;return {error:null};}},state:()=>({verify,reads,signouts,args})};}
test('email code validates format before contacting auth',async()=>{for(const [email,code] of [['','123456'],['user@example.com','abc123'],['user@example.com','12345']]){const f=fixture();assert.equal((await verifyBeastEmailCode(f.auth,email,code)).ok,false);assert.equal(f.state().verify,0);}});
test('code signs into the requested email using email OTP and validates the resulting user',async()=>{const f=fixture();assert.deepEqual(await verifyBeastEmailCode(f.auth,' user@example.com ',' 123456 '),{ok:true});assert.deepEqual(f.state(),{verify:1,reads:1,signouts:0,args:{email:'user@example.com',token:'123456',type:'email'}});});
test('configured eight-digit email code is accepted without reducing server OTP strength',async()=>{const f=fixture();assert.equal((await verifyBeastEmailCode(f.auth,'user@example.com','12345678')).ok,true);assert.equal(f.state().args.token,'12345678');});
test('invalid or expired code never validates or redirects a session and errors do not expose provider details',async()=>{for(const code of ['otp_expired','invalid_credentials','unexpected']){const f=fixture({error:{code,message:'private provider diagnostic'}});const result=await verifyBeastEmailCode(f.auth,'user@example.com','123456');assert.equal(result.ok,false);assert.doesNotMatch(result.message,/private provider diagnostic/);assert.equal(f.state().reads,0);}});
test('failed user verification closes the session',async()=>{for(const options of [{user:null},{userError:{message:'unavailable'}}]){const f=fixture(options);assert.equal((await verifyBeastEmailCode(f.auth,'user@example.com','123456')).ok,false);assert.equal(f.state().signouts,1);}});
test('disabled app-metadata account is signed out; user-editable metadata grants no disabled-account override',async()=>{const f=fixture({user:{id:'user',app_metadata:{account_status:'disabled'},user_metadata:{is_disabled:false}}});const result=await verifyBeastEmailCode(f.auth,'user@example.com','123456');assert.equal(result.ok,false);assert.equal(result.disabled,true);assert.equal(f.state().signouts,1);});
