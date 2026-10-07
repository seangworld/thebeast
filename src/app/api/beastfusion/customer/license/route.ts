import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {signBeastFusionLicense} from "@/lib/beastfusion/signedLicense";
export const dynamic="force-dynamic";
export async function GET(){
 const supabase=createRouteClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
 const {data,error}=await supabase.from("beastfusion_licenses").select("license_id,edition,status,updates_until,issued_at").eq("user_id",user.id).eq("status","active").order("issued_at",{ascending:false}).limit(1).maybeSingle();
 if(error)return NextResponse.json({error:"license_lookup_failed"},{status:503});
 if(!data)return NextResponse.json({error:"license_not_found"},{status:404});
 const secret=process.env.BEASTFUSION_LICENSE_SIGNING_SECRET;
 if(!secret||secret.length<32)return NextResponse.json({error:"license_delivery_not_configured"},{status:503});
 const key=signBeastFusionLicense({license_id:data.license_id,customer_id:user.id,edition:data.edition,updates_until:data.updates_until,issued_at:data.issued_at},secret);
 return NextResponse.json({license_key:key,edition:data.edition,updates_until:data.updates_until},{headers:{"Cache-Control":"private, no-store"}});
}
