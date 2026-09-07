import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminProductWorkspace } from "../BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";

export default function ChangeTheWorldControlPage() {
  return <BeastAdminShell title="Change the World" purpose="Civic-action product controls, participation, and impact analytics."><BeastAdminProductWorkspace product={findEmpireProduct("change-the-world")} /></BeastAdminShell>;
}
