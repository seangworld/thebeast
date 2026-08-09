import UploadsPage from "../../uploads/page";
import { OwnerOnlyModuleGuard } from "../../OwnerOnlyModuleGuard";

export default function HealthDocumentsPage() {
  return (
    <OwnerOnlyModuleGuard module="health" applicationName="BeastHealth">
      <UploadsPage searchParams={Promise.resolve({ module: "health" })} />
    </OwnerOnlyModuleGuard>
  );
}
