import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";
import {
  beastModuleRegistry,
  isModuleVisibleForOwner,
  type BeastModuleIdentifier,
} from "./moduleRegistry";

export type FutureModuleFoundation = {
  identifier: Extract<BeastModuleIdentifier, "health" | "home">;
  title: string;
  description: string;
  focus: string[];
  href: string;
  sections: number;
};

export type MobileFutureModuleCard = {
  id: string;
  module: Extract<ModuleKey, "health" | "home">;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  metadata: string[];
  dispatchMode: "future-module-foundation-route";
  readOnly: true;
  sourceOwnershipPreserved: true;
};

export function buildMobileFutureModuleCards({
  isOwner,
  foundations,
}: {
  isOwner: boolean;
  foundations: FutureModuleFoundation[];
}): MobileFutureModuleCard[] {
  if (!isOwner) return [];

  return foundations
    .map((foundation) => {
      const registryEntry = beastModuleRegistry.find(
        (entry) => entry.identifier === foundation.identifier
      );

      if (!registryEntry || !isModuleVisibleForOwner(registryEntry)) return null;

      return {
        id: `mobile-future-${foundation.identifier}`,
        module: registryEntry.module as Extract<ModuleKey, "health" | "home">,
        title: foundation.title,
        summary: foundation.description,
        href: foundation.href,
        actionLabel: "Review foundation",
        metadata: [
          registryEntry.visibility,
          registryEntry.status,
          `${foundation.sections} sections`,
          foundation.focus[0],
        ],
        dispatchMode: "future-module-foundation-route" as const,
        readOnly: true as const,
        sourceOwnershipPreserved: true as const,
      };
    })
    .filter((card): card is MobileFutureModuleCard => Boolean(card));
}
