import { builtLearningCourses } from "./courses";
import { learningFlashcards } from "./flashcards";
import { learningLessons } from "./lessons";
import { learningLibraryMaterials } from "./library";
import { learnerNotes } from "./notes";
import { mockLearningKnowledgeModel } from "./knowledgeGraph";
import { learningStudyGuides } from "./studyGuides";
import type { LearningSearchFilters, LearningSearchItem } from "./types";

export function buildLearningSearchIndex(): LearningSearchItem[] {
  return [
    ...builtLearningCourses.map((course) => ({
      id: course.id,
      type: "course" as const,
      title: course.title,
      subject: course.subject,
      tags: course.milestones,
      summary: course.estimatedDuration,
    })),
    ...learningLessons.map((lesson) => ({
      id: lesson.id,
      type: "lesson" as const,
      title: lesson.title,
      subject: lesson.subject,
      tags: lesson.tags,
      summary: lesson.estimatedCompletionTime,
    })),
    ...learningLibraryMaterials.map((material) => ({
      id: material.id,
      type: "library" as const,
      title: material.title,
      subject: material.subject,
      tags: material.tags,
      difficulty: material.difficulty,
      summary: material.description,
    })),
    ...learningFlashcards.map((card) => ({
      id: card.id,
      type: "flashcard" as const,
      title: card.front,
      subject: card.category,
      tags: card.tags,
      difficulty: card.difficulty,
      summary: card.reviewSchedulePlaceholder,
    })),
    ...learnerNotes.map((note) => ({
      id: note.id,
      type: "note" as const,
      title: note.title,
      subject: note.subject,
      tags: note.tags,
      summary: note.richTextPlaceholder,
    })),
    ...learningStudyGuides.map((guide) => ({
      id: guide.id,
      type: "study guide" as const,
      title: guide.title,
      subject: guide.subject,
      tags: guide.tags,
      summary: guide.overview,
    })),
    ...mockLearningKnowledgeModel.resources.map((resource) => ({
      id: resource.id,
      type: "resource" as const,
      title: resource.title,
      subject: resource.conceptId,
      tags: [resource.type, resource.level],
      summary: resource.urlPlaceholder,
    })),
  ];
}

export function searchLearningContent(filters: LearningSearchFilters) {
  const query = filters.query?.toLowerCase().trim();
  const subject = filters.subject?.toLowerCase().trim();
  const tag = filters.tag?.toLowerCase().trim();

  return buildLearningSearchIndex().filter((item) => {
    const matchesQuery = !query
      ? true
      : [item.title, item.subject, item.summary, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(query);
    const matchesSubject = !subject || item.subject.toLowerCase() === subject;
    const matchesTag = !tag || item.tags.some((itemTag) => itemTag.toLowerCase().includes(tag));
    const matchesDifficulty = !filters.difficulty || item.difficulty === filters.difficulty;

    return matchesQuery && matchesSubject && matchesTag && matchesDifficulty;
  });
}
