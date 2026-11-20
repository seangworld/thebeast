import Link from "next/link";
type Step = { title: string; detail: string; href?: string; link?: string };
export function MarketingWorkflowGuide({ kind }: { kind: "analytics" | "advertising" | "video" }) {
  const data: Record<"analytics" | "advertising" | "video",{title:string;description:string;steps:Step[]}> = {
    analytics: { title:"What is working?",description:"Start with evidence. Record Facebook Professional Dashboard numbers and compare them with actual clicks and verified sales. Missing information is unknown, not zero.",steps:[
      {title:"1. Collect",detail:"Record a specific date range, product, post, and the source of each metric.",href:"/dashboard/operations/marketing#marketing-results",link:"Record results"},
      {title:"2. Compare",detail:"Look for trends in reach, engagement, outbound clicks, and attributable conversions. Avoid treating overlapping totals as unique."},
      {title:"3. Decide",detail:"Repeat strong content and revise weak content only when the evidence supports a conclusion."}
    ]},
    advertising: { title:"Plan a campaign",description:"Start with a product and a measurable goal. Existing campaign forms and approval safeguards remain below.",steps:[
      {title:"1. Select",detail:"Choose the product, audience, direct destination link, and intended result.",href:"/dashboard/operations/marketing",link:"Choose product"},
      {title:"2. Prepare",detail:"Draft creative and supporting evidence. No paid placement is authorized by creating a draft."},
      {title:"3. Approve",detail:"Review the exact creative and destination before any external handoff or spending."},
      {title:"4. Measure",detail:"Record verified outcomes and campaign costs.",href:"/dashboard/operations/marketing/analytics",link:"Review analytics"}
    ]},
    video: { title:"Facebook Reels → YouTube Shorts",description:"Plan a short vertical video once, review it, then use supported publishing channels. The existing production engine and YouTube controls remain available below.",steps:[
      {title:"1. Choose topic",detail:"Start with a relevant audience question and a product-backed claim.",href:"/dashboard/operations/marketing",link:"Open Facebook planner"},
      {title:"2. Script",detail:"Prepare a concise hook, narration, visual plan, and call to action."},
      {title:"3. Produce and review",detail:"Confirm media rights, audio sync, on-screen text, and final video quality before approval."},
      {title:"4. Distribute",detail:"Publish to Facebook Reels with your approval. Confirm Instagram cross-posting; prepare YouTube Shorts separately."}
    ]}
  };
  const d=data[kind];
  return <section className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.04] p-5" aria-label={d.title}>
    <h2 className="text-xl font-black text-white">{d.title}</h2><p className="mt-2 text-sm text-slate-300">{d.description}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{d.steps.map(step=><article key={step.title} className="rounded-xl border border-white/10 bg-slate-950/40 p-4"><h3 className="font-bold text-white">{step.title}</h3><p className="mt-2 text-sm text-slate-300">{step.detail}</p>{step.href&&<Link href={step.href} className="mt-3 inline-block text-sm font-bold text-amber-200 underline">{step.link} →</Link>}</article>)}</div>
    <details className="mt-4 text-sm text-slate-300"><summary className="cursor-pointer font-bold text-white">About the existing advanced tools</summary><p className="mt-2">The original workspaces below still provide detailed records, technical controls, and approvals. This guide does not replace them or grant publishing authority.</p></details>
  </section>;
}
