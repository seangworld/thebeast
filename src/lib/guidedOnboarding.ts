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

export const beastEducationGuidedTour: GuidedTourDefinition = {
  id: "beasteducation-first-use",
  version: "1.0.0",
  title: "How to use BeastEducation",
  steps: [
    {
      id: "education-welcome",
      title: "Welcome to BeastEducation",
      description:
        "Your Guidance Counselor helps with school and career direction. Your Tutor helps you understand schoolwork.",
    },
    {
      id: "guidance",
      title: "Guidance Counselor",
      description:
        "Talk here when you want help choosing a direction, making a plan, or deciding what to work toward.",
      target: "[data-education-guidance]",
    },
    {
      id: "known",
      title: "What I Know",
      description: "This is stuff you have already told me.",
      target: "[data-education-known]",
    },
    {
      id: "planning",
      title: "What I’m Planning",
      description: "These are things we are working toward.",
      target: "[data-education-planning]",
    },
    {
      id: "needed",
      title: "What I Still Need",
      description:
        "These are questions I still need you to answer so I can help you better. Tap Answer This. Once I have enough information, it moves out of this section.",
      target: "[data-education-still-needed]",
    },
    {
      id: "homework",
      title: "Homework Helper and Tutor",
      description:
        "Need help with homework? Take a picture or upload it here. Your Tutor can explain it and work through it with you.",
      target: "[data-education-tutor-entry]",
    },
    {
      id: "education-finish",
      title: "That’s it",
      description:
        "You can ask for help whenever you need it. Use Take the Tour Again if you want to see these steps later.",
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
  return !progress || progress.version !== definition.version;
}
