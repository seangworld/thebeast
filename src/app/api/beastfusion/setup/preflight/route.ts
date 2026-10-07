import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
const required=["license","administrator","workspace","github","repositories","byok","developer","reviewer","authority","budget","recovery"];
export async function POST(){
 const supabase=createRouteClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
 const [{data:license,error:licenseError},{data:setup,error:setupError}]=await Promise.all([
  supabase.from("beastfusion_licenses").select("status").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle(),
  supabase.from("beastfusion_setup_state").select("completed_steps,verification").eq("user_id",user.id).maybeSingle()
 ]);
 if(licenseError||setupError)return NextResponse.json({error:"preflight_state_unavailable",ready:false,launch_allowed:false},{status:503});
 // User-supplied completed_steps/verification are not authoritative security evidence.
 const gates=Object.fromEntries(required.map(k=>[k,k==="license"&&Boolean(license)]));
 const failures=required.filter(k=>!gates[k]);
 return NextResponse.json({ready:false,gates,failures,launch_allowed:false,completed_steps:Array.isArray(setup?.completed_steps)?setup.completed_steps:[],message:"Customer runtime activation requires independently verified server-side setup attestations. Self-reported completion cannot authorize launch."});
}
