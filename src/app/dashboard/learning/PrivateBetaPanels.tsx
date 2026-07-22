import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LearningPrivateBetaData } from "@/lib/learning/types";

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-black uppercase text-[#dbe3ef]">
      {label}
    </span>
  );
}

const missionStatusLabels: Record<string, string> = {
  complete: "Complete",
  active: "In progress",
  available: "Available",
  locked: "Coming next",
};

export default function PrivateBetaPanels({
  beta,
}: {
  beta: LearningPrivateBetaData;
}) {
  const completeMissions = beta.readiness.missions.filter(
    (mission) => mission.status === "complete"
  ).length;

  return (
    <section className="grid gap-4">
      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Learning Path"
          title="Today’s learning missions"
          description="Follow guided missions, unlock helpful learning tools, and keep a clear next action in front of you."
          action={<ModuleBadge module="learning" label={beta.readiness.stage} />}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetricTile
              label="Setup Progress"
              value={`${beta.readiness.completionPercent}%`}
              detail={`${completeMissions} missions complete`}
              icon="B1"
              tone="purple"
            />
            <MetricTile
              label="Next Mission"
              value={beta.readiness.nextBestAction}
              detail="Best next action"
              icon="GO"
              tone="blue"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {beta.readiness.missions.map((mission) => (
              <div
                key={mission.id}
                className={`rounded-xl border p-4 ${
                  mission.status === "complete"
                    ? "border-green-400/35 bg-green-400/10"
                    : mission.status === "active"
                      ? "border-indigo-300/45 bg-indigo-300/10"
                      : "border-[#2a3242] bg-[#111827]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusPill label={missionStatusLabels[mission.status] || mission.status} />
                  {mission.required ? <StatusPill label="Required" /> : null}
                </div>
                <h3 className="mt-3 font-black text-white">{mission.title}</h3>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                  {mission.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Founding Student"
            title="Learner identity"
            description="Your badges, join date, and unlocked learning tools stay attached to your BeastEducation record."
            action={<ModuleBadge module="learning" label="Learner Record" />}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {beta.readiness.badges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-indigo-300/45 bg-indigo-300/10 p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {badge.permanent ? "Permanent" : "Beta"}
                </div>
                <h3 className="mt-2 text-xl font-black text-white">{badge.label}</h3>
                <p className="mt-2 text-sm text-[#c7cfdb]">Joined {badge.earnedAt}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            {beta.readiness.unlockedCapabilities.slice(0, 6).map((capability) => (
              <div
                key={capability}
                className="rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-semibold text-[#c7cfdb]"
              >
                {capability}
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="timeline">
          <SectionHeader
            eyebrow="Student Timeline"
            title="Lifelong learning record"
            description="Joined date, goals, sessions, achievements, certificates, streaks, and career milestones share one timeline model."
          />
          <div className="mt-5 grid gap-3">
            {beta.timeline.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusPill label={item.type} />
                  <span className="text-xs font-bold uppercase text-[#7f8da3]">
                    {item.occurredAt}
                  </span>
                </div>
                <h3 className="mt-3 font-black text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">{item.summary}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </section>
    </section>
  );
}
