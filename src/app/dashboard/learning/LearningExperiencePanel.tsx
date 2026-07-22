import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type {
  LearningExperienceDashboard,
  LearningJourneyStep,
} from "@/lib/learning/types";

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]">
      {label}
    </span>
  );
}

function journeyStatusLabel(status: LearningJourneyStep["status"]) {
  if (status === "completed" || status === "complete") return "Mission Complete";
  if (status === "current" || status === "active") return "Next Mission";
  if (status === "available") return "Unlocked";
  if (status === "locked_by_prerequisite") return "Locked by prerequisite";
  if (status === "review_due") return "Review due";
  if (status === "remediation_required") return "Remediation required";
  return "Coming next";
}

function journeyStatusClasses(status: LearningJourneyStep["status"]) {
  if (status === "completed" || status === "complete") {
    return "border-green-400/35 bg-green-400/10";
  }
  if (status === "current" || status === "active") {
    return "border-indigo-300/35 bg-indigo-300/10";
  }
  if (status === "available") {
    return "border-cyan-300/35 bg-cyan-300/10";
  }
  if (status === "review_due") {
    return "border-yellow-300/35 bg-yellow-300/10";
  }
  if (status === "remediation_required") {
    return "border-orange-300/35 bg-orange-300/10";
  }
  return "border-[#2a3242] bg-[#0f1419]";
}

export default function LearningExperiencePanel({
  experience,
}: {
  experience: LearningExperienceDashboard;
}) {
  const activeJourney = experience.journeys.find((journey) => journey.active);

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="How I'm Doing"
        title="What your Guidance Counselor is noticing"
        description="A quick look at your effort, review needs, and momentum so you know what to focus on next."
        action={<ModuleBadge module="learning" label="Support" />}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Practice credit"
          value={String(experience.gamification.xp)}
          detail={`Level ${experience.gamification.level}`}
          icon="PC"
          tone="purple"
        />
        <MetricTile
          label="Streak"
          value={`${experience.daily.studyStreak}d`}
          detail={experience.motivation.streakReminder}
          icon="S"
          tone="green"
        />
        <MetricTile
          label="Review cards"
          value={String(experience.daily.flashcardsDue)}
          detail="Due for review"
          icon="F"
          tone="yellow"
        />
        <MetricTile
          label="Path"
          value={`${experience.gamification.journeyCompletion}%`}
          detail="Current path"
          icon="J"
          tone="blue"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-5">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Today&apos;s focus
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">
              {experience.daily.nextAction}
            </h3>
            <p className="mt-3 text-sm leading-6 text-indigo-100">
              {experience.daily.todaysMission}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip label={experience.daily.recommendedSession} />
              <Chip label={`Next: ${experience.daily.upcomingMilestone}`} />
              <Chip label={experience.daily.celebration} />
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Learning focus
                </div>
                <h3 className="mt-1 font-black text-white">
                  {experience.focusMode.lessonTitle}
                </h3>
              </div>
              <Chip label={experience.focusMode.timerPlaceholder} />
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#0f1419]">
              <div
                className="h-full rounded-full bg-[#818cf8]"
                style={{ width: `${experience.focusMode.progressPercent}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#0f1419] p-3 text-sm text-[#c7cfdb]">
                {experience.focusMode.notesPlaceholder}
              </div>
              <div className="rounded-lg bg-[#0f1419] p-3 text-sm text-[#c7cfdb]">
                Saved note: {experience.focusMode.bookmarked ? "Yes" : "Not saved yet"}
              </div>
              <div className="rounded-lg bg-[#0f1419] p-3 text-sm text-[#c7cfdb]">
                {experience.focusMode.exitLabel}
              </div>
            </div>
          </div>

          {activeJourney ? (
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Journey Progress
              </div>
              <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-black text-white">{activeJourney.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                    {activeJourney.progressLabel}
                  </p>
                </div>
                <Chip label={`${activeJourney.progressPercent}% complete`} />
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#0f1419]">
                <div
                  className="h-full rounded-full bg-[#818cf8]"
                  style={{ width: `${Math.min(Math.max(activeJourney.progressPercent, 0), 100)}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Current unit
                  </div>
                  <p className="mt-1 text-sm font-black text-white">
                    {activeJourney.currentUnitLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Next unit
                  </div>
                  <p className="mt-1 text-sm font-black text-white">
                    {activeJourney.nextUnitLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Remaining work
                  </div>
                  <p className="mt-1 text-sm font-black text-white">
                    {activeJourney.remainingWorkLabel}
                  </p>
                </div>
              </div>
              {activeJourney.unlockMessage ? (
                <div className="mt-4 rounded-lg border border-cyan-300/35 bg-cyan-300/10 p-3 text-sm font-bold leading-5 text-cyan-50">
                  {activeJourney.unlockMessage}
                </div>
              ) : null}
              {!activeJourney.estimateIsHonest ? (
                <div className="mt-4 rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-3 text-sm font-bold leading-5 text-yellow-50">
                  {activeJourney.remainingWorkLabel}
                </div>
              ) : null}
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {activeJourney.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`rounded-lg border p-3 ${journeyStatusClasses(step.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold uppercase text-[#7f8da3]">
                        {step.kind}
                      </div>
                      <div className="text-right text-[11px] font-black uppercase text-[#dbe3ef]">
                        {journeyStatusLabel(step.status)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm font-black text-white">
                      {step.title}
                    </div>
                    {step.detail ? (
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#c7cfdb]">
                        {step.detail}
                      </p>
                    ) : null}
                    {step.prerequisiteLabel ? (
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#9aa7b8]">
                        {step.prerequisiteLabel}
                      </p>
                    ) : null}
                    <div className="mt-2 text-xs font-bold text-[#c7cfdb]">
                      {step.progress}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Motivation
            </div>
            <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
              {experience.motivation.dailyEncouragement}
            </p>
            <p className="mt-3 text-sm font-bold text-indigo-100">
              {experience.motivation.goalReminder}
            </p>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Learning insights
            </div>
            <div className="mt-3 grid gap-2">
              {experience.insights.map((insight) => (
                <div key={insight.id} className="rounded-lg bg-[#0f1419] p-3">
                  <div className="text-sm font-black text-white">{insight.title}</div>
                  <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                    {insight.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              What your Guidance Counselor remembers
            </div>
            <h3 className="mt-1 font-black text-white">
              {experience.learnerProfile.learnerName}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label={`${experience.learnerProfile.achievements} achievements`} />
              <Chip label={`${experience.learnerProfile.certificates} certificate`} />
              <Chip label={experience.learnerProfile.currentJourney} />
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Early learner wins
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {experience.beta.badges.map((badge) => (
                <Chip key={badge} label={badge} />
              ))}
            </div>
            <p className="mt-3 text-sm leading-5 text-[#c7cfdb]">
              {experience.beta.whatsNew.join(" · ")}
            </p>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Accessibility
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label="Larger text option" />
              <Chip label="High contrast support" />
              <Chip label="Reduced motion support" />
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
