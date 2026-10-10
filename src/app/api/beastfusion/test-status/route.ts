import Stripe from "stripe";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(){
 // Read-only, non-secret diagnostics for this explicitly authorized test branch.
 if(process.env.VERCEL_ENV!=="preview"||process.env.VERCEL_GIT_COMMIT_REF!=="codex/commercial-payment-boundaries-20261008"||process.env.BEASTFUSION_TEST_CHECKOUT_ENABLED!=="true")return NextResponse.json({error:"not_found"},{status:404});
 if(process.env.NEXT_PUBLIC_SUPABASE_URL!=="https://zvzcojwjgnedrouilovc.supabase.co"||!process.env.STRIPE_SECRET_KEY?.match(/^(sk|rk)_test_/))return NextResponse.json({status:"blocked",reason:"test_environment_not_isolated"},{status:503});
 const gates={license_storage:false,private_download_storage:false,stripe_test_price:false,signing_key_configured:!!process.env.BEASTFUSION_LICENSE_PRIVATE_KEY_PEM};
 const admin=createAdminClient();
 if(admin){
  try{const {error}=await admin.from("beastfusion_licenses").select("license_id").limit(0);gates.license_storage=!error;}catch{}
  try{const {data,error}=await admin.storage.getBucket("beastfusion-customer-test");gates.private_download_storage=!error&&data?.public===false;}catch{}
 }
 try{
  const priceId=process.env.STRIPE_BEASTFUSION_PRO_PRICE_ID;
  if(priceId){const price=await new Stripe(process.env.STRIPE_SECRET_KEY!).prices.retrieve(priceId);gates.stripe_test_price=price.livemode===false&&price.unit_amount===49900&&price.currency==="usd"&&price.type==="one_time";}
 }catch{}
 const ready=Object.values(gates).every(Boolean);
 return NextResponse.json({status:ready?"ready":"blocked",gates},{status:ready?200:503,headers:{"Cache-Control":"private, no-store"}});
}
