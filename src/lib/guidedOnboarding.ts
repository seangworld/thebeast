export type GuidedTourStep = {
  id: string;
  title: string;
  description: string;
  target?: string;
  actionLabel?: string;
};

export type GuidedTourDefinition = {
  id: string;
  version: string;
  title: string;
  steps: readonly GuidedTourStep[];
  experience?: "initial" | "whats_new";
  offerMode?: "automatic" | "manual";
  moduleId?: "beastos" | "money" | "learning" | "health" | "home";
  entryPath?: string;
  autoOfferPaths?: readonly string[];
  replayLabel?: string;
};

export type GuidedTourStatus = "offered" | "started" | "completed" | "skipped";

export type GuidedTourProgress = {
  status: GuidedTourStatus;
  version: string;
  step: number;
  updatedAt: string;
};

export const beastGuidedTour: GuidedTourDefinition = {
  id: "beast-first-use",
  version: "1.0.0",
  title: "How to use Beast",
  replayLabel: "How to Use Beast",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "beastos",
  entryPath: "/dashboard",
  steps: [
    {
      id: "welcome",
      title: "Welcome to Beast",
      description:
        "Beast brings your plans, records, and AI professionals together. This quick tour shows you where to begin.",
    },
    {
      id: "dashboard",
      title: "Your dashboard",
      description:
        "Dashboard is your starting point. It brings forward useful updates and the next things that need your attention.",
      target: "[data-beast-main-content]",
    },
    {
      id: "navigation",
      title: "Life modules",
      description:
        "Use the navigation to open BeastMoney, BeastEducation, BeastHealth, and the other parts of Beast available to you.",
      target: "[data-beast-navigation]",
    },
    {
      id: "staff",
      title: "Your Digital Staff",
      description:
        "Digital Staff are AI professionals with different jobs. Ask the professional who owns the kind of help you need.",
      target: "[data-beast-relationships-navigation]",
    },
    {
      id: "context",
      title: "Beast learns with your permission",
      description:
        "Profiles and saved context make answers more useful. You stay in control of what you share and what Beast remembers.",
      target: "[data-beast-account-navigation]",
    },
    {
      id: "finish",
      title: "You are ready",
      description:
        "Start with one module or talk with a Digital Staff professional. You can take this tour again from the navigation at any time.",
    },
  ],
};

export const beastMoneyGuidedTour: GuidedTourDefinition = {
  id: "beastmoney-first-use",
  version: "1.0.0",
  title: "How to use BeastMoney",
  replayLabel: "How to Use BeastMoney",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "money",
  entryPath: "/dashboard/money/dashboard",
  autoOfferPaths: ["/dashboard/money", "/dashboard/money/dashboard"],
  steps: [
    {
      id: "money-welcome",
      title: "Start with your current financial picture",
      description:
        "Your dashboard brings together the financial records you have chosen to save. It does not invent balances, bills, or activity.",
      target: "[data-financial-mission-control]",
    },
    {
      id: "money-bills",
      title: "Keep upcoming bills visible",
      description:
        "Bills shows recurring obligations and due dates. Review the saved record before recording or executing any payment.",
      target: "[data-tour-step=\"money-bills\"]",
    },
    {
      id: "money-planning",
      title: "Use cash flow for planning",
      description:
        "Cash flow, debt, savings, retirement, and other planning views help you understand where money is moving and what needs attention.",
      target: "[data-tour-step=\"money-planning\"]",
    },
    {
      id: "money-coach",
      title: "Ask Money Coach for context",
      description:
        "Money Coach can explain saved numbers and discuss recommendations. You remain responsible for financial decisions and payment authorization.",
      target: "[data-tour-step=\"money-coach\"]",
    },
    {
      id: "money-finish",
      title: "Choose one useful next step",
      description:
        "Start by reviewing the dashboard, one bill, or one planning question. You can replay this tour from How to Use BeastMoney.",
    },
  ],
};

