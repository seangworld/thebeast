export type PlatformModule =
  | "beastos"
  | "money"
  | "learning"
  | "health"
  | "home"
  | "projects"
  | "vehicles"
  | "family"
  | "goals"
  | "documents"
  | "calendar"
  | "notifications"
  | "timeline"
  | "search"
  | "admin";

export type RecommendationPriority = "Critical" | "High" | "Medium" | "Low";
export type PlatformSeverity = "critical" | "warning" | "info";
export type ModuleHealth = "strong" | "stable" | "watch" | "critical" | "pending";
export type ModuleStatus = "live" | "ready" | "coming_soon";

export type PlatformRecommendation = {
  id: string;
  module: PlatformModule;
  priority: RecommendationPriority;
  severity: PlatformSeverity;
  title: string;
  summary: string;
  reason: string;
  recommendedAction: string;
  estimatedBenefit?: string;
  confidence: "reserved";
  dismissible: boolean;
  completed: boolean;
  actionUrl?: string;
};

export type PlatformNotification = {
  id: string;
  title: string;
  module: PlatformModule;
  severity: PlatformSeverity;
  timestamp: string;
  actionUrl?: string;
  summary?: string;
};

export type ModuleSummary = {
  module: PlatformModule;
  label: string;
  status: ModuleStatus;
  health: ModuleHealth;
  alerts: number;
  recommendations: number;
  activityCount: number;
  summary: string;
  href?: string;
};

export type PlatformActivity = {
  id: string;
  module: PlatformModule;
  title: string;
  summary: string;
  timestamp: string;
  actionUrl?: string;
};

export type PlatformTimelineEvent = {
  id: string;
  module: PlatformModule;
  title: string;
  summary: string;
  timestamp: string;
  actionUrl?: string;
};

export type PlatformIntelligence = {
  recommendations: PlatformRecommendation[];
  notifications: PlatformNotification[];
  moduleSummaries: ModuleSummary[];
  activities: PlatformActivity[];
  timelineEvents: PlatformTimelineEvent[];
};
