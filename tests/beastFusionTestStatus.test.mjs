import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as nodeModule from "node:module";
const stripTypeScriptTypes=nodeModule.stripTypeScriptTypes??((source)=>nodeModule.createRequire(import.meta.url)("typescript").transpileModule(source,{compilerOptions:{target:99,module:99}}).outputText);

const baseline={VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"codex/commercial-payment-boundaries-20261008",BEASTFUSION_TEST_CHECKOUT_ENABLED:"true",NEXT_PUBLIC_SUPABASE_URL:"https://zvzcojwjgnedrouilovc.supabase.co",STRIPE_SECRET_KEY:"sk_test_fixture",STRIPE_BEASTFUSION_PRO_PRICE_ID:"price_fixture",BEASTFUSION_LICENSE_PRIVATE_KEY_PEM:"configured"};
async function fixture(patch={},failure=null){
 const previous=Object.fromEntries(Object.keys(baseline).map(key=>[key,process.env[key]]));
 for(const [key,value] of Object.entries({...baseline,...patch})){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 let reads=0;
 const admin={from:()=>({select:()=>({limit:async()=>{reads++;return {error:failure};}})}),storage:{getBucket:async()=>{reads++;return {data:{public:false},error:failure};}}};
 class Stripe{prices={retrieve:async()=>{reads++;if(failure)throw failure;return {livemode:false,unit_amount:49900,currency:"usd",type:"one_time"};}};}
 const NextResponse={json:(body,options)=>({body,status:options?.status??200,headers:options?.headers})};
 const source=stripTypeScriptTypes(readFileSync("src/app/api/beastfusion/test-status/route.ts","utf8").replace(/^import .*;\n/gm,"")).replace("export const dynamic","const dynamic").replace("export async function GET","async function GET");
 try{
  const handler=new Function("Stripe","NextResponse","createAdminClient",source+";return GET;")(Stripe,NextResponse,()=>admin);
  return {result:await handler(),reads};
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
}
test("diagnostics are absent outside the explicitly approved preview branch",async()=>{
 for(const patch of [{VERCEL_ENV:"production"},{VERCEL_GIT_COMMIT_REF:"main"},{BEASTFUSION_TEST_CHECKOUT_ENABLED:undefined}]){const x=await fixture(patch);assert.equal(x.result.status,404);assert.equal(x.reads,0);}
});
test("diagnostics reject cross-environment credentials before client reads",async()=>{
 for(const patch of [{NEXT_PUBLIC_SUPABASE_URL:"https://grpyzwvgqiwtxadfdtni.supabase.co"},{STRIPE_SECRET_KEY:"sk_live_fixture"},{STRIPE_SECRET_KEY:undefined}]){const x=await fixture(patch);assert.equal(x.result.status,503);assert.equal(x.reads,0);}
});
test("successful diagnostics expose only boolean gates and prevent caching",async()=>{
 const x=await fixture();assert.equal(x.result.status,200);assert.equal(x.reads,3);assert.equal(x.result.headers["Cache-Control"],"private, no-store");assert.deepEqual(x.result.body,{status:"ready",gates:{license_storage:true,private_download_storage:true,stripe_test_price:true,signing_key_configured:true}});
});
test("failed external reads do not expose sensitive error messages",async()=>{
 const x=await fixture({},new Error("secret-fixture"));assert.equal(x.result.status,503);assert.equal(JSON.stringify(x.result).includes("secret-fixture"),false);
});
