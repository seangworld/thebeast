import type { AgentModuleManifest } from "../platform/agents";

export const beastEducationAgentManifest: AgentModuleManifest = {
  id: "beasteducation",
  displayName: "BeastEducation",
  version: "2.3.1",
  agents: [{
    id: "beasteducation.guidance-counselor",
    moduleId: "beasteducation",
    displayName: "Guidance Counselor",
    description: "Maintains the long-term education relationship and recommends the best evidence-based next step.",
    version: "2.3.1",
    promptTemplateId: "beasteducation.guidance-counselor.v2",
    requestedToolIds: [],
    requestedPermissions: [{ resource: "education.profile", actions: ["read"], effect: "allow" }],
    experience: {
      userStoryProviderId: "beasteducation.education-profile",
      proactiveGuidance: true,
      progressiveCompletion: true,
      relationshipMemoryScope: "user",
      fallbackAction: "Ask one high-value question or continue the smallest verified roadmap step.",
    },
    metadata: {
      playbook: "optional",
      relationshipOwner: "true",
      primaryProfessional: "Guidance Counselor",
      primaryExperience: "educational-planning",
      teachingPosition: "future-specialist-support",
    },
  }],
  contextProviders: [{
    id: "beasteducation.education-profile",
    moduleId: "beasteducation",
    description: "Provides the owner's permissioned Education Profile context.",
    async provide(request) {
      return [{
        id: `education-profile:${request.ownerId}`,
        providerId: "beasteducation.education-profile",
        source: "BeastEducation Education Profile",
        content: { ownerId: request.ownerId, status: "available-through-approved-adapter" },
        sensitivity: "sensitive",
        requiredPermission: { resource: "education.profile", action: "read" },
      }];
    },
  }],
  promptTemplates: [{
    id: "beasteducation.guidance-counselor.v2",
    moduleId: "beasteducation",
    version: "2.3.1",
    system: "Understand who the user is, where they are, where they want to go, what changed, and the best next step. Interview progressively, reason from evidence, explain recommendations, recognize milestones, and preserve meaningful continuity. Teaching belongs to specialists.",
    constraints: [
      "Center the experience on educational planning, career exploration, educational roadmaps, school planning, certification planning, and long-term educational goals.",
      "Do not center the member relationship on courses, lessons, or tutoring.",
      "Preserve teaching capabilities for a future specialist handoff when the roadmap identifies a concrete knowledge gap.",
      "Never invent profile facts, opportunities, requirements, or progress.",
      "Separate stated, observed, and inferred evidence.",
      "Verify changing career, certification, school, eligibility, deadline, and cost claims.",
      "Use cross-module context only when permissioned and purpose-limited.",
      "Use an approved playbook when available; otherwise continue with deterministic guidance rules.",
    ],
    variables: ["educationProfile", "roadmap", "recentChanges", "crossModuleContext", "longTermMemory"],
  }],
};
