import type { LearningBookmark } from "./types";

export const learningBookmarks: LearningBookmark[] = [
  {
    id: "bookmark-security-course",
    targetType: "course",
    targetId: "security-plus-foundations-course",
    title: "Security+ Foundations",
    subject: "Cybersecurity",
    favorite: true,
    tags: ["Security+", "course"],
  },
  {
    id: "bookmark-access-guide",
    targetType: "study guide",
    targetId: "security-access-guide",
    title: "Access Control Study Guide",
    subject: "Cybersecurity",
    favorite: true,
    tags: ["Security+", "guide"],
  },
  {
    id: "bookmark-rbac-note",
    targetType: "note",
    targetId: "note-rbac-work-example",
    title: "RBAC workplace example",
    subject: "Cybersecurity",
    favorite: false,
    tags: ["RBAC", "note"],
  },
];

export function getFavoriteBookmarks() {
  return learningBookmarks.filter((bookmark) => bookmark.favorite);
}
