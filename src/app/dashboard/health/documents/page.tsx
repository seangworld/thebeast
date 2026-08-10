import UploadsPage from "../../uploads/page";

export default function HealthDocumentsPage() {
  return <UploadsPage searchParams={Promise.resolve({ module: "health" })} />;
}
