import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminProductWorkspace } from "../BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";

export default function BeastControlPage() {
  return <BeastAdminShell title="The Beast" purpose="Member-app controls and analytics, explicitly separated from BeastFusion."><BeastAdminProductWorkspace product={findEmpireProduct("the-beast")} /></BeastAdminShell>;
}
