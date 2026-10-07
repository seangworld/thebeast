import Stripe from "stripe";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
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
 if(session.payment_status!=="paid")return NextResponse.json({received:true,issued:false});
 const customerId=session.metadata?.user_id;
 if(!customerId||customerId!==session.client_reference_id)return NextResponse.json({error:"customer_identity_mismatch"},{status:400});
 if(session.mode!=="payment"||session.amount_total!==49900||session.currency?.toLowerCase()!=="usd")return NextResponse.json({error:"purchase_mismatch"},{status:400});
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"license_storage_unavailable"},{status:503});
 const purchasedAt=new Date(session.created*1000);
 const updatesUntil=new Date(purchasedAt);
 updatesUntil.setUTCFullYear(updatesUntil.getUTCFullYear()+1);
 const {error}=await admin.from("beastfusion_licenses").upsert({user_id:customerId,license_id:`bf_${session.id}`,edition:"professional",status:"active",updates_until:updatesUntil.toISOString().slice(0,10)},{onConflict:"license_id"});
 if(error)return NextResponse.json({error:"license_issue_failed"},{status:500});
 return NextResponse.json({received:true,issued:true});
}