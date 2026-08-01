import Link from "next/link";
import { PlatformPageHeader } from "@/app/components/design/DashboardPrimitives";

export function HealthPageIntroduction({
  title,
  introduction,
  why,
  how,
  next,
  action,
}: {
  title: string;
  introduction: string;
  why: string;
  how: string;
  next: string;
  action?: { label: string; href: string };
}) {
  return (
    <PlatformPageHeader
      module="health"
      badge="Your Health Story"
      title={title}
      description={introduction}
      guidance={[
        { label: "Why this helps", text: why },
        { label: "How Beast uses it", text: how },
        { label: "What to do next", text: next },
      ]}
      actions={action ? (
        <Link href={action.href} className="beast-button-secondary">
          {action.label}
        </Link>
      ) : undefined}
    />
  );
}
