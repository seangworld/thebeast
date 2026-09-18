import Link from "next/link";
import {
  ModuleBadge,
} from "@/app/components/design/DashboardPrimitives";
import { BeastMemberAdminMessagesWorkspace } from "./BeastMemberAdminMessagesWorkspace";

export default function BeastMessagesPage() {
  return (
    <main className="beast-page">
      <div className="beast-container min-w-0 space-y-6">
        <section className="beast-page-header">
          <div className="space-y-4">
            <ModuleBadge module="beastos" label="Private Support" />
            <h1 className="beast-title">Messages</h1>
            <p className="beast-subtitle">
              Your private conversations with the Beast support team.
            </p>
            <Link href="/dashboard/settings/notifications" className="inline-block text-sm text-sky-300 underline">Get notified when a new message arrives</Link>
          </div>
        </section>
        <BeastMemberAdminMessagesWorkspace />
      </div>
    </main>
  );
}
