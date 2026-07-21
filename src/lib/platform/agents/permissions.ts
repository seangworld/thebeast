import type { AgentDefinition, AgentPermission } from "./types";

export class AgentPermissionService {
  can(agent: AgentDefinition, resource: string, action: string) {
    const matching = agent.requestedPermissions.filter(
      (permission) => permission.resource === resource && permission.actions.includes(action),
    );
    if (matching.some((permission) => permission.effect === "deny")) return false;
    return matching.some((permission) => permission.effect === "allow");
  }

  assert(agent: AgentDefinition, resource: string, action: string) {
    if (!this.can(agent, resource, action)) {
      throw new Error(`Agent ${agent.id} is not permitted to ${action} ${resource}.`);
    }
  }

  validateRequestedPermissions(permissions: readonly AgentPermission[]) {
    for (const permission of permissions) {
      if (!permission.resource.trim()) throw new Error("Agent permission resource is required.");
      if (!permission.actions.length || permission.actions.some((action) => !action.trim())) {
        throw new Error("Agent permission actions are required.");
      }
    }
    return permissions;
  }
}