export const beastHealthGuidedTour: GuidedTourDefinition = {
  id: "beasthealth-first-use",
  version: "1.0.0",
  title: "How to use BeastHealth",
  replayLabel: "How to Use BeastHealth",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "health",
  entryPath: "/dashboard/health",
  autoOfferPaths: ["/dashboard/health"],
  steps: [
    {
      id: "health-welcome",
      title: "Build your health story gradually",
      description:
        "BeastHealth organizes only the health information you choose to save. Begin with one useful record or guided question.",
      target: "[data-tour-step=\"health-overview\"]",
    },
    {
      id: "health-records",
      title: "Track confirmed information",
      description:
        "Use the record workspaces for conditions, medications, measurements, appointments, documents, providers, and other information you can confirm.",
      target: "[data-tour-step=\"health-records\"]",
    },
    {
      id: "health-goals",
      title: "Keep goals and progress together",
      description:
        "Health Goals helps you record what you want to work toward and review progress without turning a goal into medical advice.",
      target: "[data-tour-step=\"health-goals\"]",
    },
    {
      id: "health-advisor",
      title: "Prepare with Health Advisor",
      description:
        "Health Advisor can organize saved context and help prepare questions. It never diagnoses, prescribes, or replaces qualified care.",
      target: "[data-tour-step=\"health-advisor\"]",
    },
    {
      id: "health-finish",
      title: "Start with one confirmed fact",
      description:
        "Add or review one item when you are ready. You can replay this tour from How to Use BeastHealth.",
    },
  ],
};

export const beastEducationModuleGuidedTour: GuidedTourDefinition = {
  id: "beasteducation-module-first-use",
  version: "1.0.0",
  title: "How to use BeastEducation",
  replayLabel: "How to Use BeastEducation",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "learning",
  entryPath: "/dashboard/education",
  autoOfferPaths: ["/dashboard/education"],
  steps: [
    {
      id: "education-dashboard",
      title: "See your education plan",
      description:
        "The Education Command Center shows your current direction, progress, and one useful next step in plain language.",
      target: "[data-tour-step=\"education-dashboard\"]",
    },
    {
      id: "education-guidance",
      title: "Plan with your Guidance Counselor",
      description:
        "Ask for help choosing a direction, comparing options, or deciding what to work toward. Ideas stay separate from facts you have confirmed.",
      target: "[data-tour-step=\"education-guidance\"]",
    },
    {
      id: "education-tutor",
      title: "Learn with your AI Tutor",
      description:
        "Riley can explain schoolwork, give hints, review work you already tried, and help you find the first mistake without judging you.",
      target: "[data-tour-step=\"education-tutor\"]",
    },
    {
      id: "education-progress",
      title: "Keep plans and progress visible",
      description:
        "Use goals, education and career planning, documents, and Progress & Decisions to keep your next steps organized.",
      target: "[data-tour-step=\"education-progress\"]",
    },
    {
      id: "education-finish",
      title: "Take one next step",
      description:
        "Open the recommendation that makes sense today. You can replay this tour from How to Use BeastEducation.",
    },
  ],
};

export const beastHomeGuidedTour: GuidedTourDefinition = {
  id: "beasthome-first-use",
  version: "1.0.0",
  title: "How to use BeastHome",
  replayLabel: "How to Use BeastHome",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "home",
  entryPath: "/dashboard/home",
  autoOfferPaths: ["/dashboard/home"],
  steps: [
    {
      id: "home-welcome",
      title: "Start with one room",
      description:
        "BeastHome currently provides a private home inventory. Start small and save only records you have reviewed.",
      target: "[data-tour-step=\"home-overview\"]",
    },
    {
      id: "home-photo",
      title: "Use a room photo for suggestions",
      description:
        "Photo-to-Home-Inventory can suggest visible possessions from a room photo. The workflow does not save the photo or suggestions until you review and confirm them.",
      target: "[data-tour-step=\"home-inventory\"]",
    },
    {
      id: "home-review",
      title: "Review every item",
      description:
        "Correct names and quantities, remove mistakes, and add a value only when you can support it. Your confirmed inventory stays private to your account.",
      target: "[data-tour-step=\"home-inventory\"]",
    },
    {
      id: "home-documents",
      title: "Link a receipt when useful",
      description:
        "During inventory review, you can optionally link one of your private Beast Documents as a receipt. Household sharing and home automation are not active.",
      target: "[data-tour-step=\"home-inventory\"]",
    },
    {
      id: "home-finish",
      title: "Build a useful record over time",
      description:
        "Complete one room before starting another. You can replay this tour from How to Use BeastHome.",
    },
  ],
};

