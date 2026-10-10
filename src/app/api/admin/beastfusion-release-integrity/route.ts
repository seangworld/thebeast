import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {customerReleaseCatalog} from "@/lib/beastfusion/checkoutGate";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const privateHeaders={"Cache-Control":"private, no-store"};
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:privateHeaders});

export async function GET(){
 const userClient=createRouteClient();
 const {data:{user},error:authError}=await userClient.auth.getUser();
 if(authError||!user)return reply({error:"authentication_required"},401);
 const {data:profile,error:roleError}=await userClient.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(roleError)return reply({error:"access_check_failed"},503);
 if(profile?.role!=="admin")return reply({error:"owner_access_required"},403);

 const expectedVersion=process.env.BEASTFUSION_CUSTOMER_ARTIFACT_VERSION;
 const expectedHash=process.env.BEASTFUSION_CUSTOMER_ARTIFACT_SHA256;
 const bucket=process.env.BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET;
 const release=customerReleaseCatalog(process.env.BEASTFUSION_CUSTOMER_RELEASES_JSON)
  .find(entry=>entry.version===expectedVersion&&entry.sha256===expectedHash);
 if(!bucket||!release)return reply({status:"not_configured"},503);
 const admin=createAdminClient();
 if(!admin)return reply({status:"storage_unavailable"},503);
 const {data:bucketInfo,error:bucketError}=await admin.storage.getBucket(bucket);
 if(bucketError||bucketInfo?.public!==false)return reply({status:"private_bucket_required"},503);
 const {data,error}=await admin.storage.from(bucket).download(release.storagePath);
 if(error||!data)return reply({status:"download_failed"},503);
 if(data.size>50*1024*1024)return reply({status:"file_too_large"},413);
 const actualHash=createHash("sha256").update(Buffer.from(await data.arrayBuffer())).digest("hex");
 const matched=actualHash===release.sha256;
 return reply({status:matched?"verified":"mismatch",version:release.version,
  storagePath:release.storagePath,bytes:data.size,sha256:actualHash,
  matches_expected:matched},matched?200:409);
}
