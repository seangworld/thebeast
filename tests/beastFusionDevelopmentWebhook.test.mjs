import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Stripe from 'stripe';
import { createDevelopmentWebhook, DEVELOPMENT_PROJECT_URL, DEVELOPMENT_PURCHASE_SCOPE } from '../supabase/functions/beastfusion-dev-webhook/handler.mjs';
const ts = createRequire(import.meta.url)('typescript');
const source = ts.transpileModule(readFileSync('src/lib/beastfusion/validatePurchase.ts','utf8'), {compilerOptions:{module:99,target:99}}).outputText;
const { validateBeastFusionPurchase, validateBeastFusionLineItems } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env = {SUPABASE_URL:DEVELOPMENT_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY:'development-fixture', BEASTFUSION_DEV_WEBHOOK_ENABLED:'true', BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET:'whsec_fixture',BEASTFUSION_DEV_STRIPE_READ_KEY:'rk_test_fixture',STRIPE_BEASTFUSION_PRO_PRICE_ID:'price_fixture'};
const session = {id:'cs_test_fixture', mode:'payment', amount_total:49900, currency:'usd', payment_status:'paid', client_reference_id:'user', created:1791400000, livemode:false, metadata:{product:'beastfusion-professional',user_id:'user',verification_scope:DEVELOPMENT_PURCHASE_SCOPE}};
async function run({config=env,event={livemode:false,type:'checkout.session.completed',data:{object:session}},signature='valid',timestamp,body,rows=new Map(),storageError=false,lineItems={data:[{quantity:1,price:{id:'price_fixture'}}],has_more:false},readError=false}={}) {
 let verifies=0,writes=0; const payload=body??JSON.stringify(event);
 const handler=createDevelopmentWebhook({env:config,validatePurchase:validateBeastFusionPurchase,validateLineItems:validateBeastFusionLineItems,
 readLineItems:async(id)=>{assert.equal(id,session.id);if(readError)throw new Error('private diagnostic');return lineItems;},
 verifyEvent:async(raw,header,secret)=>{verifies++;return new Stripe('webhook-verification-only').webhooks.constructEventAsync(raw,header,secret);},
 issueLicense:async(row,options)=>{writes++;assert.deepEqual(options,{onConflict:'license_id',ignoreDuplicates:true});if(storageError)throw new Error('private credential must not leak');if(!rows.has(row.license_id))rows.set(row.license_id,row);return {error:null};}
 });
 const header=signature==='valid'?Stripe.webhooks.generateTestHeaderString({payload,secret:env.BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET,...(timestamp?{timestamp}:{})}):signature;
 const response=await handler(new Request('https://development.invalid/webhook',{method:'POST',headers:header?{'stripe-signature':header}:{},body:payload}));
 return {status:response.status,body:await response.json(),verifies,writes,rows};
}
test('development receiver fails closed for production project, missing enablement or secret before signature and storage',async()=>{
 for(const config of [{...env,SUPABASE_URL:'https://production.invalid'},{...env,BEASTFUSION_DEV_WEBHOOK_ENABLED:undefined},{...env,BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET:undefined},{...env,SUPABASE_SERVICE_ROLE_KEY:undefined},{...env,BEASTFUSION_DEV_STRIPE_READ_KEY:'rk_live_fixture'},{...env,BEASTFUSION_DEV_STRIPE_READ_KEY:'sk_test_fixture'},{...env,STRIPE_BEASTFUSION_PRO_PRICE_ID:undefined}]) {const x=await run({config});assert.equal(x.status,503);assert.equal(x.verifies,0);assert.equal(x.writes,0);}
});
test('missing, invalid and expired real Stripe signatures never issue a license',async()=>{
 for(const args of [{signature:null},{signature:'bad'},{timestamp:1}]){const x=await run(args);assert.equal(x.status,400);assert.equal(x.writes,0);}
});
test('live events and cross-mode sessions are rejected; unrelated scope is ignored',async()=>{
 for(const event of [{livemode:true,type:'checkout.session.completed',data:{object:session}},{livemode:false,type:'checkout.session.completed',data:{object:{...session,livemode:true}}}]){const x=await run({event});assert.equal(x.status,400);assert.equal(x.writes,0);}
 const x=await run({event:{livemode:false,type:'checkout.session.completed',data:{object:{...session,metadata:{...session.metadata,verification_scope:'other'}}}}});assert.equal(x.status,200);assert.equal(x.body.issued,false);assert.equal(x.writes,0);
});
test('wrong price, currency or customer cannot issue; unpaid event waits for async success',async()=>{
 for(const patch of [{amount_total:1},{currency:'eur'},{client_reference_id:'other'}]){const x=await run({event:{livemode:false,type:'checkout.session.completed',data:{object:{...session,...patch}}}});assert.equal(x.status,400);assert.equal(x.writes,0);}
 const x=await run({event:{livemode:false,type:'checkout.session.completed',data:{object:{...session,payment_status:'unpaid'}}}});assert.equal(x.status,200);assert.equal(x.writes,0);assert.equal(x.body.issued,false);
});
test('async paid fulfillment is idempotent and replay cannot reactivate a revoked license',async()=>{
 const rows=new Map();const event={livemode:false,type:'checkout.session.async_payment_succeeded',data:{object:session}};
 const first=await run({event,rows});assert.equal(first.status,200);assert.equal(rows.size,1);const row=rows.get('bf_cs_test_fixture');rows.set(row.license_id,{...row,status:'revoked'});
 await run({rows});assert.equal(rows.size,1);assert.equal(rows.get(row.license_id).status,'revoked');assert.equal(rows.get(row.license_id).updates_until,row.updates_until);
});
test('oversized bodies never reach signature verification; storage exceptions retry without leaking details',async()=>{
 const large=await run({body:'x'.repeat(1024*1024+1)});assert.equal(large.status,413);assert.equal(large.verifies,0);assert.equal(large.writes,0);
 const failed=await run({storageError:true});assert.equal(failed.status,500);assert.deepEqual(failed.body,{error:'license_issue_failed'});
});
test('method and unrelated signed event are harmless',async()=>{
 const handler=createDevelopmentWebhook({env});assert.equal((await handler(new Request('https://dev.invalid'))).status,405);
 const x=await run({event:{livemode:false,type:'checkout.session.async_payment_failed',data:{object:session}}});assert.equal(x.status,200);assert.equal(x.writes,0);
});
test('actual line items must contain only the approved price; lookup failures never fulfill',async()=>{
 for(const lineItems of [{data:[{quantity:1,price:{id:'price_other'}}],has_more:false},{data:[{quantity:2,price:{id:'price_fixture'}}],has_more:false},{data:[],has_more:false},{data:[{quantity:1,price:{id:'price_fixture'}}],has_more:true}]) {const x=await run({lineItems});assert.equal(x.status,400);assert.equal(x.writes,0);}
 const x=await run({readError:true});assert.equal(x.status,503);assert.equal(x.writes,0);assert.deepEqual(x.body,{error:'purchase_verification_unavailable'});
});
