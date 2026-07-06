import type { LearningUploadItem } from "./types";

export const mockLearningUploads: LearningUploadItem[] = [
  {
    id: "security-textbook",
    title: "Security+ textbook chapter",
    category: "textbook",
    status: "ready",
    detail: "Study material ready to organize into lessons and review.",
  },
  {
    id: "networking-pdf",
    title: "Networking reference PDF",
    category: "PDF",
    status: "processing",
    detail: "Notes ready to connect with summaries and practice.",
  },
  {
    id: "course-syllabus",
    title: "Course syllabus",
    category: "syllabus",
    status: "needs review",
    detail: "Syllabus dates can guide study milestones and reminders.",
  },
  {
    id: "study-notes",
    title: "Study notes",
    category: "notes",
    status: "queued",
    detail: "Queued sample state only.",
  },
  {
    id: "lecture-slides",
    title: "Lecture slides",
    category: "slides",
    status: "ready",
    detail: "Slides ready for lesson review.",
  },
  {
    id: "math-worksheet",
    title: "Math worksheet",
    category: "worksheet",
    status: "failed",
    detail: "Upload needs attention before Beast can use it.",
  },
  {
    id: "practice-exam",
    title: "Practice exam",
    category: "practice exam",
    status: "queued",
    detail: "Assessment material ready for review planning.",
  },
];
