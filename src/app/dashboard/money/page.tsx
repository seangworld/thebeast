import { redirect } from "next/navigation";

export default async function BeastMoneyLandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ starter?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const starter = Array.isArray(resolvedSearchParams?.starter)
    ? resolvedSearchParams?.starter[0]
    : resolvedSearchParams?.starter;

  if (starter?.trim()) {
    redirect(
      `/dashboard/money/coach?starter=${encodeURIComponent(starter.trim())}`
    );
  }

  redirect("/dashboard/money/dashboard");
}
