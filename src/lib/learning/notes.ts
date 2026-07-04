import type { LearnerNote } from "./types";

export const learnerNotes: LearnerNote[] = [
  {
    id: "note-rbac-work-example",
    title: "RBAC workplace example",
    subject: "Cybersecurity",
    richTextPlaceholder: "Draft note body reserved for future rich text editing.",
    tags: ["Security+", "RBAC", "example"],
    attachmentPlaceholders: ["future-attachment://rbac-diagram"],
    favorite: true,
    pinned: true,
    linkedTopicIds: ["access-control", "rbac-topic"],
  },
  {
    id: "note-quadratic-mistakes",
    title: "Quadratic mistakes to avoid",
    subject: "Math",
    richTextPlaceholder: "Remember to check signs before factoring.",
    tags: ["algebra", "quadratics"],
    attachmentPlaceholders: [],
    favorite: false,
    pinned: false,
    linkedTopicIds: ["quadratic-equations"],
  },
];

export function getPinnedLearnerNotes() {
  return learnerNotes.filter((note) => note.pinned);
}
