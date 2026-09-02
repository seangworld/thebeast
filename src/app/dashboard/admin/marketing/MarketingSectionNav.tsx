"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Overview", href: "/dashboard/admin/marketing" },
  { label: "Advertising", href: "/dashboard/admin/marketing/advertising" },
  { label: "Video Growth", href: "/dashboard/admin/marketing/video-growth" },
  { label: "Social", href: "/dashboard/admin/marketing/social" },
  { label: "Email", href: "/dashboard/admin/marketing/email" },
  { label: "Analytics", href: "/dashboard/admin/marketing/analytics" },
] as const;

export function MarketingSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="BeastMarketing sections" className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {items.map((item) => {
        const active = item.href === "/dashboard/admin/marketing"
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-black transition ${active ? "border-amber-300 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-200 hover:border-white/25 hover:text-white"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
