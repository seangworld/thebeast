import type { AgentPromptTemplate } from "./types";

export class AgentPromptFramework {
  private readonly templates = new Map<string, AgentPromptTemplate>();

  register(template: AgentPromptTemplate) {
    if (!template.id.trim() || !template.system.trim() || !template.version.trim()) {
      throw new Error("Agent prompt id, system instructions, and version are required.");
    }
    if (this.templates.has(template.id)) throw new Error(`Agent prompt ${template.id} is already registered.`);
    this.templates.set(template.id, Object.freeze({ ...template }));
    return template;
  }

  has(templateId: string) {
    return this.templates.has(templateId);
  }

  version(templateId: string) {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Agent prompt ${templateId} is not registered.`);
    return template.version;
  }

  render(templateId: string, variables: Readonly<Record<string, string>>) {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Agent prompt ${templateId} is not registered.`);
    for (const name of template.variables) {
      if (!(name in variables)) throw new Error(`Agent prompt variable ${name} is required.`);
    }
    const replace = (value: string) => value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, name) => variables[name] ?? "");
    return {
      templateId,
      version: template.version,
      system: replace(template.system),
      constraints: template.constraints.map(replace),
    };
  }
}
