import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";

export default function EducationPlanningPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <header className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">BeastEducation · Planning</p>
          <h1 className="mt-2 text-3xl font-black text-white">Education Planning</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Build the member-approved education route, including credentials, prerequisites, milestones, time, cost, dependencies, and risks.</p>
        </header>
        <EducationCareerWorkspace focus="education-planning" />
      </div>
    </main>
  );
}
