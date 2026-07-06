import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { AIOrchestrationDashboard } from "@/lib/learning/types";

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]">
      {label}
    </span>
  );
}

export default function LearningAIOrchestrationPanel({
  orchestration,
}: {
  orchestration: AIOrchestrationDashboard;
}) {
  const selectedSpecialist = orchestration.registry.find(
    (specialist) => specialist.id === orchestration.routerResult.selectedSpecialistIds[0]
  );

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="AI Orchestration"
        title="Specialist routing platform"
        description="Beast routes each learning need to the right specialist using learner context, goals, and session history."
        action={<ModuleBadge module="learning" label="Guided AI" />}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Specialists"
          value={String(orchestration.registry.length)}
          detail="Registered contracts"
          icon="AI"
          tone="purple"
        />
        <MetricTile
          label="Intent"
          value={orchestration.intent}
          detail={orchestration.session.topic}
          icon="I"
          tone="blue"
        />
        <MetricTile
          label="Selected"
          value={selectedSpecialist?.name || "Tutor"}
          detail="Deterministic route"
          icon="R"
          tone="green"
        />
        <MetricTile
          label="Context"
          value={String(orchestration.requiredContext.length)}
          detail="Required fields"
          icon="C"
          tone="yellow"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Selected Specialist
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">
              {selectedSpecialist?.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              {orchestration.routerResult.reasonSelected}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {orchestration.routerResult.selectedSpecialistNames.map((name) => (
                <Chip key={name} label={name} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Required Context
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {orchestration.requiredContext.map((item) => (
                <Chip key={item} label={item} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Homework Philosophy
            </div>
            <h3 className="mt-1 font-black text-white">
              {orchestration.homeworkPolicy.policyName}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {orchestration.homeworkPolicy.answerRevealRule}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {orchestration.homeworkPolicy.preferredApproaches.map((approach) => (
                <Chip key={approach} label={approach} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Available Specialists
            </div>
            <div className="mt-3 grid gap-2">
              {orchestration.availableSpecialists.slice(0, 8).map((specialist) => (
                <div
                  key={specialist.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0f1419] px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">{specialist.name}</span>
                  <span className="text-xs font-bold uppercase text-[#7f8da3]">
                    {specialist.futureAIStatus === "connected"
                      ? "Available"
                      : "Coming next"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Conversation Memory
            </div>
            <h3 className="mt-1 font-black text-white">
              {orchestration.memory.activeTopic}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {orchestration.memory.conversationSummary}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {orchestration.memory.openQuestions.slice(0, 2).map((question) => (
                <Chip key={question} label={question} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Session Manager
            </div>
            <h3 className="mt-1 font-black text-white">
              {orchestration.session.learningObjective}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {orchestration.session.durationPlaceholder} ·{" "}
              {orchestration.session.completed ? "Complete" : "Open"}
            </p>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              AI Readiness
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {orchestration.futureAIStatus}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
