import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";

export default function CareerPlanningPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <header className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.07] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">BeastEducation · Planning</p>
          <h1 className="mt-2 text-3xl font-black text-white">Career Planning</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Compare credible career destinations and routes using qualification gaps, experience, credentials, salary, employer, location, advancement, risks, and unknowns.</p>
        </header>
        <EducationCareerWorkspace focus="career-planning" />
      </div>
    </main>
  );
}
