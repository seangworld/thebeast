import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminProductWorkspace } from "../BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";

export default function BeastFusionControlPage() {
  return <BeastAdminShell title="BeastFusion" purpose="Platform capacity, usage, digital staff, delivery, and governance."><BeastAdminProductWorkspace product={findEmpireProduct("beastfusion")} /></BeastAdminShell>;
}
