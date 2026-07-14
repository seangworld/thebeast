import type { BeastHomePlaceholder } from "./BeastHomeShell";

export const beastHomeOverview: BeastHomePlaceholder = {
  title: "BeastHome",
  description: "Admin-only foundation for the future BeastHome workspace.",
  focus: [
    "Reserve the BeastHome application shell.",
    "Keep home, vehicle, maintenance, security, and document scope protected until policy is approved.",
    "Confirm future home data belongs behind BeastOS permissions.",
  ],
};

export const beastHomePages: Record<string, BeastHomePlaceholder> = {
  property: {
    title: "Home",
    description: "Placeholder for future property and household asset context.",
    focus: [
      "Future property profiles and household records.",
      "Future rooms, systems, and home inventory.",
      "No separate long-term profile outside BeastOS.",
    ],
  },
  vehicles: {
    title: "Vehicles",
    description: "Placeholder for future vehicle records.",
    focus: [
      "Future vehicle profiles, registration, insurance, and service context.",
      "Future reminders and document links.",
      "No vehicle workflow or automation in this foundation.",
    ],
  },
  maintenance: {
    title: "Maintenance",
    description: "Placeholder for future maintenance planning.",
    focus: [
      "Future maintenance tasks, schedules, and service history.",
      "Future reminders and vendor references.",
      "No scheduling automation in this package.",
    ],
  },
  security: {
    title: "Security",
    description: "Placeholder for future home security context.",
    focus: [
      "Future security inventory and safety checklist context.",
      "Future household-aware visibility boundaries.",
      "No security automation or monitoring in this foundation.",
    ],
  },
  documents: {
    title: "Documents",
    description: "Placeholder for future home document references.",
    focus: [
      "Future references to BeastOS-owned documents.",
      "Future mortgage, lease, warranty, insurance, vehicle, and maintenance files.",
      "No OCR or AI extraction in this package.",
    ],
  },
  settings: {
    title: "Settings",
    description: "Placeholder for future BeastHome settings.",
    focus: [
      "Future household visibility preferences.",
      "Future notification and reminder preferences.",
      "Future module settings only after product scope is approved.",
    ],
  },
};
