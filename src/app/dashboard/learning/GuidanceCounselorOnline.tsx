"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildGuidanceCounselorOnlineModel,
  guidanceCounselorProfessionalId,
  type GuidanceCounselorOnlineInput,
  type GuidanceCounselorRecommendationCard,
} from "@/lib/guidanceCounselorOnline";
import {
  SupabaseExecutionHistoryStore,
  type ExecutionAuditEvent,
  type ProfessionalExecutionHistory,
  type RecommendationLifecycleStatus,
} from "@/lib/platform/agents";
import { createClient } from "@/lib/supabase/client";

export default function GuidanceCounselorOnline({
  memberId,
  input,
}: {
  memberId: string;
  input: GuidanceCounselorOnlineInput;
}) {
  const [store, setStore] = useState<SupabaseExecutionHistoryStore | null>(null);
  const [history, setHistory] = useState<ProfessionalExecutionHistory>();
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [actorType, setActorType] =
    useState<Extract<ExecutionAuditEvent["actorType"], "member" | "owner">>(
      "member"
    );
  const model = useMemo(
    () => buildGuidanceCounselorOnlineModel(input, history),
    [history, input]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setHistoryLoading(true);
      const client = createClient();
      const [{ data: { user }, error: authError }, profileResult] =
        await Promise.all([
          client.auth.getUser(),
          client.from("profiles").select("role").eq("id", memberId).maybeSingle(),
        ]);
      if (authError) throw authError;
      if (!user || user.id !== memberId) {
        throw new Error("Execution history owner mismatch.");
      }
      const nextStore = new SupabaseExecutionHistoryStore(client);
      const nextHistory = await nextStore.listProfessionalHistory(
        memberId,
        guidanceCounselorProfessionalId
      );
      if (cancelled) return;
      setActorType(
        (profileResult.data as { role?: string } | null)?.role === "admin"
          ? "owner"
          : "member"
      );
      setStore(nextStore);
      setHistory(nextHistory);
      setHistoryError("");
      setHistoryLoading(false);
    }
    void loadHistory().catch(() => {
      if (cancelled) return;
      setHistoryError(
        "Recommendation history is temporarily unavailable. Current learning guidance remains available from saved education records."
      );
      setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  async function refreshHistory() {
    if (!store) return;
    setHistory(
      await store.listProfessionalHistory(
        memberId,
        guidanceCounselorProfessionalId
      )
    );
  }

  async function decideRecommendation(
    recommendation: GuidanceCounselorRecommendationCard,
    nextStatus: Extract<
      RecommendationLifecycleStatus,
      "accepted" | "declined" | "deferred"
    >
  ) {
    if (!store) {
      setHistoryError(
        "Recommendation decisions cannot be saved until execution history is available."
      );
      return;
    }
    setPendingId(recommendation.sourceRecommendationId);
    setHistoryError("");
    try {
      let lifecycle = recommendation.lifecycle;
      let requestStatus = lifecycle
        ? history?.requests.find(
            (request) => request.id === lifecycle?.requestId
          )?.status
        : undefined;
      if (!lifecycle) {
        const requestId = await store.create({
          professionalId: guidanceCounselorProfessionalId,
          requestType: "learning_recommendation_review",
          title: recommendation.title,
          actionClassification: "recommendation_only",
          contextReferences: [{
            source: "beasteducation",
            sourceRecommendationId: recommendation.sourceRecommendationId,
          }],
          limitations: recommendation.limitations,
        });
        await store.transition(
          requestId,
          "analyzing",
          actorType,
          { source: "guidance_counselor_recommendation" },
          recommendation.supportingEvidence
        );
        requestStatus = "analyzing";
        lifecycle = await store.createRecommendation({
          ownerId: memberId,
          requestId,
          professionalId: guidanceCounselorProfessionalId,
          title: recommendation.title,
          recommendation: recommendation.recommendation,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: [{
            source: "beasteducation",
            sourceRecommendationId: recommendation.sourceRecommendationId,
          }, ...recommendation.supportingEvidence],
        });
      }
      if (lifecycle.status !== nextStatus) {
        await store.transitionRecommendation({
          recommendationId: lifecycle.id,
          status: nextStatus,
          reason: `Member selected ${nextStatus} in Guidance Counselor.`,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: [{
            source: "beasteducation",
            sourceRecommendationId: recommendation.sourceRecommendationId,
          }, ...recommendation.supportingEvidence],
        });
      }
      await store.recordDecision({
        ownerId: memberId,
        requestId: lifecycle.requestId,
        decisionScope: actorType === "owner" ? "owner" : "member",
        decision: nextStatus === "accepted" ? "approved" : nextStatus,
        reason: `Guidance Counselor recommendation ${nextStatus}.`,
        limitationsAcknowledged: recommendation.limitations,
      });
      if (requestStatus === "queued" || requestStatus === "awaiting_context") {
        await store.transition(
          lifecycle.requestId,
          "analyzing",
          actorType,
          { recommendationStatus: nextStatus }
        );
        requestStatus = "analyzing";
      }
      if (requestStatus === "analyzing") {
        await store.transition(
          lifecycle.requestId,
          nextStatus === "accepted"
            ? "approved"
            : nextStatus === "deferred"
              ? "awaiting_context"
              : "canceled",
          actorType,
          { recommendationStatus: nextStatus }
        );
      }
      await refreshHistory();
    } catch {
      setHistoryError(
        "The recommendation decision could not be saved. No learning record or activity was changed."
      );
    } finally {
      setPendingId("");
    }
  }

  async function recordOutcome(
    recommendation: GuidanceCounselorRecommendationCard,
    outcomeStatus: "successful" | "neutral" | "unsuccessful"
  ) {
    if (!store || !recommendation.lifecycle) return;
    setPendingId(recommendation.sourceRecommendationId);
    setHistoryError("");
    const learning =
      outcomeStatus === "successful"
        ? "Member reported that this guidance helped."
        : outcomeStatus === "neutral"
          ? "Member reported no clear change from this guidance."
          : "Member reported that this guidance did not help.";
    try {
      const request = history?.requests.find(
        (item) => item.id === recommendation.lifecycle?.requestId
      );
      if (request?.status === "approved") {
        await store.transition(
          request.id,
          "executing",
          actorType,
          { source: "member_reported_outcome" }
        );
      }
      await store.recordResultAndOutcome({
        ownerId: memberId,
        requestId: recommendation.lifecycle.requestId,
        outcomeStatus,
        recommendationTitle: recommendation.title,
        memberLearning: [learning],
        actualResult: { source: "member_report", status: outcomeStatus },
        limitations: [
          "Outcome is member-reported and was not independently verified.",
        ],
        supportingEvidence: [{
          source: "member_report",
          sourceRecommendationId: recommendation.sourceRecommendationId,
        }],
      });
      await store.transitionRecommendation({
        recommendationId: recommendation.lifecycle.id,
        status: "completed",
        reason: learning,
      });
      if (request?.status === "approved") {
        await store.transition(
          request.id,
          "completed",
          actorType,
          { outcomeStatus, source: "member_report" }
        );
      }
      await refreshHistory();
    } catch {
      setHistoryError(
        "The outcome could not be saved. No learning record or activity was changed."
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <section
      className="space-y-6"
      aria-label="Guidance Counselor online workspace"
      data-guidance-counselor-online="true"
    >
      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Learning Briefing"
          title={model.learningBriefing.title}
          description={model.learningBriefing.summary}
          action={<ModuleBadge module="learning" label="Guidance ready" />}
        />
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-[#8f9cad]">Current goal</dt>
            <dd className="mt-2 text-sm leading-6 text-white">{model.learningBriefing.currentGoal}</dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-[#8f9cad]">Recent progress</dt>
            <dd className="mt-2 text-sm leading-6 text-white">{model.learningBriefing.recentProgress}</dd>
          </div>
        </dl>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Diagnostics"
            title={model.diagnostics.status === "available" ? "Learning evidence available" : "No saved placement diagnostic"}
            description={model.diagnostics.summary}
          />
          {model.diagnostics.evidence.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#c7cfdb]">
              {model.diagnostics.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          <details className="mt-4 rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm font-bold text-indigo-100">Diagnostic limitations</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#9aa7b8]">
              {model.diagnostics.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        </DashboardCard>

        <DashboardCard accent="blue">
          <SectionHeader
            eyebrow="Goal Planning"
            title="Goals connected to the current path"
            description="Guidance Counselor organizes the plan; saved goals remain the source of truth."
          />
          <div className="mt-4 grid gap-3">
            {model.goalPlanning.length ? model.goalPlanning.map((goal) => (
              <article key={goal.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-white">{goal.title}</h3>
                  <span className="text-xs font-bold text-indigo-100">{goal.status} · {goal.progress}%</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{goal.target}</p>
              </article>
            )) : <p className="rounded-xl border border-white/10 p-4 text-sm text-[#c7cfdb]">No saved learning goal is available. Guidance Counselor will not invent one.</p>}
          </div>
          <Link href="/dashboard/education/goals" className="beast-button-secondary mt-4 inline-flex">Manage learning goals</Link>
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Learning Priorities"
            title="What deserves attention next"
            description="Priorities come from the current mission and deterministic learning recommendation rules."
          />
          <div className="mt-4 grid gap-3">
            {model.learningPriorities.map((priority) => (
              <article key={priority.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-black text-white">{priority.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{priority.reason}</p>
                <Link href={priority.href} className="mt-3 inline-flex text-sm font-black text-indigo-200">Review priority <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="purple">
          <SectionHeader
            eyebrow="Career Guidance"
            title={model.careerGuidance.title}
            description={model.careerGuidance.summary}
          />
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#c7cfdb]">
            {model.careerGuidance.areasToVerify.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link href={model.careerGuidance.href} className="beast-button-secondary mt-4 inline-flex">Continue career planning</Link>
        </DashboardCard>
      </div>

      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Tutor Handoff"
          title={model.tutorHandoff.handoff}
          description={model.tutorHandoff.reason}
          action={<ModuleBadge module="learning" label={model.tutorHandoff.role} />}
        />
        <p className="mt-4 text-sm leading-6 text-[#c7cfdb]">{model.tutorHandoff.contextSummary}</p>
        <p className="mt-3 rounded-xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4 text-sm leading-6 text-indigo-50">{model.tutorHandoff.boundary}</p>
        <Link href={model.tutorHandoff.href} className="beast-button-primary mt-4 inline-flex">Hand off to Tutor</Link>
      </DashboardCard>

      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Notifications"
          title="Learning updates that need your attention"
          description="Only current mission, confidence, and missing-context signals are shown."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {model.notifications.map((notification) => (
            <article key={notification.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-indigo-200">{notification.kind}</p>
              <h3 className="mt-2 font-black text-white">{notification.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{notification.detail}</p>
              <Link href={notification.href} className="mt-3 inline-flex text-sm font-black text-indigo-200">Review <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="blue">
        <SectionHeader
          eyebrow="Recommendations"
          title="Review and track counselor recommendations"
          description="Decisions are written to immutable Execution History. They do not change learning records or start Tutor activity."
          action={historyLoading ? <span className="text-xs text-[#8f9cad]" role="status">Loading history…</span> : undefined}
        />
        {historyError ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100" role="alert">{historyError}</p> : null}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {model.recommendations.map((recommendation) => {
            const lifecycle = recommendation.lifecycle;
            const pending = pendingId === recommendation.sourceRecommendationId;
            return (
              <article key={recommendation.sourceRecommendationId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-200">{lifecycle?.status || "proposed"}</p>
                    <h3 className="mt-2 font-black text-white">{recommendation.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-[#c7cfdb]">{recommendation.confidence.label} · {recommendation.confidence.score}%</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">{recommendation.recommendation}</p>
                <details className="mt-4 rounded-xl border border-white/10 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-indigo-100">Evidence, confidence, and limitations</summary>
                  <p className="mt-3 text-xs leading-5 text-[#9aa7b8]">{recommendation.confidence.basis}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#9aa7b8]">
                    {recommendation.supportingEvidence.map((item) => <li key={`${item.label}-${String(item.value)}`}>{item.label}: {String(item.value)}</li>)}
                    {recommendation.limitations.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </details>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={recommendation.href} className="beast-button-secondary inline-flex min-h-11 items-center">Review source</Link>
                  {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" className="beast-button min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "accepted"); }}>Accept</button> : null}
                  {(!lifecycle || lifecycle.status === "proposed") ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "deferred"); }}>Defer</button> : null}
                  {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "declined"); }}>Decline</button> : null}
                </div>
                {lifecycle?.status === "accepted" ? <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs font-bold text-[#c7cfdb]">After following this guidance, what changed?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "successful"); }}>It helped</button>
                    <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "neutral"); }}>No clear change</button>
                    <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "unsuccessful"); }}>It did not help</button>
                  </div>
                </div> : null}
              </article>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard accent="green">
        <SectionHeader
          eyebrow="Outcome Learning"
          title="What prior guidance taught us"
          description="Only persisted member-reported outcomes appear here."
        />
        <div className="mt-4 grid gap-3">
          {model.outcomeLearning.length ? model.outcomeLearning.map((outcome) => (
            <article key={outcome.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-white">{outcome.recommendationTitle}</h3>
                <span className="text-xs font-bold text-[#9aa7b8]">{outcome.status} · {new Date(outcome.recordedAt).toLocaleDateString()}</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#c7cfdb]">{outcome.learning.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          )) : <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">No outcomes have been reported yet. Learning appears only after you accept guidance and explicitly report what happened.</p>}
        </div>
      </DashboardCard>
    </section>
  );
}

