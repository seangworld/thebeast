import type { BeastHomePlaceholder } from "./BeastHomeShell";

export const beastHomeOverview: BeastHomePlaceholder = {
  title: "BeastHome",
  description: "Private home records and a reviewed photo-to-inventory workflow.",
  focus: [
    "Create a dated room-by-room inventory from reviewed photo suggestions.",
    "Organize receipts and reference documents alongside your inventory.",
    "Review suggested items before saving them to your private account.",
  ],
};

export const beastHomePages: Record<string, BeastHomePlaceholder> = {
  property: {
    title: "Home",
    description: "Planned workspace for property and household asset context.",
    focus: [
      "Future property profiles and household records.",
      "Future rooms, systems, and home inventory.",
      "Property records are not available here yet.",
    ],
  },
  vehicles: {
    title: "Vehicles",
    description: "Planned workspace for vehicle records.",
    focus: [
      "Future vehicle profiles, registration, insurance, and service context.",
      "Future reminders and document links.",
      "Vehicle tracking is not available yet.",
    ],
  },
  maintenance: {
    title: "Maintenance",
    description: "Planned workspace for maintenance planning.",
    focus: [
      "Future maintenance tasks, schedules, and service history.",
      "Future reminders and vendor references.",
      "Maintenance scheduling is not available yet.",
    ],
  },
  security: {
    title: "Security",
    description: "Planned workspace for home security context.",
    focus: [
      "Future security inventory and safety checklist context.",
      "Future household safety checklists.",
      "This page does not monitor your home.",
    ],
  },
  documents: {
    title: "Documents",
    description: "Planned workspace for home document references.",
    focus: [
      "Future references to BeastOS-owned documents.",
      "Future mortgage, lease, warranty, insurance, vehicle, and maintenance files.",
      "No OCR or AI extraction in this package.",
    ],
  },
  settings: {
    title: "Settings",
    description: "Planned workspace for BeastHome settings.",
    focus: [
      "Future household visibility preferences.",
      "Future notification and reminder preferences.",
      "Additional home preferences are planned.",
    ],
  },
};
