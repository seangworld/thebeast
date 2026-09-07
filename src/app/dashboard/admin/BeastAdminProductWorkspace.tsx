import Link from "next/link";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import type { EmpireProduct } from "@/lib/beastAdminEmpire";

export function BeastAdminProductWorkspace({ product }: { product: EmpireProduct }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Product control" title={`${product.name} operations`} description={product.purpose} />
        {product.controlLinks.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {product.controlLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4 font-black text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10">
                {link.label} →
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[#344055] bg-[#111827]/70 p-4 text-sm leading-6 text-[#9aa7b8]">
            No write controls are connected yet. This product remains visible here without pretending that BeastAdmin can change it.
          </p>
        )}
      </DashboardCard>
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Product analytics" title={product.analyticsLink.label} description={product.analyticsLink.state === "available" ? "Open the product's existing authoritative reporting surface." : "The product boundary is defined; route and host filtering still needs to be connected."} />
        {product.analyticsLink.state === "available" ? (
          <Link href={product.analyticsLink.href} className="beast-button mt-5 inline-flex">Open analytics</Link>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[#344055] p-4 text-sm text-[#9aa7b8]">Awaiting the shared product analytics dimension; no unverified audience number is shown.</p>
        )}
      </DashboardCard>
    </div>
  );
}
