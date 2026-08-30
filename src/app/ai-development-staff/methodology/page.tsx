import type { Metadata } from "next";
import { AgentAssessmentMethodology } from "@/app/components/AgentAssessmentMethodology";

export const metadata: Metadata = { title: "AI Capability Assessment Methodology | BeastOS", description: "How BeastFusion separates agent capability, autonomy, software generation, and authority.", alternates: { canonical: "/ai-development-staff/methodology" }, robots: { index: true, follow: true } };
export default function DevelopmentAgentAssessmentMethodologyPage() { return <AgentAssessmentMethodology backHref="/ai-development-staff" backLabel="Development & Operations AI" audience="Development and Operations agents"/>; }
