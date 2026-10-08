import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as nodeModule from "node:module";
import Stripe from "stripe";
const stripTypeScriptTypes=nodeModule.stripTypeScriptTypes??((source)=>nodeModule.createRequire(import.meta.url)("typescript").transpileModule(source,{compilerOptions:{target:99,module:99}}).outputText);
async function sourceModule(path){
 const source=stripTypeScriptTypes(readFileSync(path,"utf8"));
 return import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
}
const {beastFusionCheckoutGate,stripeKeyMode,customerReleaseCatalog,entitledCustomerRelease}=await sourceModule("src/lib/beastfusion/checkoutGate.ts");
const {validateBeastFusionPurchase}=await sourceModule("src/lib/beastfusion/validatePurchase.ts");
const testEnv={STRIPE_SECRET_KEY:"rk_test_fixture",STRIPE_BEASTFUSION_PRO_PRICE_ID:"price_fixture",VERCEL_ENV:"preview",BEASTFUSION_TEST_CHECKOUT_ENABLED:"true"};
test("checkout defaults closed, permits explicit isolated testing, rejects live keys in preview",()=>{
 assert.equal(beastFusionCheckoutGate({}).allowed,false);
 assert.equal(beastFusionCheckoutGate(testEnv).allowed,true);
 assert.equal(beastFusionCheckoutGate({...testEnv,BEASTFUSION_TEST_CHECKOUT_ENABLED:undefined}).allowed,false);
 assert.equal(beastFusionCheckoutGate({...testEnv,VERCEL_ENV:"production"}).allowed,false);
 assert.equal(beastFusionCheckoutGate({...testEnv,STRIPE_SECRET_KEY:"sk_live_fixture"}).allowed,false);
 assert.equal(stripeKeyMode("rk_live_fixture"),"live");
 assert.equal(stripeKeyMode("unrecognized"),null);
});

