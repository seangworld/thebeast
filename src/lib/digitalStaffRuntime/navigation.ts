import { beastLearningNavigation, beastMoneyNavigation } from "../moduleNavigation";
import type { ProfessionalConfig } from "./config";

export type NavigationTarget = { label: string; href: string; professionalId: string };

export function navigationRegistry(config: ProfessionalConfig): NavigationTarget[] {
  const configured = config.workspaces.map(({ label, href }) => ({ label, href, professionalId: config.id }));
  const moduleItems = config.id === "beastmoney.money-coach"
    ? beastMoneyNavigation.children || []
    : config.id === "beasteducation.guidance-counselor"
      ? beastLearningNavigation.children || []
      : [];
  return Array.from(new Map([...configured, ...moduleItems.map(({ label, href }) => ({ label, href, professionalId: config.id }))].map((item) => [item.href, item])).values());
}

export function validateNavigationTarget(config: ProfessionalConfig, href: string | null) {
  if (!href) return null;
  return navigationRegistry(config).find((item) => item.href === href) || null;
}

export function inferProductNavigationTarget(config: ProfessionalConfig, message: string) {
  const normalizedMessage = message.toLowerCase();
  const workspacesByHref = new Map(config.workspaces.map((workspace) => [workspace.href, workspace]));
  const matches = navigationRegistry(config).flatMap((target) => {
    const workspace = workspacesByHref.get(target.href);
    const pathTopic = target.href.split("/").at(-1)?.replaceAll("-", " ") || "";
    const terms = [target.label.toLowerCase(), pathTopic, ...(workspace?.topics || []).map((topic) => topic.toLowerCase())]
      .filter((term, index, all) => term.length > 2 && all.indexOf(term) === index);
    const matchedTerm = terms
      .filter((term) => normalizedMessage.includes(term))
      .sort((left, right) => right.length - left.length)[0];
    return matchedTerm ? [{ target, score: matchedTerm.length }] : [];
  });

  return matches.sort((left, right) => right.score - left.score)[0]?.target || null;
}
