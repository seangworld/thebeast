"use client";

import { useMemo, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LearningPathTemplate } from "@/lib/learning/types";

export default function LearningPathTemplates({
  templates,
}: {
  templates: LearningPathTemplate[];
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || "");
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedId) || templates[0],
    [selectedId, templates]
  );

  if (!selectedTemplate) return null;

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Path Templates"
        title="Starter learning paths"
        description="Reusable static templates for common learning scenarios. These are preview-only foundations for future personalized planning."
        action={<ModuleBadge module="learning" label="Static Templates" />}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-2">
          {templates.map((template) => {
            const active = template.id === selectedTemplate.id;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-indigo-300/45 bg-indigo-300/10"
                    : "border-[#2a3242] bg-[#111827] hover:border-indigo-300/35"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-white">{template.templateName}</h3>
                  <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
                    {template.goalType}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                  {template.audience}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Template preview
              </div>
              <h3 className="mt-2 text-2xl font-black text-white">
                {selectedTemplate.templateName}
              </h3>
              <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                {selectedTemplate.audience} · {selectedTemplate.goalType}
              </p>
            </div>
            <span className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100">
              {selectedTemplate.recommendedPace}
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Milestones
              </div>
              <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
                {selectedTemplate.milestones.map((milestone) => (
                  <li key={milestone}>{milestone}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Example sessions
              </div>
              <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#c7cfdb]">
                {selectedTemplate.exampleSessions.map((session) => (
                  <li key={session}>{session}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-green-400/30 bg-green-400/10 p-4">
            <div className="text-xs font-bold uppercase text-green-100">
              Suggested next step
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-green-100">
              {selectedTemplate.suggestedNextStep}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
