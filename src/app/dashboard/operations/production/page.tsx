import { BeastAdminShell } from "../../admin/BeastAdminShell";
import { ProductionWorkspace } from "./ProductionWorkspace";

export default function ProductionPage() {
  return (
    <BeastAdminShell
      title="Production"
      purpose="Start revenue-producing work in one place. BeastFusion sends it to the right factory; you return for review, download, publishing, or client delivery."
    >
      <ProductionWorkspace />
    </BeastAdminShell>
  );
}
