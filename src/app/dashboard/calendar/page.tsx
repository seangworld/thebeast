import { PlatformPlaceholderPage } from "@/app/dashboard/platformPlaceholder";

export default function CalendarPage() {
  return (
    <PlatformPlaceholderPage
      module="calendar"
      title="Calendar"
      description="A shared schedule layer for money, home, family, projects, and future modules."
      examples={["Upcoming bills", "Subscription renewals", "Household events"]}
    />
  );
}
