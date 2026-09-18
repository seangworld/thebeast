import Link from "next/link";

type Step = { title: string; description: string; links: [string, string][]; question: string };
const guides: Record<"education" | "health", { title: string; advisor: string; href: string; steps: Step[] }> = {
  education: {
    title: "Your education guide", advisor: "Ask the counselor", href: "/dashboard/education/guidance-counselor",
    steps: [
      { title: "Choose what you want to achieve", description: "Start with a goal that matters to you: learning a subject, earning a credential, changing careers, or advancing at work. Review an existing goal before adding another.", links: [["Review education goals", "/dashboard/education/goals"]], question: "Help me turn my goal into a practical next step." },
      { title: "Review your starting point", description: "Review your education, experience, interests, available time, and budget. Fill in only what is relevant; you can leave uncertain details for later.", links: [["Review About You", "/dashboard/education/about-you"], ["Organize documents", "/dashboard/education/documents"]], question: "What information would help us plan around my situation?" },
      { title: "Explore paths that fit", description: "Compare education and career paths by requirements, time, cost, and fit. You can explore options without committing to an application or enrollment.", links: [["Education planning", "/dashboard/education/education-planning"], ["Career planning", "/dashboard/education/career-planning"]], question: "Help me compare realistic options using my goals and constraints." },
      { title: "Work out the cost and requirements", description: "Review schools, certifications, and possible funding. Keep options you are considering separate from confirmed admission, credentials, or funding awards.", links: [["Schools", "/dashboard/education/schools"], ["Certifications", "/dashboard/education/certifications"], ["Funding options", "/dashboard/education/scholarships"]], question: "Which requirements and costs do I need to verify before choosing?" },
      { title: "Take a step and review your progress", description: "Choose a manageable action, review your goals as circumstances change, and use the Tutor when you need help understanding a subject or working through a problem.", links: [["Review goals and milestones", "/dashboard/education/goals"], ["Ask the Tutor", "/dashboard/education/tutor"]], question: "What is a manageable next step with the time I have available?" },
    ],
  },
  health: {
    title: "Your health guide", advisor: "Ask Taylor", href: "/dashboard/health/ai-advisor",
    steps: [
      { title: "Choose what you want help with", description: "Start with your question or a health goal. You can ask Taylor immediately, use these steps on your own, or combine both approaches.", links: [["Review health goals", "/dashboard/health/goals"]], question: "Help me organize what I want to discuss at my next appointment." },
      { title: "Review your health story", description: "Review the information you have already saved. Add relevant conditions, procedures, or history when you are ready; unknown details can stay unknown.", links: [["Health profile", "/dashboard/health/profile"], ["Conditions", "/dashboard/health/conditions"], ["Procedures", "/dashboard/health/procedures"]], question: "Help me identify gaps or conflicting information in my saved health history." },
      { title: "Check medications and vaccination records", description: "Keep medication names, doses, and current use accurate. Record vaccination dates and any documented next due date. Taylor can help prepare questions for your clinician or pharmacist.", links: [["Medications", "/dashboard/health/medications"], ["Vaccination records", "/dashboard/health/vaccinations"]], question: "Help me review my saved medication information and prepare questions for my pharmacist." },
      { title: "Organize records and questions", description: "Add relevant records to Documents. In Taylor’s chat, select the originals you want reviewed and ask about unclear information. Review proposed profile changes before saving them.", links: [["Health documents", "/dashboard/health/documents"], ["Veterans preparation guide", "/dashboard/health/veterans"]], question: "Help me understand these selected records and list questions to ask my clinician." },
      { title: "Prepare for appointments and follow up", description: "Keep appointments, questions, and follow-up information together. Return to your records after a visit to review any changes and keep your goals current.", links: [["Appointments", "/dashboard/health/appointments"], ["Health timeline", "/dashboard/health/timeline"], ["Health goals", "/dashboard/health/goals"]], question: "Help me prepare a short appointment summary from my saved information." },
    ],
  },
};

export function MemberStepGuide({ module }: { module: "education" | "health" }) {
  const guide = guides[module];
  return <section className="space-y-3 rounded-2xl border border-sky-400/25 bg-sky-400/[0.03] p-5" aria-labelledby={`${module}-step-guide`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`${module}-step-guide`} className="text-xl font-bold">{guide.title}</h2>
      <Link href={guide.href} className="beast-button">{guide.advisor}</Link>
    </div>
    <p className="text-sm leading-6 text-slate-300">Use the guide, ask AI, or do both. Choose any step, skip what does not apply, and return whenever you need. These links open your existing workspaces; you do not need to enter the same information here again.</p>
    {guide.steps.map((step, index) => <details key={step.title} className="rounded-xl border border-slate-700 p-4">
      <summary className="cursor-pointer font-semibold">{index + 1}. {step.title}</summary>
      <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {step.links.map(([label, href]) => <Link key={href} href={href} className="beast-button-secondary">{label}</Link>)}
        <Link href={guide.href} className="beast-button">{guide.advisor}</Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">Not sure what to ask? “{step.question}”</p>
    </details>)}
    <p className="text-xs leading-5 text-slate-400">Opening a step does not mark it complete or change your records. You can ask the advisor any question without finishing this guide.</p>
  </section>;
}
