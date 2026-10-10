import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {signBeastFusionLicense} from "@/lib/beastfusion/signedLicense";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
 const supabase=createRouteClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401,headers});
 const id=new URL(request.url).searchParams.get("license_id");
 if(id!==null&&!/^bf_[A-Za-z0-9_-]{8,200}$/.test(id))
   return NextResponse.json({error:"invalid_license_id"},{status:400,headers});
 let query=supabase.from("beastfusion_licenses")
 .select("license_id,edition,status,updates_until,issued_at")
 .eq("user_id",user.id).eq("status","active").order("issued_at",{ascending:false});
 if(id)query=query.eq("license_id",id);
 const {data,error}=await query.limit(id?1:2);
 if(error)return NextResponse.json({error:"license_lookup_failed"},{status:503,headers});
 if(!data?.length)return NextResponse.json({error:"license_not_found"},{status:404,headers});
 if(!id&&data.length>1)return NextResponse.json({error:"select_license_id"},{status:409,headers});
 const license=data[0];
 const secret=process.env.BEASTFUSION_LICENSE_PRIVATE_KEY_PEM;
 if(!secret)return NextResponse.json({error:"license_delivery_not_configured"},{status:503,headers});
 const key=signBeastFusionLicense({license_id:license.license_id,customer_id:user.id,
 edition:license.edition,updates_until:license.updates_until,issued_at:license.issued_at},secret);
 return NextResponse.json({license_key:key,edition:license.edition,
 updates_until:license.updates_until},{headers});
}
