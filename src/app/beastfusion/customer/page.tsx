import {createRouteClient} from "@/lib/supabase/server";
import Link from "next/link";
export default async function Customer(){
 const s=createRouteClient();
 const {data:{user}}=await s.auth.getUser();
 const {data}=user?await s.from("beastfusion_licenses")
 .select("license_id,edition,status,updates_until,issued_at,installation_id")
 .eq("user_id",user.id).order("issued_at",{ascending:false}):{data:null};
 return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-slate-100">
 <div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">Your BeastFusion</h1>
 <p className="mt-2 text-sm text-slate-300">Each purchased key activates one installation. Keep activation keys private.</p>
 {(data??[]).length?(data??[]).map(license=><div key={license.license_id}
 className="mt-6 rounded-2xl border border-white/10 p-6">
 <p className="font-bold">BeastFusion Professional</p>
 <p className="mt-2 break-all text-sm text-slate-400">License: {license.license_id}</p>
 <p className="text-sm text-slate-400">Status: {license.status}</p>
 <p className="text-sm text-slate-400">Installation: {license.installation_id?"Activated":"Not yet activated"}</p>
 <p className="text-sm text-slate-400">Updates included through: {license.updates_until}</p>
 <div className="mt-5 flex flex-wrap gap-3">
 <Link className="beast-button" href={`/api/beastfusion/customer/license?license_id=${encodeURIComponent(license.license_id)}`}>View activation key</Link>
 <Link className="beast-button" href="/beastfusion/setup">Start guided setup</Link>
 <Link className="beast-button" href="/beastfusion/support">Support or license transfer</Link>
 </div></div>):<p className="mt-5 text-slate-400">No BeastFusion license is associated with this account yet.</p>}
 <Link className="beast-button mt-6 inline-block" href="/beastfusion">Purchase another installation license</Link>
 </div></main>;
}
