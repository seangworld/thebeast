import { redirect } from "next/navigation";

export default function EducationGoalsCompatibilityRoute() {
  redirect("/dashboard/goals?module=education");
}
