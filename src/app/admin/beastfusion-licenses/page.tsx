import {createRouteClient} from "@/lib/supabase/server";
import {notFound,redirect} from "next/navigation";
import TransferForm from "./TransferForm";
export default async function BeastFusionLicenseTransfers(){
 const client=createRouteClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/login?next=%2Fadmin%2Fbeastfusion-licenses");
 const {data:profile}=await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="admin")notFound();
 return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-slate-100"><div className="mx-auto max-w-2xl">
 <h1 className="text-3xl font-black">BeastFusion License Transfers</h1>
 <p className="mt-3 text-slate-300">Owner-only support: reset a verified customer&apos;s activated key for one replacement installation. This disables the old installation identity at the activation server. Record the reason before confirming.</p>
 <TransferForm/>
 </div></main>;
}