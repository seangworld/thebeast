import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const privateHeaders={"Cache-Control":"no-store"};
 const s=createRouteClient();
 const {data:{user},error:authError}=await s.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"unauthorized"},{status:401,headers:privateHeaders});
 const {data:profile,error:profileError}=await s.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profileError)return NextResponse.json({error:"access_check_failed"},{status:503,headers:privateHeaders});
 if(profile?.role!=="admin")return NextResponse.json({error:"forbidden"},{status:403,headers:privateHeaders});
 let body:unknown;
 try{const raw=await request.text();if(raw.length>3000)throw Error("too_long");body=JSON.parse(raw);}catch{return NextResponse.json({error:"invalid_request"},{status:400,headers:privateHeaders});}
 const {license_id,reason,confirmed}=body && typeof body==="object"?body as Record<string,unknown>:{};
 if(confirmed!==true||typeof license_id!=="string"||!/^bf_[A-Za-z0-9_-]{8,200}$/.test(license_id)||
 typeof reason!=="string"||reason.trim().length<10||reason.length>500)
 return NextResponse.json({error:"invalid_request"},{status:400,headers:privateHeaders});
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"transfer_unavailable"},{status:503,headers:privateHeaders});
 const {data,error}=await admin.rpc("beastfusion_reset_installation",{
   p_license_id:license_id,p_admin_id:user.id,p_reason:reason.trim()
 });
 if(error)return NextResponse.json({error:"transfer_unavailable"},{status:503,headers:privateHeaders});
 if(data!==true)return NextResponse.json({error:"not_active_or_not_bound"},{status:409,headers:privateHeaders});
 return NextResponse.json({ok:true,license_id,reset:true},{headers:privateHeaders});
}
