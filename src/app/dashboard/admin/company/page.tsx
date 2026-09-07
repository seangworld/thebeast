import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminProductWorkspace } from "../BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";

export default function CompanyControlPage() {
  return <BeastAdminShell title="SEANGWORLD.com" purpose="Company-site controls and analytics in one owner-only product section."><BeastAdminProductWorkspace product={findEmpireProduct("seangworld")} /></BeastAdminShell>;
}
