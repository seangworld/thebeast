import UploadsPage from "../../uploads/page";

export default function EducationDocumentsPage() {
  return <UploadsPage searchParams={Promise.resolve({ module: "education" })} />;
}
