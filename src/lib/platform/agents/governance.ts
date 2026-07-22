import type {
  AgentCurrentContext, AgentDefinition, AgentLearningProposal, AgentPlaybook, AgentRunAudit,
  AgentUserPreferences, LearningJournalStatus,
} from "./types";
import type { AgentMemoryStore } from "./memory";
import { AgentPermissionService } from "./permissions";

const semver = /^\d+\.\d+\.\d+$/;

export class AgentPlaybookRegistry {
  private readonly versions = new Map<string, Map<string, Readonly<AgentPlaybook>>>();

  register(playbook: AgentPlaybook) {
    if (!playbook.agentId.trim() || !semver.test(playbook.version)) throw new Error("Playbook agent id and semantic version are required.");
    if (playbook.status === "approved" && (!playbook.approval || !playbook.effectiveDate)) throw new Error("Approved playbooks require approval metadata and an effective date.");
    const agentVersions = this.versions.get(playbook.agentId) ?? new Map();
    if (agentVersions.has(playbook.version)) throw new Error(`Playbook ${playbook.agentId}@${playbook.version} is immutable.`);
    if (playbook.supersedes && !agentVersions.has(playbook.supersedes)) throw new Error(`Superseded playbook ${playbook.supersedes} is not registered.`);
    const immutable = Object.freeze({
      ...playbook,
      professionalRules: Object.freeze([...playbook.professionalRules]),
      recommendationHierarchy: Object.freeze([...playbook.recommendationHierarchy]),
      communicationRules: Object.freeze([...playbook.communicationRules]),
      safetyBoundaries: Object.freeze([...playbook.safetyBoundaries]),
      prohibitions: Object.freeze([...playbook.prohibitions]),
      approval: playbook.approval ? Object.freeze({ ...playbook.approval }) : undefined,
    });
    agentVersions.set(playbook.version, immutable);
    this.versions.set(playbook.agentId, agentVersions);
    return immutable;
  }

  list(agentId?: string) { return Array.from(this.versions.entries()).flatMap(([id, versions]) => agentId && id !== agentId ? [] : Array.from(versions.values())); }

  approved(agentId: string, at = new Date()) {
    const approved = this.list(agentId).filter((item) => item.status === "approved" && Date.parse(item.effectiveDate!) <= at.getTime());
    approved.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    const current = approved.at(-1);
    if (!current) throw new Error(`Agent ${agentId} has no effective approved playbook.`);
    return current;
  }
}

export class AgentPreferenceStore {
  private readonly records = new Map<string, Readonly<AgentUserPreferences>>();
  put(record: AgentUserPreferences) { this.records.set(`${record.ownerId}:${record.agentId}`, Object.freeze({ ...record })); return record; }
  get(ownerId: string, agentId: string) { return this.records.get(`${ownerId}:${agentId}`); }
}

export class AgentCurrentContextStore {
  private readonly records = new Map<string, Readonly<AgentCurrentContext>>();
  put(record: AgentCurrentContext) {
    if (!record.evidence.length) throw new Error("Current context requires a source-aware evidence reference.");
    const existing = this.records.get(record.id);
    if (existing && (existing.ownerId !== record.ownerId || existing.agentId !== record.agentId)) throw new Error("Current context belongs to a different owner or agent.");
    this.records.set(record.id, Object.freeze({ ...record, evidence: Object.freeze([...record.evidence]) })); return record;
  }
  query(ownerId: string, agentId: string) {
    const now = Date.now();
    return Array.from(this.records.values()).filter((item) => item.ownerId === ownerId && item.agentId === agentId && (!item.expiresAt || Date.parse(item.expiresAt) > now));
  }
}

const journalTransitions: Record<LearningJournalStatus, readonly LearningJournalStatus[]> = {
  proposed: ["under_review", "rejected", "deferred"], under_review: ["accepted", "rejected", "deferred"],
  accepted: ["implemented"], rejected: [], deferred: ["under_review"], implemented: [],
};
export class AgentLearningJournal {
  private readonly records = new Map<string, Readonly<AgentLearningProposal>>();
  propose(record: AgentLearningProposal) {
    if (record.status !== "proposed") throw new Error("New learning journal entries must be proposed.");
    if (!record.evidence.length) throw new Error("Learning proposals require evidence.");
    if (this.records.has(record.id)) throw new Error(`Learning proposal ${record.id} already exists.`);
    this.records.set(record.id, Object.freeze({ ...record })); return record;
  }
  transition(id: string, status: LearningJournalStatus, review: { reviewedBy: string; reviewedAt: string; implementedInPlaybookVersion?: string }) {
    const current = this.records.get(id); if (!current) throw new Error(`Unknown learning proposal ${id}.`);
    if (!journalTransitions[current.status].includes(status)) throw new Error(`Invalid learning journal transition ${current.status} -> ${status}.`);
    if (status === "implemented" && !review.implementedInPlaybookVersion) throw new Error("Implemented proposals require a new playbook version reference.");
    const next = Object.freeze({ ...current, ...review, status }); this.records.set(id, next); return next;
  }
  list(agentId?: string) { return Array.from(this.records.values()).filter((item) => !agentId || item.agentId === agentId); }
}

export class AgentRunAuditStore {
  private readonly records: Readonly<AgentRunAudit>[] = [];
  append(record: AgentRunAudit) { (this.records as AgentRunAudit[]).push(Object.freeze({ ...record })); return record; }
  list(input: { agentId?: string; ownerId?: string } = {}) { return this.records.filter((item) => (!input.agentId || item.agentId === input.agentId) && (!input.ownerId || item.ownerId === input.ownerId)); }
}

export const agentGovernancePriority = ["safety_and_legal", "permissions", "approved_playbook", "user_preferences", "durable_memory", "current_context", "suggestions"] as const;

export class GovernedRunAssembler {
  constructor(
    private readonly playbooks: AgentPlaybookRegistry, private readonly preferences: AgentPreferenceStore,
    private readonly memory: AgentMemoryStore, private readonly currentContext: AgentCurrentContextStore,
    private readonly permissions: AgentPermissionService,
  ) {}
  async assemble(agent: AgentDefinition, ownerId: string) {
    const playbook = this.playbooks.approved(agent.id);
    const memory = await this.memory.query({ agentId: agent.id, ownerId });
    const context = this.currentContext.query(ownerId, agent.id).filter((item) => !item.requiredPermission || this.permissions.can(agent, item.requiredPermission.resource, item.requiredPermission.action));
    return { priority: agentGovernancePriority, playbook, preferences: this.preferences.get(ownerId, agent.id), memory, currentContext: context };
  }
}
