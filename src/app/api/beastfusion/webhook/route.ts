import Stripe from "stripe";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateBeastFusionPurchase} from "@/lib/beastfusion/validatePurchase";
import {beastFusionTermsVersion} from "@/lib/beastfusion/terms";
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
 if(event.type!=="checkout.session.completed")return NextResponse.json({received:true});
 const session=event.data.object as Stripe.Checkout.Session;
 if(session.metadata?.product!=="beastfusion-professional")return NextResponse.json({received:true});
 const check=validateBeastFusionPurchase(session, key.startsWith("sk_live_"));
 if(!check.ok){if(check.reason==="not_paid")return NextResponse.json({received:true,issued:false});return NextResponse.json({error:check.reason},{status:400});}
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"license_storage_unavailable"},{status:503});
 const {data:acceptance,error:acceptanceError}=await admin.from("beastfusion_purchase_acceptances")
 .select("id").eq("checkout_session_id",session.id).eq("user_id",check.userId)
 .eq("terms_version",beastFusionTermsVersion).maybeSingle();
 if(acceptanceError)return NextResponse.json({error:"agreement_lookup_failed"},{status:503});
 if(!acceptance)return NextResponse.json({error:"purchase_agreement_missing"},{status:409});
 const {error}=await admin.from("beastfusion_licenses").upsert({user_id:check.userId,license_id:check.licenseId,edition:"professional",status:"active",updates_until:check.updatesUntil},{onConflict:"license_id"});
 if(error)return NextResponse.json({error:"license_issue_failed"},{status:500});
 return NextResponse.json({received:true,issued:true});
}