export const beastEducationGuidedTour: GuidedTourDefinition = {
  id: "beasteducation-first-use",
  version: "1.0.0",
  title: "How to use BeastEducation",
  replayLabel: "How to Use Guidance Counselor",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "learning",
  entryPath: "/dashboard/education/guidance-counselor",
  autoOfferPaths: ["/dashboard/education/guidance-counselor"],
  steps: [
    {
      id: "education-welcome",
      title: "Welcome to BeastEducation",
      description:
        "Your Guidance Counselor helps with school and career direction. This tour shows what your counselor knows and still needs from you.",
    },
    {
      id: "guidance",
      title: "Guidance Counselor",
      description:
        "Talk here when you want help choosing a direction, making a plan, or deciding what to work toward.",
      target: "[data-education-workspace=\"guidance-counselor\"]",
    },
    {
      id: "known",
      title: "What I Know",
      description: "This is stuff you have already told me.",
      target: "[data-guidance-understanding-model] [data-knowledge-kind=\"known\"]",
    },
    {
      id: "planning",
      title: "What I Think",
      description: "These are ideas your counselor is still checking with you, not confirmed facts.",
      target: "[data-guidance-understanding-model] [data-knowledge-kind=\"thinking\"]",
    },
    {
      id: "needed",
      title: "What I Still Need",
      description:
        "These are questions I still need you to answer so I can help you better. Tap Answer This. Once I have enough information, it moves out of this section.",
      target: "[data-guidance-understanding-model] [data-knowledge-kind=\"needed\"]",
    },
    {
      id: "education-finish",
      title: "That’s it",
      description:
        "You can ask for help whenever you need it. Use Take the Tour Again if you want to see these steps later.",
    },
  ],
};

export const beastEducationTutorGuidedTour: GuidedTourDefinition = {
  id: "beasteducation-tutor-first-use",
  version: "1.0.0",
  title: "How to use your AI Tutor",
  replayLabel: "How to Use AI Tutor",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "learning",
  entryPath: "/dashboard/education/tutor",
  autoOfferPaths: ["/dashboard/education/tutor"],
  steps: [
    {
      id: "tutor-welcome",
      title: "Meet Riley, your AI Tutor",
      description:
        "Riley helps you understand schoolwork. Your Guidance Counselor helps with bigger school and career plans.",
      target: "[data-tour-step=\"tutor-welcome\"]",
    },
    {
      id: "tutor-conversation",
      title: "Learn by working together",
      description:
        "Ask a question and Riley will explain, give a hint, or ask you a small question to check your understanding.",
      target: "[data-tour-step=\"tutor-conversation\"]",
    },
    {
      id: "tutor-homework",
      title: "Need help with homework?",
      description:
        "Type your question or take a clear picture here. Riley can explain it, review work you already tried, and help you fix the first mistake.",
      target: "[data-tour-step=\"tutor-upload\"]",
    },
    {
      id: "tutor-finish",
      title: "You’re ready",
      description:
        "Start with what you understand so far. Riley will help with the next step instead of judging you for being stuck.",
    },
  ],
};

