import { redirect } from "next/navigation";

export default function BeastMoneyLandingPage({
  searchParams,
}: {
  searchParams?: { starter?: string | string[] };
}) {
  const starter = Array.isArray(searchParams?.starter)
    ? searchParams?.starter[0]
    : searchParams?.starter;

  if (starter?.trim()) {
    redirect(
      `/dashboard/money/coach?starter=${encodeURIComponent(starter.trim())}`
    );
  }

  redirect("/dashboard/money/dashboard");
}
