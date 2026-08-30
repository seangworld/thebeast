import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member AI Specialists | BeastOS",
  description: "Evidence-backed capability, autonomy, authority, and privacy boundaries for Beast member AI specialists.",
  alternates: { canonical: "/ai-specialists" },
  robots: { index: true, follow: true },
};

export default function MemberAISpecialistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
