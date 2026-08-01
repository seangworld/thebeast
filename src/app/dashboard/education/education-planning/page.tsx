import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";
import { EducationPageIntroduction } from "../EducationPageIntroduction";

export default function EducationPlanningPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <EducationPageIntroduction
          title="Education Planning"
          introduction="We'll build the education plan that gets you where you want to go."
          why="A clear plan shows which school, training, degree, license, or certificate steps may be needed."
          how="Your Guidance Counselor connects your goal to costs, timing, requirements, and manageable steps."
          next="Review your plan and choose the one step you are ready to work on next."
        />
        <EducationCareerWorkspace focus="education-planning" />
      </div>
    </main>
  );
}
