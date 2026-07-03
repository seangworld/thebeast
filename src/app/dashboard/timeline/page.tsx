import { PlatformPlaceholderPage } from "@/app/dashboard/platformPlaceholder";

export default function TimelinePage() {
  return (
    <PlatformPlaceholderPage
      title="Timeline"
      description="A chronological activity stream for decisions, payments, events, and system changes."
      examples={["Recent money changes", "Upcoming tasks", "Cross-module history"]}
    />
  );
}