export const beastHomeInventoryGuidedTour: GuidedTourDefinition = {
  id: "beasthome-inventory-first-use",
  version: "1.0.0",
  title: "How to use Home Inventory",
  replayLabel: "How to Use Home Inventory",
  experience: "initial",
  offerMode: "automatic",
  moduleId: "home",
  entryPath: "/dashboard/home/inventory",
  autoOfferPaths: ["/dashboard/home/inventory"],
  steps: [
    {
      id: "home-inventory-welcome",
      title: "Build a private home inventory",
      description:
        "Start with one room. BeastHome suggests visible possessions from a photo, but nothing is saved until you review and confirm it.",
      target: "[data-tour-step=\"home-inventory-photo\"]",
    },
    {
      id: "home-inventory-review",
      title: "You stay in control",
      description:
        "Check every suggestion, fix names and quantities, remove mistakes, and optionally add a value or one of your private Beast Documents as a receipt.",
      target: "[data-tour-step=\"home-inventory-review\"]",
    },
    {
      id: "home-inventory-export",
      title: "Keep a dated copy",
      description:
        "Your confirmed inventory stays in your private account. Download a dated CSV whenever you want an offline record.",
      target: "[data-tour-step=\"home-inventory-export\"]",
    },
  ],
};

export function guidedTourStorageKey(memberId: string, tourId: string) {
  return `beast:guided-tour:${memberId}:${tourId}`;
}

export function shouldOfferGuidedTour(
  progress: GuidedTourProgress | null,
  definition: GuidedTourDefinition
) {
  if (definition.offerMode === "manual") return false;
  if (!progress || progress.version !== definition.version) return true;
  return progress.status !== "completed" && progress.status !== "skipped";
}

export function isGuidedTourAutoOfferPath(
  pathname: string,
  definition: GuidedTourDefinition
) {
  return !definition.autoOfferPaths || definition.autoOfferPaths.includes(pathname);
}

export function createWhatsNewGuidedTour(
  definition: Omit<GuidedTourDefinition, "experience" | "offerMode"> & {
    offerMode?: "automatic" | "manual";
  }
): GuidedTourDefinition {
  return {
    ...definition,
    experience: "whats_new",
    offerMode: definition.offerMode || "manual",
  };
}

// Material releases add a definition here. Keeping the registry empty means
// no current release triggers an unnecessary What's New interruption.
export const activeWhatsNewGuidedTours: readonly GuidedTourDefinition[] = [];

export function guidedTourAnalyticsAction(tourId: string) {
  return tourId.replace(/-/g, "_");
}

export function resolveGuidedTourForPath(
  pathname: string,
  eligibleModules?: readonly string[]
): GuidedTourDefinition | null {
  let definition: GuidedTourDefinition = beastGuidedTour;

  if (pathname.startsWith("/dashboard/money")) definition = beastMoneyGuidedTour;
  else if (pathname === "/dashboard/education/guidance-counselor") {
    definition = beastEducationGuidedTour;
  } else if (pathname === "/dashboard/education/tutor") {
    definition = beastEducationTutorGuidedTour;
  } else if (pathname.startsWith("/dashboard/education") || pathname.startsWith("/dashboard/learning")) {
    definition = beastEducationModuleGuidedTour;
  } else if (pathname.startsWith("/dashboard/health")) definition = beastHealthGuidedTour;
  else if (pathname === "/dashboard/home/inventory") definition = beastHomeInventoryGuidedTour;
  else if (pathname.startsWith("/dashboard/home")) definition = beastHomeGuidedTour;

  if (
    definition.moduleId &&
    eligibleModules &&
    !eligibleModules.includes(definition.moduleId)
  ) {
    return null;
  }
  return definition;
}

export function resolveGuidedToursForPath(
  pathname: string,
  eligibleModules?: readonly string[],
  whatsNewTours: readonly GuidedTourDefinition[] = activeWhatsNewGuidedTours
) {
  const initial = resolveGuidedTourForPath(pathname, eligibleModules);
  const targeted = whatsNewTours.filter((definition) => {
    if (definition.experience !== "whats_new") return false;
    if (
      definition.moduleId &&
      eligibleModules &&
      !eligibleModules.includes(definition.moduleId)
    ) {
      return false;
    }
    if (definition.autoOfferPaths?.includes(pathname)) return true;
    return Boolean(
      definition.entryPath &&
      (pathname === definition.entryPath || pathname.startsWith(`${definition.entryPath}/`))
    );
  });

  return initial ? [initial, ...targeted] : targeted;
}
