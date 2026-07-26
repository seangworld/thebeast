import { redirect } from "next/navigation";
import { personalInformationCanonicalRoute } from "@/lib/platform/personalHub";

export default function LegacyProfileRoute() {
  redirect(personalInformationCanonicalRoute);
}
