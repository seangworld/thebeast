import { PlatformPlaceholderPage } from "@/app/dashboard/platformPlaceholder";

export default function SearchPage() {
  return (
    <PlatformPlaceholderPage
      title="Search"
      description="A future command search surface across BeastOS modules and records."
      examples={["Find debts", "Find bills", "Find future documents"]}
    />
  );
}
