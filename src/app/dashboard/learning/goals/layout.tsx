import { redirect } from "next/navigation";

export default function LegacyLearningGoalsLayout() {
  redirect("/dashboard/goals?module=education");
}
