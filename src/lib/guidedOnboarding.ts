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
  return !progress || progress.version !== definition.version;
}
