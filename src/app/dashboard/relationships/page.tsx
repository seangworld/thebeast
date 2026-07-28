"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import {
  buildRelationshipCenter,
  professionalRelationshipDefinitions,
  type ProfessionalRelationship,
  type RelationshipConversationEvidence,
  type RelationshipMemoryEvidence,
} from "@/lib/platform/relationships";
import { createClient } from "@/lib/supabase/client";

type ConversationRow = {
  id: string;
  agent_id: string;
  title: string;
  summary?: RelationshipConversationEvidence["summary"];
  message_count: number;
  created_at: string;
  updated_at: string;
  archived?: boolean;
};

type MemoryRow = {
  id: string;
  agent_id: string;
  memory_key: string;
  value: unknown;
  updated_at: string;
};

function RelationshipCard({
  relationship,
}: {
  relationship: ProfessionalRelationship;
}) {
  return (
    <DashboardCard accent={relationship.module as ModuleKey}>
      <article aria-labelledby={`${relationship.agentId}-title`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <ModuleBadge
              module={relationship.module as ModuleKey}
              label={relationship.state === "active" ? "Active relationship" : "Ready to begin"}
            />
            <h2
              id={`${relationship.agentId}-title`}
              className="mt-3 text-2xl font-black text-white"
            >
              {relationship.role}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#9aa7b8]">
              {relationship.relationshipDuration}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#6f7d90]">
              Last conversation: {relationship.lastConversation}
            </p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-right">
            <div className="text-[10px] font-black uppercase tracking-wide text-[#6f7d90]">
              Understanding
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {relationship.understandingConfidence.label}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              Current objective
            </dt>
            <dd className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
              {relationship.currentObjective}
            </dd>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              Recent progress
            </dt>
            <dd className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
              {relationship.recentProgress}
            </dd>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              Next recommended conversation
            </dt>
            <dd className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
              {relationship.nextRecommendedConversation}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs font-semibold leading-5 text-[#6f7d90]">
          Confidence basis: {relationship.understandingConfidence.basis}
        </p>
        <Link href={relationship.href} className="beast-button mt-5">
          {relationship.actionLabel}
        </Link>
      </article>
    </DashboardCard>
  );
}

export default function RelationshipCenterPage() {
  const [relationships, setRelationships] = useState<
    ProfessionalRelationship[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRelationships() {
      setLoading(true);
      setError("");
      const client = createClient();
      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Sign in again to view your professional relationships.");

      const agentIds = professionalRelationshipDefinitions.map(
        (professional) => professional.agentId
      );
      const [conversationResult, memoryResult] = await Promise.all([
        client
          .from("agent_conversations")
          .select(
            "id, agent_id, title, summary, message_count, created_at, updated_at, archived"
          )
          .eq("owner_id", user.id)
          .in("agent_id", agentIds),
        client
          .from("agent_memories")
          .select("id, agent_id, memory_key, value, updated_at")
          .eq("owner_id", user.id)
          .in("agent_id", agentIds),
      ]);
      if (conversationResult.error) throw conversationResult.error;
      if (memoryResult.error) throw memoryResult.error;

      const conversations = ((conversationResult.data || []) as ConversationRow[]).map(
        (row): RelationshipConversationEvidence => ({
          id: row.id,
          agentId: row.agent_id,
          title: row.title,
          summary: row.summary,
          messageCount: Number(row.message_count || 0),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          archived: Boolean(row.archived),
        })
      );
      const memories = ((memoryResult.data || []) as MemoryRow[]).map(
        (row): RelationshipMemoryEvidence => ({
          id: row.id,
          agentId: row.agent_id,
          key: row.memory_key,
          value: row.value,
          updatedAt: row.updated_at,
        })
      );

      if (!cancelled) {
        setRelationships(
          buildRelationshipCenter({
            conversations,
            memories,
            now: new Date(),
          })
        );
        setLoading(false);
      }
    }

    void loadRelationships().catch(() => {
      if (cancelled) return;
      setRelationships([]);
      setError(
        "Your professional relationships could not be loaded right now. Please try again."
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="beastos"
          eyebrow="BeastOS Relationship Center"
          title="Your professional team"
          description="See the relationships, shared objectives, recent progress, and next conversations developing across your Beast professionals."
        />

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Long-term relationships"
            title="The same professionals, over time"
            description="Relationship Center reads saved conversations and durable context. It does not invent history or change how any professional works."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
              <p className="text-sm font-black text-white">Household relationships</p>
              <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">People connected through owner-controlled household permissions.</p>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
              <p className="text-sm font-black text-white">Human contacts</p>
              <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">People you record or communicate with; they are never presented as Digital Professionals.</p>
            </div>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-4">
              <p className="text-sm font-black text-white">Digital Professionals</p>
              <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">Permissioned Beast professionals with explicit capabilities, limitations, and status.</p>
              <Link href="/dashboard/digital-staff" className="mt-3 inline-flex text-xs font-black text-cyan-200 hover:text-cyan-100">
                Meet the Digital Staff →
              </Link>
            </div>
          </div>
        </DashboardCard>

        {loading ? (
          <div
            className="grid gap-5 xl:grid-cols-3"
            role="status"
            aria-label="Loading professional relationships"
          >
            {professionalRelationshipDefinitions.map((professional) => (
              <div
                key={professional.agentId}
                className="min-h-[30rem] animate-pulse rounded-2xl border border-[#2a3242] bg-[#111827] p-5"
              >
                <div className="h-5 w-28 rounded bg-[#2a3242]" />
                <div className="mt-4 h-8 w-44 rounded bg-[#2a3242]" />
                <div className="mt-8 h-24 rounded bg-[#2a3242]" />
                <div className="mt-4 h-24 rounded bg-[#2a3242]" />
                <div className="mt-4 h-24 rounded bg-[#2a3242]" />
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <DashboardCard accent="red">
            <p role="alert" className="text-sm font-semibold text-red-100">
              {error}
            </p>
          </DashboardCard>
        ) : null}

        {!loading && !error ? (
          <section
            className="grid items-start gap-5 xl:grid-cols-3"
            aria-label="Active Beast professionals"
          >
            {relationships.map((relationship) => (
              <RelationshipCard
                key={relationship.agentId}
                relationship={relationship}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
