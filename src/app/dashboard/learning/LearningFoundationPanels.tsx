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
        title="Completion certificate"
        description="Celebrate completed learning paths with a downloadable completion record."
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
        <a
          href={`/api/learning/certificates/${certificate.certificateId}`}
          className="mt-5 inline-flex rounded-xl border border-indigo-300/45 bg-indigo-300/15 px-4 py-3 text-sm font-black text-indigo-100"
        >
          Download certificate
        </a>
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
        description="A living record of goals, study rhythm, achievements, certificates, and next steps."
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
        <TagList title="Skills" items={portfolio.skillsPlaceholder} />
        <TagList
          title="External certifications"
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
        description="A parent or guardian view for encouragement, active goals, and areas that may need support."
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
        title="Study schedule"
        description="Plan study rhythm, upcoming blocks, milestones, and important dates in one place."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TagList title="Weekly rhythm" items={planner.weeklyRhythm} />
        <TagList title="Helpful actions" items={planner.placeholderActions} />
        <PlannerList title="Upcoming study blocks" items={planner.upcomingBlocks.map((item) => `${item.when}: ${item.title} (${item.duration})`)} />
        <PlannerList title="Milestones" items={planner.milestones.map((item) => `${item.targetDate}: ${item.title}`)} />
        <PlannerList title="Exams and deadlines" items={planner.examsAndDeadlines.map((item) => `${item.targetDate}: ${item.title}`)} />
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
        title="Learning materials"
        description="Keep study materials organized so Beast can connect them to lessons, practice, and recommendations."
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
        title="Specialist network"
        description="Specialists help route learning questions to the right kind of support."
        action={<ModuleBadge module="learning" label="Learning Support" />}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {specialists.map((specialist) => (
          <div key={specialist.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h3 className="font-black text-white">{specialist.role}</h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {specialist.description}
            </p>
            <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
              {specialist.available ? "Available" : "Coming next"}
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
