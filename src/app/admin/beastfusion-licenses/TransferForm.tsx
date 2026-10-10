"use client";
import {useState} from "react";
export default function TransferForm(){
 const [license,setLicense]=useState("");
 const [reason,setReason]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState("");
 const [error,setError]=useState("");
 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(!confirmed||busy)return;
  setBusy(true);setStatus("");setError("");
  try{
   const res=await fetch("/api/admin/beastfusion-license-transfer",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({license_id:license.trim(),reason:reason.trim(),confirmed:true})});
   const payload=await res.json();
   if(!res.ok){setError(payload.error||"The transfer could not be processed.");return;}
   setStatus("License activation reset. The customer can activate the key on the replacement computer.");
   setConfirmed(false);setLicense("");setReason("");
  }catch{setError("Could not reach the transfer service. No success was recorded.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-white/10 p-5">
  <label className="block text-sm">Customer license ID
   <input required maxLength={203} value={license} onChange={e=>setLicense(e.target.value)}
    placeholder="bf_cs_..." className="mt-2 w-full rounded bg-slate-900 p-3 text-white"/></label>
  <label className="block text-sm">Verified reason (minimum 10 characters)
   <textarea required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}
    className="mt-2 w-full rounded bg-slate-900 p-3 text-white" rows={4} placeholder="Verified customer requested a replacement computer transfer"/></label>
  <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed}
   onChange={e=>setConfirmed(e.target.checked)}/>
   <span>I verified the customer's request and authorize deactivating the previous installation identity.</span></label>
  <button type="submit" disabled={!confirmed||busy} className="beast-button disabled:opacity-50">
   {busy?"Processing…":"Reset installation binding"}</button>
  {status?<p role="status" className="text-emerald-300">{status}</p>:null}
  {error?<p role="alert" className="text-red-300">{error}</p>:null}
 </form>;
}