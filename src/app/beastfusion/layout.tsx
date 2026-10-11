import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BeastFusion Professional | AI Development Orchestration Software",
  description: "BeastFusion Professional is self-installed AI development orchestration software with bounded development, independent review, approval controls and bring-your-own AI keys. $499 per installation, with 12 months of updates.",
  alternates: { canonical: "/beastfusion" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "BeastFusion Professional — $499 One-Time",
    description: "Governed AI development, independent review and human approval gates. Self-installation; bring your own AI provider keys.",
    url: "https://thebeast.seangworld.com/beastfusion",
    type: "website"
  }
};
export default function BeastFusionLayout({ children }: { children: ReactNode }) {
  return children;
}
