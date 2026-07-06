import type { ResourceCollection } from "./types";

export const learningResourceCollections: ResourceCollection[] = [
  {
    id: "security-plus-collection",
    title: "Security+",
    subject: "Cybersecurity",
    description: "Certification prep materials, notes, guides, and practice assets.",
    resourceIds: ["security-article", "access-practice-test"],
    materialIds: ["security-objectives", "security-practice-exam-material"],
    courseIds: ["security-plus-foundations-course"],
    noteIds: ["note-rbac-work-example"],
    studyGuideIds: ["security-access-guide"],
    tags: ["Security+", "certification"],
  },
  {
    id: "college-algebra-collection",
    title: "College Algebra",
    subject: "Math",
    description: "Algebra refresh content for equations, quadratics, and functions.",
    resourceIds: ["linear-video", "quadratic-exercises"],
    materialIds: ["college-algebra-notes"],
    courseIds: ["college-algebra-course"],
    noteIds: ["note-quadratic-mistakes"],
    studyGuideIds: [],
    tags: ["math", "algebra"],
  },
  {
    id: "spanish-one-collection",
    title: "Spanish I",
    subject: "Languages",
    description: "Starter materials for vocabulary, listening, and daily practice.",
    resourceIds: [],
    materialIds: ["spanish-audio-drills"],
    courseIds: [],
    noteIds: [],
    studyGuideIds: [],
    tags: ["spanish", "language"],
  },
  {
    id: "financial-literacy-collection",
    title: "Financial Literacy",
    subject: "Finance",
    description: "Collection for personal finance learning paths.",
    resourceIds: [],
    materialIds: [],
    courseIds: [],
    noteIds: [],
    studyGuideIds: [],
    tags: ["finance", "literacy"],
  },
  {
    id: "woodworking-collection",
    title: "Woodworking",
    subject: "Trades",
    description: "Safety and project materials for hands-on shop learning.",
    resourceIds: [],
    materialIds: ["woodworking-lab"],
    courseIds: [],
    noteIds: [],
    studyGuideIds: [],
    tags: ["woodworking", "trade"],
  },
];

export function getCollectionResourceCount(collection: ResourceCollection) {
  return (
    collection.resourceIds.length +
    collection.materialIds.length +
    collection.courseIds.length +
    collection.noteIds.length +
    collection.studyGuideIds.length
  );
}
