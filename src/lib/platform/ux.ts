export type PlatformUXServiceId =
  | "today"
  | "calendar"
  | "timeline"
  | "notifications"
  | "search"
  | "settings"
  | "uploads"
  | "goals";

export type PlatformUXStateKind =
  | "Loading"
  | "Empty"
  | "Error"
  | "Offline"
  | "Degraded";

export type PlatformUXRoute = {
  id: PlatformUXServiceId;
  label: string;
  href: string;
  mobileReady: boolean;
  keyboardReady: boolean;
  emptyStateReady: boolean;
};

export type PlatformUXReadiness = {
  totalServices: number;
  mobileReadyServices: number;
  keyboardReadyServices: number;
  emptyStateReadyServices: number;
  responsive: boolean;
  accessible: boolean;
};

export type PlatformUXState = {
  kind: PlatformUXStateKind;
  title: string;
  message: string;
  recoveryAction: string;
};

export type PlatformSupportLink = {
  id: "onboarding" | "help" | "feedback" | "release-notes";
  label: string;
  href: string;
  purpose: string;
};

export const platformUXRules = [
  "BeastOS owns shared platform UX patterns for core services.",
  "Core service pages must stay responsive across mobile and desktop layouts.",
  "Loading empty error offline and degraded states must explain what happened and what the user can do next.",
  "Onboarding help feedback and release notes must be discoverable without duplicating module-specific support flows.",
];

export const platformUXCoreRoutes: PlatformUXRoute[] = [
  {
    id: "today",
    label: "Today",
    href: "/dashboard/today",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/dashboard/calendar",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "timeline",
    label: "Timeline",
    href: "/dashboard/timeline",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/dashboard/notifications",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "search",
    label: "Search",
    href: "/dashboard/search",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "uploads",
    label: "Uploads",
    href: "/dashboard/uploads",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
  {
    id: "goals",
    label: "Goals",
    href: "/dashboard/goals",
    mobileReady: true,
    keyboardReady: true,
    emptyStateReady: true,
  },
];

export const platformUXSupportLinks: PlatformSupportLink[] = [
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/dashboard/onboarding",
    purpose: "Start or repair the first-run learning setup.",
  },
  {
    id: "help",
    label: "Help",
    href: "/dashboard/settings",
    purpose: "Find shared platform controls and service boundaries.",
  },
  {
    id: "feedback",
    label: "Feedback",
    href: "/dashboard/learning#feedback",
    purpose: "Send product feedback through the implemented beta feedback path.",
  },
  {
    id: "release-notes",
    label: "Release Notes",
    href: "/dashboard/releases",
    purpose: "Review recent BeastOS and module release history.",
  },
];

export function buildPlatformUXReadiness(
  routes: PlatformUXRoute[] = platformUXCoreRoutes
): PlatformUXReadiness {
  return {
    totalServices: routes.length,
    mobileReadyServices: routes.filter((route) => route.mobileReady).length,
    keyboardReadyServices: routes.filter((route) => route.keyboardReady).length,
    emptyStateReadyServices: routes.filter((route) => route.emptyStateReady).length,
    responsive: routes.every((route) => route.mobileReady),
    accessible: routes.every((route) => route.keyboardReady),
  };
}

export function buildPlatformUXState(kind: PlatformUXStateKind): PlatformUXState {
  const states: Record<PlatformUXStateKind, PlatformUXState> = {
    Loading: {
      kind,
      title: "Loading service context",
      message: "BeastOS is gathering the latest platform data before showing this service.",
      recoveryAction: "Wait a moment; controls stay disabled until loading completes.",
    },
    Empty: {
      kind,
      title: "Nothing to show yet",
      message: "This service will stay quiet until real user or module data exists.",
      recoveryAction: "Add context through the owning module or return when new activity exists.",
    },
    Error: {
      kind,
      title: "Service could not load",
      message: "BeastOS could not retrieve this service state safely.",
      recoveryAction: "Refresh, try again, or report the issue with the active route.",
    },
    Offline: {
      kind,
      title: "Connection unavailable",
      message: "The app cannot confirm the latest server state right now.",
      recoveryAction: "Reconnect before making decisions that depend on fresh data.",
    },
    Degraded: {
      kind,
      title: "Limited service mode",
      message: "Some source modules may be unavailable, so BeastOS is showing partial context.",
      recoveryAction: "Use visible data cautiously and retry the unavailable source later.",
    },
  };

  return states[kind];
}

export function getPlatformSupportLinks() {
  return platformUXSupportLinks;
}
