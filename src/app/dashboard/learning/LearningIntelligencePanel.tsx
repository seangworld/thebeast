import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { buildLearningIntelligenceSnapshot } from "@/lib/learning/intelligenceEngine";

type LearningIntelligenceSnapshot = ReturnType<
  typeof buildLearningIntelligenceSnapshot
>;

function TagList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[#7f8da3]">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function LearningIntelligencePanel({
  snapshot,
}: {
  snapshot: LearningIntelligenceSnapshot;
}) {
  const graph = snapshot.dependencyGraph;
  const session = snapshot.generatedSession;

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Learning Intelligence"
        title="Rule-based learning engine"
        description="A deterministic command layer now models knowledge, mastery, dependencies, memory, weak areas, study flow, resources, and progress prediction."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Mastery"
          value={`${snapshot.mastery.overallMasteryPercent}%`}
          detail={`${snapshot.mastery.confidence} confidence`}
          icon="M"
          tone="purple"
        />
        <MetricTile
          label="Readiness"
          value={`${snapshot.prediction.readiness}%`}
          detail={`${snapshot.prediction.scheduleHealth} schedule`}
          icon="R"
          tone="green"
        />
        <MetricTile
          label="Unlocked"
          value={String(graph.unlockedConcepts.length)}
          detail={`${graph.blockedConcepts.length} blocked`}
          icon="U"
          tone="blue"
        />
        <MetricTile
          label="Completion"
          value={snapshot.prediction.estimatedCompletionDate}
          detail={`${snapshot.prediction.likelihoodOfSuccess}% likelihood`}
          icon="P"
          tone="yellow"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Adaptive planner
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  {snapshot.adaptivePlan.nextRecommendedLesson}
                </h3>
              </div>
              <ModuleBadge module="learning" label="Live stub" />
            </div>
            <p className="mt-3 text-sm leading-5 text-indigo-100">
              Estimated completion: {snapshot.adaptivePlan.estimatedCompletion}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Review first
                </div>
                <div className="mt-2">
                  <TagList
                    items={snapshot.adaptivePlan.reviewSessions}
                    emptyLabel="No review sessions needed."
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Suggested sequence
                </div>
                <div className="mt-2">
                  <TagList
                    items={graph.suggestedSequence.slice(0, 4)}
                    emptyLabel="Sequence will appear as concepts unlock."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Today&apos;s generated session
            </div>
            <h3 className="mt-2 font-black text-white">
              {session.conceptId} · {session.estimatedTime}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Warm-up", session.warmUp],
                ["Review", session.review],
                ["New learning", session.newLearning],
                ["Practice", session.practice],
                ["Reflection", session.reflection],
                ["Confidence", session.confidenceCheck],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#0f1419] p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    {label}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Weakness analysis
            </div>
            <div className="mt-3 space-y-3">
              <TagList
                items={snapshot.weakness.lowMasteryConcepts}
                emptyLabel="No low-mastery concepts detected."
              />
              <TagList
                items={snapshot.weakness.repeatedReviewNeeds}
                emptyLabel="No repeated review needs yet."
              />
            </div>
            <p className="mt-4 text-sm leading-5 text-[#c7cfdb]">
              {snapshot.weakness.improvementSuggestions[0]}
            </p>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Learning memory
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Recently studied
                </div>
                <div className="mt-2">
                  <TagList
                    items={snapshot.memory.recentlyStudied}
                    emptyLabel="No recent study memory yet."
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Frequently missed
                </div>
                <div className="mt-2">
                  <TagList
                    items={snapshot.memory.frequentlyMissed}
                    emptyLabel="No misses recorded."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Resource engine
            </div>
            <div className="mt-3 grid gap-2">
              {snapshot.resources.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#0f1419] px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">
                    {resource.title}
                  </span>
                  <span className="text-xs font-bold uppercase text-[#7f8da3]">
                    {resource.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
