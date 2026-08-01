"use client";

import {
  getDigitalProfessional,
  getDigitalProfessionalInitials,
} from "@/lib/digitalStaff";
import { AgentAvatar } from "./AgentExperience";

export type ProfessionalConversationAccent =
  | "money"
  | "learning"
  | "health"
  | "neutral";

export type ProfessionalConversationIdentity = {
  id: string;
  name: string;
  role: string;
  roleDescription: string;
  avatarUrl?: string;
  initials: string;
  accent: ProfessionalConversationAccent;
};

const accentClasses: Record<ProfessionalConversationAccent, string> = {
  money: "ring-cyan-300/35",
  learning: "ring-indigo-300/35",
  health: "ring-rose-300/35",
  neutral: "ring-violet-300/35",
};

export function getProfessionalConversationIdentity(
  professionalId: string,
  accent: ProfessionalConversationAccent = "neutral"
): ProfessionalConversationIdentity {
  const professional = getDigitalProfessional(professionalId);
  if (!professional) {
    throw new Error(`Unknown Digital Professional: ${professionalId}`);
  }

  return {
    id: professional.id,
    name: professional.name,
    role: professional.role,
    roleDescription: professional.title,
    avatarUrl: professional.portrait.avatar_url || undefined,
    initials: getDigitalProfessionalInitials(professional),
    accent,
  };
}

export const moneyCoachConversationIdentity =
  getProfessionalConversationIdentity("money-coach", "money");
export const guidanceCounselorConversationIdentity =
  getProfessionalConversationIdentity("guidance-counselor", "learning");
export const healthAdvisorConversationIdentity =
  getProfessionalConversationIdentity("health-advisor", "health");

export function formatProfessionalMessageTime(timestamp?: string) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ProfessionalConversationAvatar({
  identity,
  size = "sm",
}: {
  identity: ProfessionalConversationIdentity;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={`shrink-0 rounded-full ring-2 ${accentClasses[identity.accent]}`}
      data-professional-avatar={identity.id}
    >
      <AgentAvatar
        name={`${identity.name}, ${identity.role}`}
        imageUrl={identity.avatarUrl}
        initials={identity.initials}
        size={size}
      />
    </div>
  );
}
