import UploadsPage from "../../uploads/page";

export default function MoneyDocumentsPage() {
  return <UploadsPage searchParams={Promise.resolve({ module: "money" })} />;
}
