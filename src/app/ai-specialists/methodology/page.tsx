import type { Metadata } from "next";
import { AgentAssessmentMethodology } from "@/app/components/AgentAssessmentMethodology";

export const metadata: Metadata = { title: "Member AI Assessment Methodology | BeastOS", description: "How Beast assesses member AI capability, autonomy, authority, and data boundaries.", alternates: { canonical: "/ai-specialists/methodology" }, robots: { index: true, follow: true } };
export default function MemberAgentAssessmentMethodologyPage() { return <AgentAssessmentMethodology backHref="/ai-specialists" backLabel="Member AI specialists" audience="member-facing specialists"/>; }
