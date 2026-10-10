import Stripe from "stripe";
import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {beastFusionCommercialOffer as offer} from "@/lib/beastfusion/commercialOffer";
import {beastFusionCheckoutGate} from "@/lib/beastfusion/checkoutGate";
import {beastFusionTermsVersion} from "@/lib/beastfusion/terms";
export async function POST(req:Request){
 const s=createRouteClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user?.email)return NextResponse.json({error:"authentication_required"},{status:401});
 const input=await req.json().catch(()=>null);
 if(input?.accepted!==true||input?.terms_version!==beastFusionTermsVersion)
   return NextResponse.json({error:"terms_acceptance_required"},{status:400});
 const gate=beastFusionCheckoutGate(process.env);
 if(!gate.allowed)return NextResponse.json({error:gate.reason},{status:503});
 const key=process.env.STRIPE_SECRET_KEY,price=process.env.STRIPE_BEASTFUSION_PRO_PRICE_ID;
 if(!key||!price)return NextResponse.json({error:"beastfusion_checkout_not_configured"},{status:503});
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"acceptance_storage_unavailable"},{status:503});
 const stripe=new Stripe(key);
 try{
  const configured=await stripe.prices.retrieve(price);
  if(!configured.active||configured.currency.toLowerCase()!=="usd"||configured.unit_amount!==offer.purchasePriceUsd*100||
     configured.type!=="one_time")
   return NextResponse.json({error:"purchase_price_mismatch"},{status:503});
  const origin=new URL(req.url).origin;
  const session=await stripe.checkout.sessions.create({
   mode:"payment",customer_email:user.email,client_reference_id:user.id,
   line_items:[{price,quantity:1}],
   success_url:`${origin}/beastfusion/customer?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:`${origin}/beastfusion?purchase=cancelled`,
   metadata:{product:offer.sku,user_id:user.id,license_type:"perpetual",
     updates_months:String(offer.includedUpdatesMonths),terms_version:beastFusionTermsVersion}
  });
  if(!session.url)return NextResponse.json({error:"checkout_unavailable"},{status:503});
  const {error}=await admin.from("beastfusion_purchase_acceptances").insert({
    user_id:user.id,checkout_session_id:session.id,terms_version:beastFusionTermsVersion
  });
  if(error)return NextResponse.json({error:"agreement_record_failed"},{status:503});
  return NextResponse.json({url:session.url},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"checkout_unavailable"},{status:503});}
}