import type { BeastHealthPlaceholder } from "./BeastHealthShell";

export const beastHealthOverview: BeastHealthPlaceholder = {
  title: "BeastHealth",
  description: "Admin-only foundation for the future BeastHealth workspace.",
  focus: [
    "Reserve the BeastHealth application shell.",
    "Keep health scope protected until safety and privacy policy are approved.",
    "Confirm future health data belongs behind BeastOS permissions.",
  ],
};

export const beastHealthPages: Record<string, BeastHealthPlaceholder> = {
  profile: {
    title: "Health Profile",
    description: "Placeholder for future member-controlled health profile context.",
    focus: [
      "Future demographic and wellness context.",
      "Future provider and preference summaries.",
      "No separate long-term profile outside BeastOS.",
    ],
  },
  conditions: {
    title: "Conditions",
    description: "Placeholder for future condition tracking.",
    focus: [
      "Future condition list and status tracking.",
      "Future notes and care-team references.",
      "No diagnosis or clinical guidance in this foundation.",
    ],
  },
  medications: {
    title: "Medications",
    description: "Placeholder for future medication records.",
    focus: [
      "Future medication name, dose, schedule, and status records.",
      "Future refill and safety review boundaries.",
      "No medication advice or interaction checking in this package.",
    ],
  },
  procedures: {
    title: "Procedures",
    description: "Placeholder for future procedure and care history.",
    focus: [
      "Future procedure dates and provider references.",
      "Future recovery notes and document links.",
      "No clinical interpretation in this foundation.",
    ],
  },
  familyHistory: {
    title: "Family History",
    description: "Placeholder for future family health history.",
    focus: [
      "Future family-history records with BeastOS relationship boundaries.",
      "Future sensitivity and sharing controls.",
      "No risk prediction or medical advice in this package.",
    ],
  },
  lifestyle: {
    title: "Lifestyle",
    description: "Placeholder for future lifestyle and wellness context.",
    focus: [
      "Future sleep, movement, nutrition, and habit context.",
      "Future user-controlled wellness preferences.",
      "No coaching claims until policy is approved.",
    ],
  },
  vitals: {
    title: "Vitals",
    description: "Placeholder for future vitals tracking.",
    focus: [
      "Future measurements such as blood pressure, weight, and heart rate.",
      "Future trends and reminders after safety review.",
      "No interpretation or emergency guidance in this foundation.",
    ],
  },
  documents: {
    title: "Documents",
    description: "Placeholder for future health document references.",
    focus: [
      "Future references to BeastOS-owned documents.",
      "Future records, labs, forms, and provider files through permissioned access.",
      "No OCR or AI extraction in this package.",
    ],
  },
  aiAdvisor: {
    title: "AI Advisor",
    description: "Placeholder for future health AI boundaries.",
    focus: [
      "Future AI behavior requires explicit health safety policy.",
      "Future source authority and clinical boundaries must be approved first.",
      "No health AI advice is active in this foundation.",
    ],
  },
};
