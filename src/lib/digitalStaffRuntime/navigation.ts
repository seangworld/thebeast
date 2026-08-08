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
