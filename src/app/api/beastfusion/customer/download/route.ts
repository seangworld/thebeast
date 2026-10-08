import {NextResponse} from "next/server";
import {createRouteClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {entitledCustomerRelease} from "@/lib/beastfusion/checkoutGate";
export const dynamic="force-dynamic";
export async function GET(){
 const client=createRouteClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"unauthorized"},{status:401});
 const {data:license,error}=await client.from("beastfusion_licenses").select("license_id,updates_until").eq("user_id",user.id).eq("status","active").order("updates_until",{ascending:false}).limit(1).maybeSingle();
 if(error)return NextResponse.json({error:"license_lookup_failed"},{status:503});
 if(!license)return NextResponse.json({error:"active_license_required"},{status:403});
 const release=entitledCustomerRelease(process.env.BEASTFUSION_CUSTOMER_RELEASES_JSON,license.updates_until);
 const bucket=process.env.BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET;
 if(!release||!bucket)return NextResponse.json({error:"entitled_download_not_available"},{status:503});
 const admin=createAdminClient();
 if(!admin)return NextResponse.json({error:"download_storage_unavailable"},{status:503});
 const {data:bucketInfo,error:bucketError}=await admin.storage.getBucket(bucket);
 if(bucketError||bucketInfo?.public!==false)return NextResponse.json({error:"private_download_storage_required"},{status:503});
 const {data,error:downloadError}=await admin.storage.from(bucket).createSignedUrl(release.storagePath,60,{download:true});
 if(downloadError||!data?.signedUrl)return NextResponse.json({error:"download_unavailable"},{status:503});
 return NextResponse.json({download_url:data.signedUrl,version:release.version,sha256:release.sha256,expires_in_seconds:60},{headers:{"Cache-Control":"private, no-store"}});
}

