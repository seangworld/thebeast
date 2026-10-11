import {createAdminClient} from "@/lib/supabase/admin";
export async function internalTestLicensePermitted(licenseId:string,edition:string){
 if(edition!=="professional-internal-test")return true;
 const admin=createAdminClient();
 if(!admin)return false;
 const {data,error}=await admin.from("beastfusion_internal_test_licenses")
   .select("expires_at,revoked_at").eq("license_id",licenseId).maybeSingle();
 return !error&&!!data&&!data.revoked_at&&Date.parse(data.expires_at)>Date.now();
}
