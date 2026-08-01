import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";
import { EducationPageIntroduction } from "../EducationPageIntroduction";

export default function EducationProgressPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <EducationPageIntroduction
          title="Progress & Decisions"
          introduction="Keep track of important choices, applications, achievements, and changes in direction."
          why="Looking back helps you and your counselor see what worked and what needs to change."
          how="Beast uses this history to keep future guidance connected to your real experience."
          next="Record one recent decision or achievement that matters to your plan."
        />
        <EducationCareerWorkspace focus="progress" />
      </div>
    </main>
  );
}
