"use client";

type FundingInsight = {
  type: "warning" | "info";
  message: string;
};

type FundingIntelligenceProps = {
  insights: FundingInsight[];
};

export default function FundingIntelligence({
  insights,
}: FundingIntelligenceProps) {
  return (
    <div className="mt-6 border-t border-[#2a3242] pt-6">
      <h3 className="text-lg font-semibold mb-4">Funding Intelligence</h3>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-4 rounded border-l-4 ${
              insight.type === "warning"
                ? "bg-red-950 border-l-red-500 text-red-200"
                : "bg-blue-950 border-l-blue-500 text-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg flex-shrink-0">
                {insight.type === "warning" ? "⚠️" : "ℹ️"}
              </div>
              <p className="text-sm leading-relaxed">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
