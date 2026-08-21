import type { BeastHunterRankedCandidate } from "./beastHunter";

export type BeastHunterExecutionPackage = {
  roadmapItemId: string;
  opportunity: BeastHunterRankedCandidate;
};

function bullets(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- None recorded";
}

export function buildBeastHunterWorkRequest({ roadmapItemId, opportunity }: BeastHunterExecutionPackage) {
  const validation = opportunity.validation;
  const brief = opportunity.buildBrief;
  return `# Beast Build Request

Continue Beast by implementing the approved BeastAdmin roadmap package below.

## Execution identity
- Roadmap package: ${roadmapItemId}
- BeastHunter opportunity: ${opportunity.id}
- Title: ${opportunity.title}
- Score: ${opportunity.score}/100
- Market: ${opportunity.market}
- Type: ${opportunity.huntType}

## Opportunity
${opportunity.summary}

## Validation
- Verdict: ${validation?.verdict || "Not run"}
- Demand: ${validation?.demandEvidence || "Not recorded"}
- Competition: ${validation?.competitorAnalysis || "Not recorded"}
- Realistic revenue: ${validation?.realisticMonthlyRevenue || "Not recorded"}
- Startup cost: ${validation?.startupCost || "Not recorded"}
- Build estimate: ${validation?.buildEstimate || "Not recorded"}
- Marketing difficulty: ${validation?.marketingDifficulty || "Not recorded"}

## Opportunity economics
- Price per sale/customer/subscription: ${validation?.economics?.offerPrice || "Not recorded"}
- Revenue model: ${validation?.economics?.revenueModel || "Not recorded"}
- Monthly sales/customers needed: ${validation?.economics?.monthlySalesNeeded || "Not recorded"}
- Realistic monthly gross revenue: ${validation?.economics?.grossRevenueRange || validation?.realisticMonthlyRevenue || "Not recorded"}
- Estimated monthly operating cost: ${validation?.economics?.monthlyOperatingCost || "Not recorded"}
- Estimated gross margin: ${validation?.economics?.grossMargin || "Not recorded"}
- Break-even point: ${validation?.economics?.breakEvenPoint || "Not recorded"}
- Time to first revenue: ${validation?.economics?.timeToFirstRevenue || "Not recorded"}
- Income confidence: ${validation?.economics?.incomeConfidence || "Not recorded"}

### Reasons to proceed
${bullets(validation?.reasonsToProceed || [])}

### Reasons to reject or control
${bullets(validation?.reasonsToReject || [])}

## Approved build brief
- Objective: ${brief?.objective || `Build the smallest validated version of ${opportunity.title}.`}
- Audience: ${brief?.audience || opportunity.market}
- Value proposition: ${brief?.valueProposition || opportunity.summary}

### Minimum viable scope
${bullets(brief?.minimumViableScope || validation?.nextSteps || [])}

### Exclusions
${bullets(brief?.exclusions || [])}

### Milestones
${bullets(brief?.milestones || [])}

### Success measures
${bullets(brief?.successMeasures || [])}

### Risks
${bullets(brief?.risks || validation?.reasonsToReject || [])}

## Evidence
${bullets([...(opportunity.evidence || []).map((source) => `${source.label}: ${source.url}`), ...(validation?.sourceUrls || []).map((url) => `Validation source: ${url}`)])}

## Execution instruction
Inspect the current repository and existing roadmap before coding. Preserve established architecture and owner-only boundaries. Implement, test, publish through a reviewed pull request, monitor deployment, and list any required migrations or configuration. Do not expand the approved scope without asking Sean.
`;
}
