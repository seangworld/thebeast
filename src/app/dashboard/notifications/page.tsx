import Link from "next/link";
import { FeedbackReleaseNotifications } from "./FeedbackReleaseNotifications";
import { PrivateAdminMessageNotifications } from "./PrivateAdminMessageNotifications";
import { VaccinationNotifications } from "./VaccinationNotifications";
import { OverdueDebtNotifications } from "./OverdueDebtNotifications";
import { BillDueNotifications } from "./BillDueNotifications";
export default function NotificationsPage() {
  return (
    <main className="beast-page" data-mobile-shared-service="notifications">
      <div className="beast-container min-w-0 break-words space-y-6">
        <header className="beast-page-header">
          <h1 className="beast-title">Notifications</h1>
          <p className="beast-subtitle">
            Your reminders, private messages, and updates from Beast.
          </p>
          <Link
            href="/dashboard/settings/notifications"
            className="beast-button mt-4 inline-flex"
          >
            Manage device notifications
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            Enable alerts on each phone or device for bills due soon and new
            messages. Other reminders remain here.
          </p>
        </header>
        <PrivateAdminMessageNotifications />
        <BillDueNotifications />
        <OverdueDebtNotifications />
        <VaccinationNotifications />
        <FeedbackReleaseNotifications />
      </div>
    </main>
  );
}
