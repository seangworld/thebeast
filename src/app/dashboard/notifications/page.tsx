import { PlatformPlaceholderPage } from "@/app/dashboard/platformPlaceholder";

export default function NotificationsPage() {
  return (
    <PlatformPlaceholderPage
      module="notifications"
      title="Notifications"
      description="A unified place for alerts, reminders, risks, and module messages."
      examples={["Cashflow warnings", "Membership notices", "Future module alerts"]}
    />
  );
}
