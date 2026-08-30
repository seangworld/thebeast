import TutorWorkspace from "./TutorWorkspace";
import { requireProfessionalEntitlement } from "@/lib/memberAgeServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const entitlement = await requireProfessionalEntitlement("beasteducation.tutor");
  if (!entitlement.ok) redirect("/dashboard/education");
  return <TutorWorkspace />;
}
