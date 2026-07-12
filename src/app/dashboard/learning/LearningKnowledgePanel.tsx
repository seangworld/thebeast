import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { KnowledgeIntelligenceDashboard } from "@/lib/learning/types";

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]">
      {label}
    </span>
  );
}

export default function LearningKnowledgePanel({
  knowledge,
}: {
  knowledge: KnowledgeIntelligenceDashboard;
}) {
  const currentCurriculum = knowledge.curriculum[0];
  const currentCareer = knowledge.careers[0];
  const currentCertification = knowledge.certifications[0];
  const nextConcept = knowledge.concepts.find(
    (concept) => concept.id === knowledge.masteryMap.recommendedNextConceptId
  );

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Knowledge Intelligence"
        title="Curriculum brain"
        description="A provider-independent education layer for subjects, curriculum structure, concepts, skills, standards, careers, certifications, paths, resource maps, and mastery."
        action={<ModuleBadge module="learning" label="v0.6 Knowledge" />}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Subjects"
          value={String(knowledge.subjects.length)}
          detail="Global catalog"
          icon="S"
          tone="blue"
        />
        <MetricTile
          label="Concepts"
          value={String(knowledge.concepts.length)}
          detail="Reusable library"
          icon="C"
          tone="purple"
        />
        <MetricTile
          label="Careers"
          value={String(knowledge.careers.length)}
          detail="Mentor models"
          icon="G"
          tone="green"
        />
        <MetricTile
          label="Certs"
          value={String(knowledge.certifications.length)}
          detail="Mock catalog"
          icon="Z"
          tone="yellow"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-indigo-300/35 bg-indigo-300/10 p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Recommended Next Concept
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">
              {nextConcept?.title || knowledge.masteryMap.recommendedNextConceptId}
            </h3>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              {nextConcept?.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill label={knowledge.generatedPath.estimatedTimeline} />
              <Pill label={knowledge.generatedPath.interest} />
              <Pill label={currentCertification?.title || "Certification"} />
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Current Curriculum
                </div>
                <h3 className="mt-1 font-black text-white">
                  {currentCurriculum?.title}
                </h3>
              </div>
              <Pill label={`${currentCurriculum?.courses.length || 0} course`} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {currentCurriculum?.courses[0]?.modules[0]?.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                >
                  <div className="font-bold text-white">{lesson.title}</div>
                  <p className="mt-1 text-sm text-[#c7cfdb]">{lesson.metadata}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Skill Tree
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {knowledge.skillTree.nodes.map((node) => (
                <div
                  key={node.id}
                  className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-white">{node.title}</div>
                    <Pill label={node.status} />
                  </div>
                  <div className="mt-2 text-xs font-bold uppercase text-[#7f8da3]">
                    x{node.x} y{node.y}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Career Progress
            </div>
            <h3 className="mt-1 font-black text-white">{currentCareer?.title}</h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {currentCareer?.overview}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentCareer?.recommendedSkillIds.slice(0, 3).map((skill) => (
                <Pill key={skill} label={skill} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Certification Progress
            </div>
            <h3 className="mt-1 font-black text-white">
              {currentCertification?.provider} {currentCertification?.title}
            </h3>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
              {currentCertification?.estimatedPrepTime}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentCertification?.recommendedConceptIds.slice(0, 3).map((concept) => (
                <Pill key={concept} label={concept} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Mastery Map
            </div>
            <div className="mt-3 grid gap-2">
              {knowledge.masteryMap.nodes.map((node) => (
                <div key={node.id} className="rounded-lg bg-[#0f1419] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-white">{node.title}</div>
                    <Pill label={node.status} />
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#1a1f2b]">
                    <div
                      className="h-full rounded-full bg-[#818cf8]"
                      style={{ width: `${node.masteryPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Standards & Resource Map
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label={`${knowledge.standards.length} standards`} />
              <Pill label={`${knowledge.resourceLinks.length} resource links`} />
              <Pill label={`${knowledge.generatedPath.milestones.length} milestones`} />
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
