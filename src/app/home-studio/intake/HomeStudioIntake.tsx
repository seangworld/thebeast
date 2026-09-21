"use client";
import { useState } from "react";
import { homeStudioRoomTypes, homeStudioStyles, normalizeHomeStudioProject, normalizeHomeStudioWorkspace } from "@/lib/homeStudio";
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white";
export function HomeStudioIntake() {
  const [values, setValues] = useState({ name: "", email: "", roomName: "", roomType: "Living room", style: "Modern", dimensions: "", colors: "", budget: "", mustKeep: "", needs: "", openings: "", notes: "" });
  const [downloaded, setDownloaded] = useState(false);
  return <main className="mx-auto max-w-3xl space-y-5 px-5 py-12 text-slate-100"><p className="font-bold text-cyan-200">BEASTHOME · HOME STUDIO</p><h1 className="text-3xl font-black">Tell us about your room</h1><p className="text-slate-300">Prepare a room brief for your designer. This form stays in your browser until you download it. Nothing is submitted, purchased, or sent automatically.</p><form className="space-y-5" onSubmit={event => {
    event.preventDefault(); const workspace = normalizeHomeStudioWorkspace({client:{name:values.name,email:values.email}});
    const project = normalizeHomeStudioProject({...values,workspace});
    if (!project) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:2,project,plan:null,photosStored:false},null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="home-studio-client-brief.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setDownloaded(true);
  }}>
    <div className="grid gap-4 sm:grid-cols-2">{([['name','Your name',100],['email','Email (optional)',200],['roomName','Room or project name',80],['dimensions','Measurements and units',200],['colors','Colors you like',300],['budget','Shopping budget',80]] as const).map(([key,label,max])=><label className="text-sm" key={key}>{label}<input className={input} type={key==='email'?'email':'text'} value={values[key]} required={key==='name'||key==='roomName'} maxLength={max} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></label>)}
      <label className="text-sm">Room type<select className={input} value={values.roomType} onChange={e=>setValues(v=>({...v,roomType:e.target.value}))}>{homeStudioRoomTypes.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="text-sm">Style<select className={input} value={values.style} onChange={e=>setValues(v=>({...v,style:e.target.value}))}>{homeStudioStyles.map(v=><option key={v}>{v}</option>)}</select></label>
    </div>
    {([['mustKeep','What must stay?',800],['needs','What should the room do for you?',800],['openings','Doors, windows, and fixed features',500],['notes','Other preferences or constraints',1200]] as const).map(([key,label,max])=><label className="block text-sm" key={key}>{label}<textarea className={input} rows={3} maxLength={max} value={values[key]} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></label>)}
    <p className="text-sm text-slate-300">Send the downloaded brief to your designer through your agreed channel. Send up to four room photos separately, avoiding people, mail, screens, and private documents. Agree on service scope and price before paying.</p><button className="beast-button-primary" type="submit">Download my room brief</button>
    {downloaded?<p role="status" className="text-cyan-200">Your brief is ready to share. Downloading did not submit it or create an order.</p>:null}
  </form></main>;
}