test("expired update coverage selects the newest previously entitled release",()=>{
 const raw=JSON.stringify([
  {version:"5.1",releasedOn:"2025-01-01",storagePath:"customer/5.1.tar.gz",sha256:"a".repeat(64),approved:true},
  {version:"5.2",releasedOn:"2026-01-01",storagePath:"customer/5.2.tar.gz",sha256:"b".repeat(64),approved:true},
  {version:"5.3",releasedOn:"2027-01-01",storagePath:"customer/5.3.tar.gz",sha256:"c".repeat(64),approved:true}
 ]);
 assert.equal(entitledCustomerRelease(raw,"2026-02-01",new Date("2028-01-01")).version,"5.2");
 assert.equal(entitledCustomerRelease(raw,null),null);
 assert.equal(entitledCustomerRelease(raw,"2026-02-31"),null);
});
test("catalog rejects unapproved, malformed, duplicate and unsafe storage entries",()=>{
 const entry={version:"5.1",releasedOn:"2025-01-01",storagePath:"customer/5.1.tar.gz",sha256:"a".repeat(64),approved:true};
 for(const values of [[{...entry,approved:false}],[{...entry,storagePath:"../private"}],[{...entry,releasedOn:"2026-02-31"}],[{...entry,sha256:"bad"}],[entry,entry]]){
  assert.deepEqual(customerReleaseCatalog(JSON.stringify(values)),[]);
 }
});
async function downloadFixture({user={id:"user"},license={license_id:"license",updates_until:"2027-01-01"},publicBucket=false,queryError=null}={}){
 const filters=[];let signed=0;
 const query={select:()=>query,eq:(key,value)=>{filters.push([key,value]);return query;},order:()=>query,limit:()=>query,maybeSingle:async()=>({data:license,error:queryError})};
 const createRouteClient=()=>({auth:{getUser:async()=>({data:{user}})},from:()=>query});
 const createAdminClient=()=>({storage:{getBucket:async()=>({data:{public:publicBucket},error:null}),from:()=>({createSignedUrl:async(path,seconds,options)=>{signed++;assert.equal(seconds,60);assert.equal(options.download,true);return {data:{signedUrl:"https://private.invalid/signed"},error:null};}})}});
 const NextResponse={json:(body,options)=>({body,status:options?.status??200,headers:options?.headers})};
 let source=readFileSync("src/app/api/beastfusion/customer/download/route.ts","utf8").replace(/^import .*;\n/gm,"");
 source=stripTypeScriptTypes(source).replace("export const dynamic","const dynamic").replace("export async function GET","async function GET");
 const handler=new Function("NextResponse","createRouteClient","createAdminClient","entitledCustomerRelease",source+";return GET;")(NextResponse,createRouteClient,createAdminClient,entitledCustomerRelease);
 const names=["BEASTFUSION_CUSTOMER_RELEASES_JSON","BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET"];const previous=Object.fromEntries(names.map(key=>[key,process.env[key]]));
 process.env.BEASTFUSION_CUSTOMER_RELEASES_JSON=JSON.stringify([{version:"5.1",releasedOn:"2025-01-01",storagePath:"customer/5.1.tar.gz",sha256:"a".repeat(64),approved:true}]);
 process.env.BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET="private-fixture";
 try{return {result:await handler(),signed,filters};}finally{for(const key of names){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
}
test("download checks the authenticated owner and active license before signing",async()=>{
 const x=await downloadFixture();assert.equal(x.result.status,200);assert.equal(x.signed,1);assert.deepEqual(x.filters,[["user_id","user"],["status","active"]]);assert.equal(x.result.headers["Cache-Control"],"private, no-store");assert.equal(x.result.body.expires_in_seconds,60);
});
test("unauthenticated, unlicensed and failed-lookup downloads never get signed URLs",async()=>{
 for(const [options,status] of [[{user:null},401],[{license:null},403],[{queryError:{message:"failed"}},503]]){
  const x=await downloadFixture(options);assert.equal(x.result.status,status);assert.equal(x.signed,0);
 }
});
test("public buckets cannot be used for entitled downloads",async()=>{
 const x=await downloadFixture({publicBucket:true});assert.equal(x.result.status,503);assert.equal(x.signed,0);
});

test("production requires distinct owner release, terms and delivery gates",()=>{
 const env={...testEnv,VERCEL_ENV:"production",STRIPE_SECRET_KEY:"rk_live_fixture",BEASTFUSION_COMMERCIAL_RELEASE_APPROVED:"true",BEASTFUSION_COMMERCIAL_TERMS_APPROVED:"true",BEASTFUSION_LICENSE_PRIVATE_KEY_PEM:"configured",STRIPE_BEASTFUSION_WEBHOOK_SECRET:"configured",BEASTFUSION_CUSTOMER_ARTIFACT_SHA256:"a".repeat(64),BEASTFUSION_CUSTOMER_ARTIFACT_VERSION:"candidate",BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET:"private-fixture",BEASTFUSION_CUSTOMER_RELEASES_JSON:JSON.stringify([{version:"candidate",releasedOn:"2026-01-01",storagePath:"customer/candidate.tar.gz",sha256:"a".repeat(64),approved:true}])};
 assert.equal(beastFusionCheckoutGate(env).allowed,true);
 for(const key of ["BEASTFUSION_COMMERCIAL_RELEASE_APPROVED","BEASTFUSION_COMMERCIAL_TERMS_APPROVED","BEASTFUSION_LICENSE_PRIVATE_KEY_PEM","STRIPE_BEASTFUSION_WEBHOOK_SECRET","BEASTFUSION_CUSTOMER_ARTIFACT_SHA256","BEASTFUSION_CUSTOMER_ARTIFACT_VERSION","BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET","BEASTFUSION_CUSTOMER_RELEASES_JSON"]){
  assert.equal(beastFusionCheckoutGate({...env,[key]:undefined}).allowed,false,key);
 }
});
const session={id:"cs_test_fixture",mode:"payment",amount_total:49900,currency:"usd",payment_status:"paid",client_reference_id:"user",created:1791400000,livemode:false,metadata:{product:"beastfusion-professional",user_id:"user"}};
test("paid purchase validation rejects wrong amount, unpaid, mismatched customer and cross-mode",()=>{
 assert.equal(validateBeastFusionPurchase(session,false).ok,true);
 for(const patch of [{amount_total:1},{payment_status:"unpaid"},{client_reference_id:"other"},{livemode:true},{currency:"eur"}])assert.equal(validateBeastFusionPurchase({...session,...patch},false).ok,false);
});
async function handlerFixture({event,signature="verified",rows=new Map(),storageError=null}){
 let writes=0;
 const createAdminClient=()=>({from:()=>({upsert:async(row,options)=>{
  writes++;assert.equal(options.onConflict,"license_id");assert.equal(options.ignoreDuplicates,true);
  if(storageError)return {error:storageError};
  if(!rows.has(row.license_id))rows.set(row.license_id,row);
  return {error:null};
 }})});
 const NextResponse={json:(body,options)=>({body,status:options?.status??200})};
 let source=readFileSync("src/app/api/beastfusion/webhook/route.ts","utf8").replace(/^import .*;\n/gm,"");
 source=stripTypeScriptTypes(source).replace("export const dynamic","const dynamic").replace("export async function POST","async function POST");
 const factory=new Function("Stripe","NextResponse","createAdminClient","validateBeastFusionPurchase","stripeKeyMode",source+";return POST;");
 const handler=factory(Stripe,NextResponse,createAdminClient,validateBeastFusionPurchase,stripeKeyMode);
 const names=["STRIPE_SECRET_KEY","STRIPE_BEASTFUSION_WEBHOOK_SECRET","VERCEL_ENV"];
 const previous=Object.fromEntries(names.map(key=>[key,process.env[key]]));
 Object.assign(process.env,{STRIPE_SECRET_KEY:"rk_test_fixture",STRIPE_BEASTFUSION_WEBHOOK_SECRET:"whsec_fixture",VERCEL_ENV:"preview"});
 try{
  const payload=JSON.stringify(event);
  const signedHeader=signature==="verified"?Stripe.webhooks.generateTestHeaderString({payload,secret:"whsec_fixture"}):signature;
  const result=await handler(new Request("https://preview.invalid/api/beastfusion/webhook",{method:"POST",headers:signedHeader?{"stripe-signature":signedHeader}:{},body:payload}));
  return {result,writes,rows};
 }finally{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}}
}
test("unsigned and invalid-signature webhooks never touch storage",async()=>{
 for(const signature of [null,"invalid"]){const x=await handlerFixture({event:{type:"checkout.session.completed",data:{object:session}},signature});assert.equal(x.result.status,400);assert.equal(x.writes,0);}
});
test("delayed payment succeeds only after async success; replay preserves revoked state",async()=>{
 const rows=new Map();
 const unpaid=await handlerFixture({event:{type:"checkout.session.completed",data:{object:{...session,payment_status:"unpaid"}}},rows});
 assert.equal(unpaid.writes,0);
 const paid=await handlerFixture({event:{type:"checkout.session.async_payment_succeeded",data:{object:session}},rows});
 assert.equal(paid.result.status,200);assert.equal(rows.size,1);
 const first=rows.get("bf_cs_test_fixture");rows.set(first.license_id,{...first,status:"revoked"});
 await handlerFixture({event:{type:"checkout.session.completed",data:{object:session}},rows});
 assert.equal(rows.size,1);assert.equal(rows.get(first.license_id).status,"revoked");assert.equal(rows.get(first.license_id).updates_until,first.updates_until);
});
test("storage failure returns retriable failure rather than false fulfillment",async()=>{
 const x=await handlerFixture({event:{type:"checkout.session.completed",data:{object:session}},storageError:{message:"unavailable"}});
 assert.equal(x.result.status,500);assert.equal(x.result.body.error,"license_issue_failed");
});

