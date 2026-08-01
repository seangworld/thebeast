import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";
import { EducationPageIntroduction } from "../EducationPageIntroduction";

export default function CareerPlanningPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <EducationPageIntroduction
          title="Career Planning"
          introduction="We'll compare careers that fit you and build the best path forward."
          why="Understanding the work, pay, training, location, and opportunities helps you make a confident choice."
          how="Your Guidance Counselor compares what each career needs with what matters to you."
          next="Add or compare one career you would like to understand better."
        />
        <EducationCareerWorkspace focus="career-planning" />
      </div>
    </main>
  );
}
