import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Development & Operations AI | BeastOS",
  description: "Auditable, public-safe capability, autonomy, limitation, and authority evidence for BeastFusion's governed development agents.",
  alternates: { canonical: "/ai-development-staff" },
  robots: { index: true, follow: true },
};

export default function DevelopmentStaffPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
