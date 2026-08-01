import EducationCareerWorkspace from "../../learning/EducationCareerWorkspace";
import { EducationPageIntroduction } from "../EducationPageIntroduction";

export default function AboutYouPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <EducationPageIntroduction
          title="About You"
          introduction="The more we know about you, the better your Guidance Counselor can help you."
          why="Your experience, interests, time, and responsibilities all affect which choices make sense."
          how="Your counselor uses only what you share to make your education and career plan more personal."
          next="Add one thing about where you are today. You can come back and change it anytime."
        />
        <EducationCareerWorkspace focus="about-you" />
      </div>
    </main>
  );
}
