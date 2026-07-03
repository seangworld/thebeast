"use client";

type FundingRecommendation = {
  type: "primary" | "secondary";
  message: string;
};

type FundingRecommendationsProps = {
  recommendations: FundingRecommendation[];
};

export default function FundingRecommendations({
  recommendations,
}: FundingRecommendationsProps) {
  return (
    <div className="mt-6 border-t border-[#2a3242] pt-6">
      <h3 className="text-lg font-semibold mb-4">Funding Recommendations</h3>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`p-4 rounded border-l-4 ${
              rec.type === "primary"
                ? "bg-purple-950 border-l-purple-500 text-purple-200"
                : "bg-slate-900 border-l-slate-500 text-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg flex-shrink-0">
                {rec.type === "primary" ? "💡" : "✨"}
              </div>
              <p className="text-sm leading-relaxed">{rec.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
