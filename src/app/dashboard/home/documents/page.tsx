import UploadsPage from "../../uploads/page";
import { OwnerOnlyModuleGuard } from "../../OwnerOnlyModuleGuard";

export default function BeastHomeDocumentsPage() {
  return (
    <OwnerOnlyModuleGuard module="home" applicationName="BeastHome">
      <UploadsPage searchParams={Promise.resolve({ module: "home" })} />
    </OwnerOnlyModuleGuard>
  );
}
