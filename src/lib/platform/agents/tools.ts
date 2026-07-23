import type { AgentToolContext, AgentToolDefinition, AgentToolId } from "./types";
import { AgentPermissionService } from "./permissions";
import type { AgentRegistry } from "./registry";

export type AgentActionToolKind = "navigate" | "create" | "upload" | "search";
export type AgentActionDataRequirement = { key: string; label: string; required: boolean };
export type AgentActionToolDefinition = {
  id: string;
  title: string;
  description: string;
  kind: AgentActionToolKind;
  permission: { resource: string; action: string };
  requiredData: readonly AgentActionDataRequirement[];
  confirmation: "none" | "required";
  specialistAvailability: readonly string[] | "all";
  target?: string;
};

export type StructuredAgentAction = {
  id: string;
  toolId: string;
  title: string;
  description: string;
  kind: AgentActionToolKind;
  permission: { resource: string; action: string };
  input: Readonly<Record<string, unknown>>;
  target?: string;
  confirmation: "not-required" | "required" | "confirmed";
  status: "prepared";
};

export type PrepareAgentActionInput = {
  toolId: string;
  specialistId: string;
  data?: Readonly<Record<string, unknown>>;
  grantedPermissions: readonly { resource: string; action: string }[];
  actionId?: string;
};

export class AgentActionToolRegistry {
  private readonly tools = new Map<string, Readonly<AgentActionToolDefinition>>();

  register(tool: AgentActionToolDefinition) {
    if (!tool.id.trim() || !tool.title.trim() || !tool.description.trim()) throw new Error("Agent action tools require an id, title, and description.");
    if (this.tools.has(tool.id)) throw new Error(`Agent action tool ${tool.id} is already registered.`);
    if (tool.kind === "navigate" && !tool.target) throw new Error("Navigation tools require a registered target.");
    const stored = Object.freeze({ ...tool, requiredData: Object.freeze([...tool.requiredData]), specialistAvailability: tool.specialistAvailability === "all" ? "all" : Object.freeze([...tool.specialistAvailability]) });
    this.tools.set(tool.id, stored);
    return stored;
  }

  get(toolId: string) { return this.tools.get(toolId); }
  require(toolId: string) { const tool = this.get(toolId); if (!tool) throw new Error(`Agent action tool ${toolId} is not registered.`); return tool; }
  listForSpecialist(specialistId: string) { return Array.from(this.tools.values()).filter((tool) => tool.specialistAvailability === "all" || tool.specialistAvailability.includes(specialistId)); }
  findNavigationByTarget(target: string) { return Array.from(this.tools.values()).find((tool) => tool.kind === "navigate" && tool.target === target); }

  prepare(input: PrepareAgentActionInput): StructuredAgentAction {
    const tool = this.require(input.toolId);
    if (tool.specialistAvailability !== "all" && !tool.specialistAvailability.includes(input.specialistId)) throw new Error(`Agent action tool ${tool.id} is not available to ${input.specialistId}.`);
    if (!input.grantedPermissions.some((permission) => permission.resource === tool.permission.resource && permission.action === tool.permission.action)) throw new Error(`Agent action tool ${tool.id} requires ${tool.permission.resource}:${tool.permission.action}.`);
    const data = input.data || {};
    const missing = tool.requiredData.filter((requirement) => requirement.required && (data[requirement.key] === undefined || data[requirement.key] === null || data[requirement.key] === ""));
    if (missing.length) throw new Error(`Agent action tool ${tool.id} requires ${missing.map((item) => item.label).join(", ")}.`);
    return Object.freeze({ id: input.actionId || `${tool.id}:${Date.now()}`, toolId: tool.id, title: tool.title, description: tool.description, kind: tool.kind, permission: tool.permission, input: Object.freeze({ ...data }), target: tool.target, confirmation: tool.confirmation === "required" ? "required" : "not-required", status: "prepared" });
  }

  confirm(action: StructuredAgentAction): StructuredAgentAction {
    if (action.confirmation !== "required") return action;
    return Object.freeze({ ...action, confirmation: "confirmed" });
  }
}

