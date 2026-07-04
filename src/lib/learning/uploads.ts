import type { LearningUploadItem } from "./types";

export const mockLearningUploads: LearningUploadItem[] = [
  {
    id: "security-textbook",
    title: "Security+ textbook chapter",
    category: "textbook",
    status: "ready",
    detail: "Static sample material for future learning ingestion.",
  },
  {
    id: "networking-pdf",
    title: "Networking reference PDF",
    category: "PDF",
    status: "processing",
    detail: "Future parsing and summarization are not active yet.",
  },
  {
    id: "course-syllabus",
    title: "Course syllabus",
    category: "syllabus",
    status: "needs review",
    detail: "Future module can map deadlines from a syllabus.",
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
    detail: "Slides category placeholder.",
  },
  {
    id: "math-worksheet",
    title: "Math worksheet",
    category: "worksheet",
    status: "failed",
    detail: "Failure state placeholder for future retry flows.",
  },
  {
    id: "practice-exam",
    title: "Practice exam",
    category: "practice exam",
    status: "queued",
    detail: "Assessment upload category placeholder.",
  },
];
