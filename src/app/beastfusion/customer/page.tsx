import {createRouteClient} from "@/lib/supabase/server";
import Link from "next/link";
import CustomerActions from "./CustomerActions";

export const dynamic = "force-dynamic";

export default async function Customer() {
  const supabase = createRouteClient();
  const {data: {user}} = await supabase.auth.getUser();
  const {data, error} = user
    ? await supabase.from("beastfusion_licenses").select("license_id,edition,status,updates_until,issued_at").eq("user_id", user.id).order("issued_at", {ascending: false}).limit(1).maybeSingle()
    : {data: null, error: null};
  return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-slate-100 print:min-h-0 print:bg-white print:text-black">
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black">Your BeastFusion</h1>
      {error ? <p role="alert" className="mt-5">We couldn't load your license. Refresh this page or <Link href="/beastfusion/support">contact support</Link>.</p>
      : data ? <div className="mt-6 rounded-2xl border border-white/10 p-6 print:border-black">
        <p className="font-bold">BeastFusion Professional</p>
        <p className="mt-2 break-all text-sm text-slate-400 print:text-black">License: {data.license_id}</p>
        <p className="text-sm text-slate-400 print:text-black">Status: {data.status}</p>
        <p className="text-sm text-slate-400 print:text-black">Updates included through: {data.updates_until}</p>
        <CustomerActions active={data.status === "active"} licenseId={data.license_id}/>
        {data.status !== "active" ? <p className="mt-3 text-sm">This license is inactive. Contact support for help with access.</p> : null}
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          {data.status === "active" ? <Link className="beast-button" href="/beastfusion/setup">Start guided setup</Link> : null}
          <Link className="beast-button" href="/beastfusion/support">Support</Link>
        </div>
      </div>
      : <div className="mt-5"><p>{user ? "No BeastFusion license is associated with this account yet." : "Sign in to access your BeastFusion license and downloads."}</p><Link className="beast-button mt-3 inline-block" href={user ? "/beastfusion" : "/login?next=%2Fbeastfusion%2Fcustomer"}>{user ? "View BeastFusion" : "Sign in"}</Link></div>}
    </div>
  </main>;
}
