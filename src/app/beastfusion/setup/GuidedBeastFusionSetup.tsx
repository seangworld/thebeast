"use client";
import {useEffect,useRef,useState} from "react";


type Choice="yes"|"no"|"unsure"|null;
type Step={name:string;summary:string;question?:string;why?:string;noHelp?:string[];verify?:string};
const steps:Step[]=[
{name:"Welcome",summary:"We'll guide you from a blank installation to your first governed AI development job.",question:"Ready to set up BeastFusion?",why:"You do not need to be a software engineer. We explain each requirement before asking you to configure it."},
{name:"System check",summary:"BeastFusion checks the basics it needs to run safely.",question:"Is this the computer/server where you want BeastFusion to run?",why:"Fusion needs a supported runtime, storage, HTTPS outside local development, and secure credential storage.",noHelp:["Choose the computer or server that will stay available when you want Fusion to work.","You can inspect the steps here, but the runtime system check is not implemented in this preview."],verify:"Run system check"},
{name:"Administrator",summary:"Create the person who controls this BeastFusion installation.",question:"Are you the person who should have owner/admin authority?",why:"The administrator controls permissions, budgets and consequential approval gates.",noHelp:["Have the intended owner complete this step.","Do not share an administrator password or provider key through support."],verify:"Verify administrator"},
{name:"Workspace",summary:"Give your company or project area a clear home inside Fusion.",question:"Do you know what you want to call your workspace?",why:"A workspace keeps projects, repositories, policies, evidence and budgets together.",noHelp:["Use your company, team or product name. Example: Acme Development.","You can rename it later without changing your repositories."],verify:"Save workspace"},
{name:"GitHub",summary:"Connect the service BeastFusion uses to work safely with your source code.",question:"Do you already have a GitHub account?",why:"GitHub stores your code and its change history. BeastFusion uses only the repositories you authorize.",noHelp:["Create a GitHub account using GitHub's signup process. A free account is enough to begin.","Verify your email, then return here and choose Yes.","Fusion will test the connection before continuing."],verify:"Connect & test GitHub"},
{name:"Repositories",summary:"Choose exactly which software projects Fusion may access.",question:"Is your project already stored in a GitHub repository?",why:"A repository is the folder/history for one software project.",noHelp:["If your project is only on your computer, create a GitHub repository and upload/push the project.","If you are starting fresh, create an empty repository first.","Return here and Fusion will verify access before marking this complete."],verify:"Find & verify repositories"},
{name:"AI provider",summary:"Connect the AI account that powers your Developer, Reviewer and other AI roles.",question:"Do you already have an AI provider/API account for BeastFusion?",why:"BeastFusion orchestrates the work; your AI provider supplies the model intelligence. With BYOK, the provider bills you directly.",noHelp:["Choose a supported AI provider and create an API account.","Enable API billing if that provider requires it.","Create a credential in the provider's dashboard, enter it only in BeastFusion's secure credential field, then test it.","Never paste your API key into a support ticket."],verify:"Test AI connection"},
{name:"Authority",summary:"Tell Fusion what it may do automatically and what must stop for you.",question:"Would you like to start with BeastFusion's recommended safety defaults?",why:"These rules prevent an AI worker from granting itself more authority.",noHelp:["You can customize each permission individually.","Recommended: allow bounded development and review; require explicit approval for Production, spending and security-sensitive changes."],verify:"Validate authority policy"},
{name:"Budget",summary:"Set hard limits so AI work cannot create an uncontrolled bill.",question:"Do you know the maximum AI budget you want to allow?",why:"BYOK means your provider charges you. The installed runtime must enforce your configured ceiling before jobs can run. This preview validates the setting only.",noHelp:["Start conservatively; you can raise the limit later.","Use a warning threshold below the hard stop so you have time to review usage."],verify:"Validate budget"},
{name:"Preflight",summary:"Fusion rechecks everything before it says setup is complete.",question:"Ready for the final preflight?",why:"We do not call setup complete merely because you clicked through the screens.",verify:"Run full preflight"},
{name:"First project",summary:"We'll walk you through your first real governed job.",question:"Would you like BeastFusion to guide your first project?",why:"This teaches the Developer → Tests → Reviewer → Approval workflow before you operate Fusion on your own.",noHelp:["The first project requires a verified customer runtime.","This preview cannot run or approve a development job yet."],verify:"Start guided first project"},
{name:"Launch",summary:"Launch remains unavailable until the customer runtime passes all required checks.",why:"Open the Control Center to manage projects, work, approvals, agents, evidence, costs and diagnostics."}
];

