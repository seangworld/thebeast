"use client";

import {
  digitalProfessionals,
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
  canonicalId: string;
  name: string;
  role: string;
  roleDescription: string;
  avatarUrl?: string;
  avatarDescription: string;
  initials: string;
  accent: ProfessionalConversationAccent;
  moduleAssociation: string;
};

const accentClasses: Record<ProfessionalConversationAccent, string> = {
  money: "ring-cyan-300/35",
  learning: "ring-indigo-300/35",
  health: "ring-rose-300/35",
  neutral: "ring-violet-300/35",
};

const moduleAccents: Readonly<Record<string, ProfessionalConversationAccent>> = {
  BeastMoney: "money",
  BeastEducation: "learning",
  BeastHealth: "health",
};

export const professionalConversationRegistry: readonly ProfessionalConversationIdentity[] =
  digitalProfessionals.map((professional) => ({
    id: professional.id,
    canonicalId: professional.canonicalId,
    name: professional.name,
    role: professional.role,
    roleDescription: professional.title,
    avatarUrl: professional.portrait.avatar_url || undefined,
    avatarDescription: `${professional.name}, ${professional.role}`,
    initials: getDigitalProfessionalInitials(professional),
    accent: moduleAccents[professional.team] || "neutral",
    moduleAssociation: professional.team,
  }));

export function getProfessionalConversationIdentity(
  professionalId: string,
  accent?: ProfessionalConversationAccent
): ProfessionalConversationIdentity {
  const registered = professionalConversationRegistry.find(
    (professional) => professional.id === professionalId
  );
  if (!registered) {
    throw new Error(`Unknown Digital Professional: ${professionalId}`);
  }
  return accent ? { ...registered, accent } : registered;
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
        name={identity.name}
        accessibleLabel={identity.avatarDescription}
        imageUrl={identity.avatarUrl}
        initials={identity.initials}
        size={size}
      />
    </div>
  );
}
