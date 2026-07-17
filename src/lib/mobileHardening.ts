import {
  buildPlatformUXState,
  type PlatformUXState,
  type PlatformUXStateKind,
} from "./platform/ux";

export type MobileHardeningCheckId =
  | "safe-area"
  | "no-horizontal-overflow"
  | "touch-targets"
  | "focus-visible"
  | "reduced-motion"
  | "offline-state"
  | "degraded-state"
  | "source-owned-actions";

export type MobileHardeningCheck = {
  id: MobileHardeningCheckId;
  label: string;
  requirement: string;
  covered: true;
};

export type MobileRuntimeState = {
  online: boolean;
  degraded: boolean;
  banner: PlatformUXState | null;
};

export const mobileHardeningChecks: MobileHardeningCheck[] = [
  {
    id: "safe-area",
    label: "Safe area",
    requirement: "Mobile shell honors iPhone top and bottom safe areas.",
    covered: true,
  },
  {
    id: "no-horizontal-overflow",
    label: "No horizontal overflow",
    requirement: "Mobile pages and cards fit phone widths without page-level sideways scrolling.",
    covered: true,
  },
  {
    id: "touch-targets",
    label: "Touch targets",
    requirement: "Mobile navigation, cards, and actions maintain reachable 44px targets.",
    covered: true,
  },
  {
    id: "focus-visible",
    label: "Keyboard focus",
    requirement: "Interactive mobile controls expose visible focus states.",
    covered: true,
  },
  {
    id: "reduced-motion",
    label: "Reduced motion",
    requirement: "Motion-sensitive users can avoid hover and animation movement.",
    covered: true,
  },
  {
    id: "offline-state",
    label: "Offline state",
    requirement: "Mobile shell explains when fresh server state cannot be confirmed.",
    covered: true,
  },
  {
    id: "degraded-state",
    label: "Degraded state",
    requirement: "Mobile shell explains partial or guarded state without hiding available routes.",
    covered: true,
  },
  {
    id: "source-owned-actions",
    label: "Source-owned actions",
    requirement: "Hardening does not add direct module business-logic mutations.",
    covered: true,
  },
];

export function buildMobileRuntimeState({
  online,
  degraded = false,
}: {
  online: boolean;
  degraded?: boolean;
}): MobileRuntimeState {
  const kind: PlatformUXStateKind | null = !online
    ? "Offline"
    : degraded
      ? "Degraded"
      : null;

  return {
    online,
    degraded,
    banner: kind ? buildPlatformUXState(kind) : null,
  };
}

export function buildMobileHardeningChecklist() {
  return mobileHardeningChecks;
}
