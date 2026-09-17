import { BeastHealthShell } from "../BeastHealthShell";
import { VaccinationsWorkspace } from "./VaccinationsWorkspace";
export default function VaccinationsPage() {
  return <BeastHealthShell title="Vaccinations" description="Keep shot records, dates received, and recorded next-dose dates together." how="Dates come from you, a provider, or a document. Missing records mean unknown vaccination history." next="Add a vaccination or review its next-dose date."><VaccinationsWorkspace /></BeastHealthShell>;
}
