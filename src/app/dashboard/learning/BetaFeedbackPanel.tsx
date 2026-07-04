"use client";

import { useEffect, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type {
  LearningFeedbackCategory,
  LearningFeedbackItem,
} from "@/lib/learning/types";

const storageKey = "beastos.learning.betaFeedback.v1";
const categories: LearningFeedbackCategory[] = [
  "feature idea",
  "bug report",
  "confusing experience",
  "liked something",
  "disliked something",
  "general suggestion",
];

export default function BetaFeedbackPanel() {
  const [category, setCategory] = useState<LearningFeedbackCategory>("feature idea");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<LearningFeedbackItem[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    try {
      setItems(JSON.parse(stored) as LearningFeedbackItem[]);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setItems((current) => [
      {
        id: `feedback-${Date.now()}`,
        category,
        message: trimmed,
        context: "BeastLearning dashboard",
        submittedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setMessage("");
  }

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Beta Feedback"
        title="Founding Student feedback"
        description="Client-side feedback capture for early BeastLearning testing. Feedback stays in this browser for now."
        action={<ModuleBadge module="learning" label="Beta Tester" />}
      />
      <form className="mt-5 grid gap-4 lg:grid-cols-[0.35fr_1fr_auto]" onSubmit={submitFeedback}>
        <select
          className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-indigo-300/60"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as LearningFeedbackCategory)
          }
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-[#596579] focus:border-indigo-300/60"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What should BeastLearning improve?"
        />
        <button
          type="submit"
          className="rounded-xl border border-indigo-300/45 bg-indigo-300/15 px-4 py-3 text-sm font-black text-indigo-100"
        >
          Save locally
        </button>
      </form>
      <div className="mt-5 grid gap-3">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              {item.category} · {item.context}
            </div>
            <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">{item.message}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
