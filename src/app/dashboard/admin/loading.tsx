import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";

export default function BeastAdminLoading() {
  return (
    <main className="beast-page" aria-busy="true">
      <div className="beast-container">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="BeastAdmin · Owner Only"
            title="Loading owner workspace"
            description="BeastAdmin is preparing verified workspace context. No unavailable value is being treated as zero."
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading BeastAdmin workspace">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