const key="beastfusion.setup.v5_1";
export default function GuidedBeastFusionSetup(){
 const [index,setIndex]=useState(0),[done,setDone]=useState<number[]>([]),[choice,setChoice]=useState<Choice>(null),[showHelp,setShowHelp]=useState(false),[testing,setTesting]=useState(false),[message,setMessage]=useState("");
 const [workspace,setWorkspace]=useState(""),[repository,setRepository]=useState(""),[githubToken,setGithubToken]=useState(""),[provider,setProvider]=useState("openai"),[providerKey,setProviderKey]=useState(""),[budget,setBudget]=useState("25");
 const busy=useRef(false);
 // Stored progress is a convenience, never verification evidence.
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");if(Number.isInteger(v?.index)&&v.index>=0&&v.index<steps.length)setIndex(v.index);}catch{}},[]);
 const pct=Math.round((done.length/steps.length)*100),step=steps[index];
 const navigate=(target:number)=>{if(busy.current)return;setChoice(null);setShowHelp(false);setMessage("");setGithubToken("");setProviderKey("");setIndex(target);try{localStorage.setItem(key,JSON.stringify({index:target}));}catch{}};
 const request=async(path:string,payload:Record<string,unknown>)=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:controller.signal,body:JSON.stringify(payload)});
   if(!r.ok)throw new Error(r.status===401?"Please sign in again before checking setup.":"The setup service could not complete this request. Please retry.");
   return await r.json();
  }finally{clearTimeout(timer);}
 };
 const verify=async()=>{
  if(busy.current)return;busy.current=true;setTesting(true);setMessage("");setDone(v=>v.filter(i=>i!==index));
  try{
   let payload:Record<string,unknown>|null=null;
   if(step.name==="Workspace")payload={kind:"workspace",workspace};
   if(step.name==="GitHub"||step.name==="Repositories")payload={kind:"github",repository,token:githubToken};
   if(step.name==="AI provider")payload={kind:"ai_provider",provider,key:providerKey};
   if(step.name==="Authority")payload={kind:"authority",production_requires_approval:true,unapproved_spending:false};
   if(step.name==="Budget"){
    const limit=Number(budget);if(!Number.isFinite(limit)||limit<=0)throw new Error("Enter a finite budget greater than zero.");
    payload={kind:"budget",limit};
   }
   if(step.name==="Preflight"){
    const x=await request("/api/beastfusion/setup/preflight",{});
    const failures=Array.isArray(x.failures)?x.failures.filter((v:unknown)=>typeof v==="string"):[];
    // Runtime launch is not implemented in this preview, even if a future API reports ready.
    throw new Error(failures.length?"Preflight incomplete: "+failures.join(", ")+". Customer runtime launch is unavailable in this preview.":"Customer runtime launch is unavailable in this preview. Required runtime checks must be implemented before setup can finish.");
   }
   if(!payload)throw new Error("This check requires the installed customer runtime and is not available in this preview. This step has not been verified.");
   const result=await request("/api/beastfusion/setup/verify",payload);
   if(result.ok!==true)throw new Error(result.reason||"Verification failed.");
   const nextDone=Array.from(new Set([...done,index]));
   await request("/api/beastfusion/setup/state",{current_step:step.name,completed_steps:nextDone,workspace_name:workspace,github_repository:repository,ai_provider:provider,authority:{production_requires_approval:true,unapproved_spending:false},budget:{limit:Number(budget)}});
   setDone(nextDone);
   setMessage(step.name==="AI provider"?"Connection tested and progress saved. Your credential was not stored; runtime BYOK setup is still required.":step.name==="Authority"||step.name==="Budget"?"Settings validated and progress saved. Runtime enforcement is still required.":"Check passed and progress saved. This does not authorize runtime launch.");
  }catch(e){setMessage(e instanceof Error&&e.name==="AbortError"?"The setup request timed out. Please retry.":e instanceof Error?e.message:"Verification failed. Please retry.");}
  finally{setGithubToken("");setProviderKey("");busy.current=false;setTesting(false);}
 };
 const next=()=>navigate(Math.min(index+1,steps.length-1));
 return <main className="min-h-screen bg-[#07090d] px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">BeastFusion Guided Setup Preview</p><h1 className="mt-2 text-3xl font-black">We&apos;ll get you set up correctly.</h1>
  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">No vendor installation is required. If you have something, we&apos;ll connect and test it. If you don&apos;t, we&apos;ll show you how to get it. If you don&apos;t know what something means, we&apos;ll explain it.</p>
  <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-200">Setup preview: workspace and connection checks are available. Installed runtime checks, administrator setup, enforced budgets and the first job are still being built. This guide cannot complete activation or launch yet.</p>
  <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-300" style={{width:`${pct}%`}}/></div><span className="text-xs font-bold text-slate-400">{pct}%</span></div>
  <div className="mt-7 grid gap-5 lg:grid-cols-[250px_1fr]"><nav className="max-h-[70vh] space-y-2 overflow-auto pr-1">{steps.map((s,i)=><button key={s.name} disabled={testing} onClick={()=>navigate(i)} className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${i===index?"border-amber-300/50 bg-amber-300/10 text-white":"border-white/10 text-slate-400"}`}><span className="mr-2">{done.includes(i)?"✓":i+1}</span>{s.name}</button>)}</nav>
   <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Step {index+1} of {steps.length}</p><h2 className="mt-2 text-2xl font-black">{step.name}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{step.summary}</p>
    {step.question?<div className="mt-6"><p className="font-bold text-white">{step.question}</p><div className="mt-3 flex flex-wrap gap-2">{(["yes","no","unsure"] as const).map(v=><button key={v} onClick={()=>{setChoice(v);setShowHelp(v!=="yes");}} className={`rounded-xl border px-4 py-2 text-sm font-bold ${choice===v?"border-amber-300 bg-amber-300/10":"border-white/15"}`}>{v==="yes"?"Yes":v==="no"?"No":"I'm not sure"}</button>)}</div></div>:null}
    {(choice==="unsure"||showHelp)&&step.why?<div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4"><p className="font-bold text-white">What this means</p><p className="mt-2 text-sm leading-6 text-slate-300">{step.why}</p></div>:null}
    {choice==="no"&&step.noHelp?<div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><p className="font-bold text-white">We&apos;ll help you get it</p><ol className="mt-2 space-y-2 text-sm text-slate-300">{step.noHelp.map((x,i)=><li key={x}>{i+1}. {x}</li>)}</ol></div>:null}
    {step.name==="Workspace"?<input aria-label="Workspace name" disabled={testing} value={workspace} onChange={e=>{setWorkspace(e.target.value);setDone(v=>v.filter(i=>i!==3));}} placeholder="Example: Acme Development" className="mt-5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3"/>:null}
    {(step.name==="GitHub"||step.name==="Repositories")?<div className="mt-5 space-y-3"><input aria-label="GitHub repository" disabled={testing} value={repository} onChange={e=>{setRepository(e.target.value);setDone(v=>v.filter(i=>i!==4&&i!==5));}} placeholder="owner/repository" className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3"/><input aria-label="GitHub verification credential" autoComplete="off" disabled={testing} type="password" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="GitHub credential (used only for this verification)" className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3"/></div>:null}
    {step.name==="AI provider"?<div className="mt-5 space-y-3"><select aria-label="AI provider" disabled={testing} value={provider} onChange={e=>{setProvider(e.target.value);setDone(v=>v.filter(i=>i!==6));}} className="w-full rounded-xl border border-white/15 bg-[#10141b] px-4 py-3"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select><input aria-label="AI provider verification credential" autoComplete="off" disabled={testing} type="password" value={providerKey} onChange={e=>setProviderKey(e.target.value)} placeholder="API credential (tested, never echoed)" className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3"/></div>:null}
    {step.name==="Budget"?<input disabled={testing} type="number" min="1" value={budget} onChange={e=>{setBudget(e.target.value);setDone(v=>v.filter(i=>i!==8));}} className="mt-5 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" aria-label="Monthly AI budget"/>:null}
    {step.verify&&choice==="yes"?<div className="mt-6"><button onClick={verify} disabled={testing} className="beast-button">{testing?"Checking…":step.verify}</button>{message?<p role={done.includes(index)?"status":"alert"} className={`mt-3 text-sm font-bold ${done.includes(index)?"text-emerald-300":"text-amber-200"}`}>{message}</p>:null}</div>:null}
    <div className="mt-7 rounded-xl border border-white/10 p-4"><p className="font-bold text-white">Need help with this step?</p><p className="mt-1 text-sm text-slate-400">Read the explanation for this step. This button shows help text; it does not contact an AI assistant.</p><button onClick={()=>setShowHelp(true)} className="mt-3 text-sm font-bold text-amber-200">Explain this step to me</button></div>
    <div className="mt-7 flex flex-wrap gap-3">{index>0?<button className="beast-button" disabled={testing} onClick={()=>navigate(index-1)}>Back</button>:null}{index<steps.length-1?<button className="beast-button" disabled={testing||choice!=="yes"||(Boolean(step.verify)&&!done.includes(index))} onClick={next}>Continue</button>:<button className="beast-button" disabled>Customer runtime launch unavailable</button>}</div>
   </section></div>
  <p className="mt-5 text-xs text-slate-500">Your last screen is saved on this device when storage is available. Checks must be repeated after reopening setup. You can inspect each step from the sidebar; visiting a step does not verify it.</p>
 </div></main>;
}

