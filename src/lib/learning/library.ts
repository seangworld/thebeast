import type { LearningLibraryMaterial } from "./types";

export const learningLibraryMaterials: LearningLibraryMaterial[] = [
  {
    id: "security-objectives",
    title: "Security+ Objective Map",
    type: "PDF",
    subject: "Cybersecurity",
    topicIds: ["security-plus", "authentication", "access-control"],
    description: "Static objective outline for certification study planning.",
    author: "CompTIA-style reference",
    source: "Uploaded reference",
    difficulty: "Intermediate",
    estimatedStudyTime: "45 min",
    tags: ["Security+", "certification", "objectives"],
    uploadStatus: "Ready",
    completionStatus: "In progress",
    favorite: true,
    archived: false,
  },
  {
    id: "college-algebra-notes",
    title: "College Algebra Notes",
    type: "Notes",
    subject: "Math",
    topicIds: ["algebra", "linear-equations", "quadratic-equations"],
    description: "Learner notes for algebra patterns and common mistakes.",
    author: "Current learner",
    source: "Manual note",
    difficulty: "Beginner",
    estimatedStudyTime: "30 min",
    tags: ["algebra", "math", "review"],
    uploadStatus: "Ready",
    completionStatus: "In progress",
    favorite: false,
    archived: false,
  },
  {
    id: "spanish-audio-drills",
    title: "Spanish I Listening Drills",
    type: "Audio",
    subject: "Languages",
    topicIds: ["spanish"],
    description: "Short listening drills for daily vocabulary practice.",
    author: "BeastLearning sample",
    source: "External resource",
    difficulty: "Beginner",
    estimatedStudyTime: "20 min",
    tags: ["spanish", "listening", "vocabulary"],
    uploadStatus: "Not uploaded",
    completionStatus: "Not started",
    favorite: true,
    archived: false,
  },
  {
    id: "woodworking-lab",
    title: "Woodworking Safety Lab",
    type: "Lab",
    subject: "Trades",
    topicIds: ["woodworking"],
    description: "Shop safety checklist and practice lab structure.",
    author: "BeastLearning sample",
    source: "Practice lab",
    difficulty: "Beginner",
    estimatedStudyTime: "60 min",
    tags: ["woodworking", "safety", "lab"],
    uploadStatus: "Ready",
    completionStatus: "Not started",
    favorite: false,
    archived: false,
  },
  {
    id: "security-practice-exam-material",
    title: "Security+ Practice Exam Set",
    type: "Practice Exam",
    subject: "Cybersecurity",
    topicIds: ["security-plus"],
    description: "Practice exam container reserved for deterministic exam flows.",
    author: "BeastLearning sample",
    source: "Practice exam",
    difficulty: "Intermediate",
    estimatedStudyTime: "90 min",
    tags: ["Security+", "exam", "review"],
    uploadStatus: "Ready",
    completionStatus: "Not started",
    favorite: false,
    archived: false,
  },
];

export function getRecentLearningMaterials(limit = 3) {
  return learningLibraryMaterials
    .filter((material) => !material.archived)
    .slice(0, limit);
}

export function getFavoriteLearningMaterials() {
  return learningLibraryMaterials.filter((material) => material.favorite);
}
