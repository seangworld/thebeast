import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {verifyBeastFusionLicense} from "@/lib/beastfusion/signedLicense";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request:Request){
  if(Number(request.headers.get("content-length")||0)>10000)
    return NextResponse.json({error:"invalid_request"},{status:400,headers});
  let input:unknown;
  try{
    const raw=await request.text();
    if(raw.length>10000)return NextResponse.json({error:"invalid_request"},{status:400,headers});
    input=JSON.parse(raw);
  }catch{return NextResponse.json({error:"invalid_request"},{status:400,headers});}
  if(!input||typeof input!=="object")return NextResponse.json({error:"invalid_request"},{status:400,headers});
  const {license_key,installation_id}=input as Record<string,unknown>;
  if(typeof license_key!=="string"||license_key.length>4096||
     typeof installation_id!=="string"||!uuid.test(installation_id))
    return NextResponse.json({error:"invalid_request"},{status:400,headers});
  const publicKey=process.env.BEASTFUSION_LICENSE_PUBLIC_KEY_PEM;
  if(!publicKey)return NextResponse.json({error:"activation_unavailable"},{status:503,headers});
  const license=verifyBeastFusionLicense(license_key,publicKey);
  if(!license||!uuid.test(license.customer_id)||typeof license.license_id!=="string")
    return NextResponse.json({error:"invalid_license"},{status:403,headers});
  const admin=createAdminClient();
  if(!admin)return NextResponse.json({error:"activation_unavailable"},{status:503,headers});
  const {data,error}=await admin.rpc("beastfusion_bind_installation",{
    p_license_id:license.license_id,
    p_customer_id:license.customer_id,
    p_installation_id:installation_id
  });
  if(error)return NextResponse.json({error:"activation_unavailable"},{status:503,headers});
  if(data==="already_bound")return NextResponse.json({error:"license_already_activated"},{status:409,headers});
  if(data!=="activated")return NextResponse.json({error:"invalid_license"},{status:403,headers});
  return NextResponse.json({activated:true,installation_id},{headers});
}
