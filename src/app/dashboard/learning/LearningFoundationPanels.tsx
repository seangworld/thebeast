import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type {
  LearnerPortfolio,
  LearningAchievementUnlock,
  LearningCertificate,
  LearningSpecialist,
  LearningUploadItem,
  ParentDashboard,
  StudyPlanner,
} from "@/lib/learning/types";

export function AchievementEnginePanel({
  achievements,
}: {
  achievements: LearningAchievementUnlock[];
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Achievements"
        title="Milestone engine"
        description="Rule-based unlock logic for foundational BeastLearning achievements."
        action={<ModuleBadge module="learning" label="Rule Based" />}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-xl border p-4 ${
              achievement.unlocked
                ? "border-green-400/35 bg-green-400/10"
                : "border-[#2a3242] bg-[#111827]"
            }`}
          >
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              {achievement.unlocked ? "Unlocked" : "In progress"}
            </div>
            <h3 className="mt-2 font-black text-white">{achievement.title}</h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {achievement.description}
            </p>
            <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
              {achievement.progress} / {achievement.threshold}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function CertificatePreviewPanel({
  certificates,
}: {
  certificates: LearningCertificate[];
}) {
  const certificate = certificates[0];

  if (!certificate) return null;

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Certificates"
        title="Completion certificate preview"
        description="Foundation preview for future BeastLearning completion certificates. PDF generation is not enabled."
      />
      <div className="mt-5 rounded-xl border border-indigo-300/45 bg-[#111827] p-5">
        <div className="text-xs font-bold uppercase text-[#7f8da3]">
          Non-accredited completion record
        </div>
        <h3 className="mt-2 text-2xl font-black text-white">
          {certificate.pathName}
        </h3>
        <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
          Awarded to {certificate.learnerName} on {certificate.completionDate}.
        </p>
        <div className="mt-4 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3 text-sm font-bold text-indigo-100">
          {certificate.certificateId}
        </div>
        <p className="mt-4 text-sm leading-5 text-[#c7cfdb]">
          {certificate.language}
        </p>
        <p className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
          {certificate.verificationPlaceholder}
        </p>
        <button
          type="button"
          disabled
          className="mt-5 rounded-xl border border-[#2a3242] bg-[#0f1419] px-4 py-3 text-sm font-black text-[#7f8da3]"
        >
          Download certificate
        </button>
      </div>
    </DashboardCard>
  );
}

export function LearnerPortfolioPanel({
  portfolio,
}: {
  portfolio: LearnerPortfolio;
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Portfolio"
        title="Learner record"
        description="A static first version of the learner's lifelong learning record."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active goals", String(portfolio.activeGoals)],
          ["Completed goals", String(portfolio.completedGoals)],
          ["Study streak", portfolio.studyStreak],
          ["Hours studied", portfolio.hoursStudied],
          ["Achievements", String(portfolio.achievements)],
          ["Certificates", String(portfolio.certificates)],
          ["Current focus", portfolio.currentFocus],
          ["Next action", portfolio.recommendedNextAction],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">{label}</div>
            <div className="mt-2 text-lg font-black text-white">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <TagList title="Skills placeholder" items={portfolio.skillsPlaceholder} />
        <TagList
          title="External certifications placeholder"
          items={portfolio.externalCertificationsPlaceholder}
        />
      </div>
    </DashboardCard>
  );
}

export function ParentDashboardPanel({
  dashboard,
}: {
  dashboard: ParentDashboard;
}) {
  return (
    <DashboardCard accent="family">
      <SectionHeader
        eyebrow="Parent Support"
        title={dashboard.householdName}
        description="Mocked parent/guardian overview. No permissions, linking, messaging, or school integrations are active."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {dashboard.learners.map((learner) => (
          <div key={learner.learnerName} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h3 className="font-black text-white">{learner.learnerName}</h3>
            <p className="mt-2 text-sm text-[#c7cfdb]">{learner.weeklyStudyActivity}</p>
            <TagList title="Active goals" items={learner.activeGoals} />
            <TagList title="Achievements" items={learner.achievements} />
            <TagList title="Needs attention" items={learner.areasNeedingAttention} />
            <p className="mt-3 text-sm font-semibold text-pink-100">
              {learner.suggestedEncouragement}
            </p>
            <p className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
              {learner.nextRecommendedParentAction}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function StudyPlannerPanel({ planner }: { planner: StudyPlanner }) {
  return (
    <DashboardCard accent="calendar">
      <SectionHeader
        eyebrow="Study Planner"
        title="Scheduling foundation"
        description="Conceptual planning surface for future BeastOS Calendar integration. No calendar writes happen here."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TagList title="Weekly rhythm" items={planner.weeklyRhythm} />
        <TagList title="Placeholder actions" items={planner.placeholderActions} />
        <PlannerList title="Upcoming study blocks" items={planner.upcomingBlocks.map((item) => `${item.when}: ${item.title} (${item.duration})`)} />
        <PlannerList title="Milestones" items={planner.milestones.map((item) => `${item.targetDate}: ${item.title}`)} />
        <PlannerList title="Exams/deadlines placeholders" items={planner.examsAndDeadlines.map((item) => `${item.targetDate}: ${item.title}`)} />
      </div>
    </DashboardCard>
  );
}

export function UploadFoundationPanel({
  uploads,
}: {
  uploads: LearningUploadItem[];
}) {
  return (
    <DashboardCard accent="documents">
      <SectionHeader
        eyebrow="Uploads"
        title="Learning upload pipeline foundation"
        description="Static material states for future upload, parsing, OCR, vector search, and AI workflows."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {uploads.map((upload) => (
          <div key={upload.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase text-[#7f8da3]">
                {upload.category}
              </span>
              <span className="rounded border border-[#2a3242] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
                {upload.status}
              </span>
            </div>
            <h3 className="mt-2 font-black text-white">{upload.title}</h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">{upload.detail}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function AISpecialistsPanel({
  specialists,
}: {
  specialists: LearningSpecialist[];
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="AI Experts"
        title="Specialist foundation"
        description="Mocked specialist registry only. No prompts, OpenAI calls, or external APIs are active."
        action={<ModuleBadge module="learning" label="No AI Calls" />}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {specialists.map((specialist) => (
          <div key={specialist.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h3 className="font-black text-white">{specialist.role}</h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {specialist.description}
            </p>
            <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
              Mocked preview
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function PlannerList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="text-xs font-bold uppercase text-[#7f8da3]">{title}</div>
      <ul className="mt-3 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-bold uppercase text-[#7f8da3]">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
