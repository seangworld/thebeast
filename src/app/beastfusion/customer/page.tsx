import {createRouteClient} from "@/lib/supabase/server";
import Link from "next/link";
import CustomerActions from "./CustomerActions";
export default async function Customer(){
 const s=createRouteClient();
 const {data:{user}}=await s.auth.getUser();
 const {data,error}=user?await s.from("beastfusion_licenses")
 .select("license_id,edition,status,updates_until,issued_at,installation_id")
 .eq("user_id",user.id).order("issued_at",{ascending:false}):{data:null,error:null};
 return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-slate-100">
 <div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">Your BeastFusion</h1>
 <p className="mt-2 text-sm text-slate-300">Each purchased key activates one installation. Keep activation keys private.</p>
 {error?<p role="alert" className="mt-5 text-red-300">We could not load your licenses. Please try again or contact support.</p>:(data??[]).length?(data??[]).map(license=><div key={license.license_id}
 className="mt-6 rounded-2xl border border-white/10 p-6">
 <p className="font-bold">BeastFusion Professional {license.edition==="professional-internal-test"?"— INTERNAL TEST":""}</p>
 {license.edition==="professional-internal-test"?<p className="mt-2 text-sm text-amber-200">Temporary acceptance-test license. No Stripe purchase or commercial entitlement was issued. This key expires and will be revoked after testing.</p>:null}
 <p className="mt-2 break-all text-sm text-slate-400">License: {license.license_id}</p>
 <p className="text-sm text-slate-400">Status: {license.status}</p>
 <p className="text-sm text-slate-400">Installation: {license.installation_id?"Activated":"Not yet activated"}</p>
 <p className="text-sm text-slate-400">Updates included through: {license.updates_until}</p>
 <CustomerActions active={license.status==="active"} licenseId={license.license_id}/>
 <div className="mt-5 flex flex-wrap gap-3">
 
 <Link className="beast-button" href="/beastfusion/setup">Start guided setup</Link>
 <Link className="beast-button" href="/beastfusion/support">Support or license transfer</Link>
 </div></div> ):<div className="mt-5 space-y-3"><p className="text-slate-400">No production BeastFusion license is associated with this account.</p><p className="text-sm text-slate-400">A test purchase or test activation key does not appear in the live customer account. If you previously purchased a live license and do not see it, contact support before buying again.</p><Link className="beast-button inline-block" href="/beastfusion/support">Contact support</Link></div>}
 {!error&&(data??[]).length>0?<Link className="beast-button mt-6 inline-block" href="/beastfusion">Purchase another installation license</Link>:null}
 </div></main>;
}