const moneyCoach = "beastmoney.money-coach";
export const defaultAgentActionTools = [
  { id: "open-workspace", title: "Open workspace", description: "Open an approved Beast workspace.", kind: "navigate", permission: { resource: "beastos.navigation", action: "open" }, requiredData: [], confirmation: "none", specialistAvailability: "all", target: "/dashboard" },
  { id: "create-goal", title: "Create goal", description: "Prepare a new member goal for confirmation.", kind: "create", permission: { resource: "beastos.goals", action: "create" }, requiredData: [{ key: "title", label: "Goal title", required: true }], confirmation: "required", specialistAvailability: "all" },
  { id: "create-reminder", title: "Create reminder", description: "Prepare a reminder for confirmation.", kind: "create", permission: { resource: "beastos.calendar", action: "create" }, requiredData: [{ key: "title", label: "Reminder title", required: true }, { key: "date", label: "Reminder date", required: true }], confirmation: "required", specialistAvailability: "all" },
  { id: "upload-document", title: "Upload document", description: "Open the approved document upload workflow.", kind: "upload", permission: { resource: "beastos.documents", action: "upload" }, requiredData: [], confirmation: "none", specialistAvailability: "all", target: "/dashboard/uploads" },
  { id: "import-financial-data", title: "Import financial data", description: "Open the review-before-save BeastMoney import workflow.", kind: "upload", permission: { resource: "beastmoney.import", action: "create" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/import" },
  { id: "search-documents", title: "Search documents", description: "Search owner-scoped Beast documents.", kind: "search", permission: { resource: "beastos.documents", action: "read" }, requiredData: [{ key: "query", label: "Search query", required: true }], confirmation: "none", specialistAvailability: "all" },
  { id: "open-money-dashboard", title: "Open financial dashboard", description: "Open the BeastMoney analytical dashboard.", kind: "navigate", permission: { resource: "beastmoney.workspace", action: "open" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/dashboard" },
  { id: "open-financial-health-score", title: "Open Financial Health Score", description: "Open the transparent BeastMoney financial-wellness calculation.", kind: "navigate", permission: { resource: "beastmoney.workspace", action: "open" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/dashboard#financial-health-score" },
  { id: "open-money-observations", title: "Open Observation Center", description: "Open evidence-backed BeastMoney observations.", kind: "navigate", permission: { resource: "beastmoney.workspace", action: "open" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/observations" },
  { id: "open-cash-flow", title: "Open Cash Flow", description: "Open the BeastMoney cash-flow workspace.", kind: "navigate", permission: { resource: "beastmoney.workspace", action: "open" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/cashflow" },
  { id: "open-income", title: "Open Income", description: "Open the dedicated BeastMoney income workspace.", kind: "navigate", permission: { resource: "beastmoney.income", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/income" },
  { id: "add-income", title: "Add income", description: "Open the owner-scoped Income workspace to add a source.", kind: "navigate", permission: { resource: "beastmoney.income", action: "create" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/income#income-sources" },
  { id: "open-bills", title: "Open Bills", description: "Open the owner-scoped Bills workspace.", kind: "navigate", permission: { resource: "beastmoney.bills", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/cashflow#bills" },
  { id: "open-debt", title: "Open Debts", description: "Open the owner-scoped debt workspace.", kind: "navigate", permission: { resource: "beastmoney.debts", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/debts" },
  { id: "open-forecast", title: "Open Forecast", description: "Open BeastMoney forecasting in the financial dashboard.", kind: "navigate", permission: { resource: "beastmoney.forecast", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/dashboard" },
  { id: "open-retirement", title: "Open Retirement", description: "Open the owner-scoped retirement workspace.", kind: "navigate", permission: { resource: "beastmoney.retirement", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/retirement" },
  { id: "open-velocity", title: "Open Velocity", description: "Open the BeastMoney Velocity workspace.", kind: "navigate", permission: { resource: "beastmoney.velocity", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/velocity" },
  { id: "open-income-pots", title: "Open Income Pots", description: "Open Income Pots in the dedicated BeastMoney income workspace.", kind: "navigate", permission: { resource: "beastmoney.income", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/income#income-pots" },
  { id: "open-funding-sources", title: "Open Funding Sources", description: "Open funding sources in the BeastMoney cash-flow workspace.", kind: "navigate", permission: { resource: "beastmoney.cashflow", action: "read" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "/dashboard/money/cashflow#funding-sources" },
  { id: "continue-money-coach-conversation", title: "Continue conversation", description: "Return focus to the active Money Coach conversation.", kind: "navigate", permission: { resource: "beastos.conversation", action: "write" }, requiredData: [], confirmation: "none", specialistAvailability: [moneyCoach], target: "#money-coach-question" },
] satisfies AgentActionToolDefinition[];

export function createDefaultAgentActionToolRegistry() {
  const registry = new AgentActionToolRegistry();
  defaultAgentActionTools.forEach((tool) => registry.register(tool));
  return registry;
}

export const sharedAgentActionTools = createDefaultAgentActionToolRegistry();

export class AgentToolRegistry {
  private readonly tools = new Map<AgentToolId, AgentToolDefinition>();

  constructor(
    private readonly agents: AgentRegistry,
    private readonly permissions: AgentPermissionService,
  ) {}

  register(tool: AgentToolDefinition) {
    if (!tool.id.trim() || !tool.description.trim()) throw new Error("Agent tool id and description are required.");
    if (this.tools.has(tool.id)) throw new Error(`Agent tool ${tool.id} is already registered.`);
    this.tools.set(tool.id, tool);
    return tool;
  }

  get(toolId: AgentToolId) {
    return this.tools.get(toolId);
  }

  has(toolId: AgentToolId) {
    return this.tools.has(toolId);
  }

  listForAgent(agentId: string) {
    const agent = this.agents.require(agentId);
    return agent.requestedToolIds
      .map((id) => this.tools.get(id))
      .filter((tool): tool is AgentToolDefinition => Boolean(tool))
      .filter((tool) => this.permissions.can(agent, tool.requiredPermission.resource, tool.requiredPermission.action));
  }

  async invoke<TOutput = unknown>(toolId: AgentToolId, input: unknown, context: AgentToolContext) {
    const agent = this.agents.require(context.agentId);
    if (context.moduleId !== agent.moduleId) {
      throw new Error(`Agent ${agent.id} cannot be invoked through module ${context.moduleId}.`);
    }
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Agent tool ${toolId} is not registered.`);
    if (!agent.requestedToolIds.includes(toolId)) throw new Error(`Agent ${agent.id} did not request tool ${toolId}.`);
    this.permissions.assert(agent, tool.requiredPermission.resource, tool.requiredPermission.action);
    return tool.execute(input, context) as Promise<TOutput>;
  }
}
