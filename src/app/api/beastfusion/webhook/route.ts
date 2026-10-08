import Stripe from "stripe";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateBeastFusionPurchase,validateBeastFusionLineItems} from "@/lib/beastfusion/validatePurchase";
import {stripeKeyMode} from "@/lib/beastfusion/checkoutGate";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const secret=process.env.STRIPE_BEASTFUSION_WEBHOOK_SECRET;
 const key=process.env.STRIPE_SECRET_KEY;
 if(!secret||!key)return NextResponse.json({error:"beastfusion_webhook_not_configured"},{status:503});
 const signature=request.headers.get("stripe-signature");
 if(!signature)return NextResponse.json({error:"missing_signature"},{status:400});
 const stripe=new Stripe(key);let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await request.text(),signature,secret);}
 catch{return NextResponse.json({error:"invalid_signature"},{status:400});}
 if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))return NextResponse.json({received:true});
 const session=event.data.object as Stripe.Checkout.Session;
 if(session.metadata?.product!=="beastfusion-professional")return NextResponse.json({received:true});
 const mode=stripeKeyMode(key);
 if(!mode)return NextResponse.json({error:"invalid_stripe_key_mode"},{status:503});
 if(mode==="live"&&process.env.VERCEL_ENV!=="production")return NextResponse.json({error:"live_payment_in_test_environment"},{status:503});
 if(mode==="test"&&process.env.VERCEL_ENV==="production")return NextResponse.json({error:"test_payment_in_production"},{status:503});
 const check=validateBeastFusionPurchase(session, mode==="live");
 if(!check.ok){if(check.reason==="not_paid")return NextResponse.json({received:true,issued:false});return NextResponse.json({error:check.reason},{status:400});}
 const expectedPrice=process.env.STRIPE_BEASTFUSION_PRO_PRICE_ID;
 if(!expectedPrice)return NextResponse.json({error:"beastfusion_price_not_configured"},{status:503});
 let lineItems:Stripe.ApiList<Stripe.LineItem>;
 try{lineItems=await stripe.checkout.sessions.listLineItems(session.id,{limit:2});}
 catch{return NextResponse.json({error:"beastfusion_purchase_verification_unavailable"},{status:503});}
 if(!validateBeastFusionLineItems(lineItems.data,expectedPrice,lineItems.has_more))
  return NextResponse.json({error:"beastfusion_price_mismatch"},{status:400});
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"license_storage_unavailable"},{status:503});
 // Retries must never reset a revoked license or extend update coverage.
 const {error}=await admin.from("beastfusion_licenses").upsert({user_id:check.userId,license_id:check.licenseId,edition:"professional",status:"active",updates_until:check.updatesUntil},{onConflict:"license_id",ignoreDuplicates:true});
 if(error)return NextResponse.json({error:"license_issue_failed"},{status:500});
 return NextResponse.json({received:true,issued:true});
}
