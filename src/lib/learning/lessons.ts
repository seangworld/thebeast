import { builtLearningCourses } from "./courses";
import type { LearningLessonModel } from "./types";

export const learningLessons: LearningLessonModel[] = builtLearningCourses.flatMap((course) =>
  course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      id: lesson.id,
      courseId: course.id,
      title: lesson.title,
      lessonType: lesson.topics[0]?.activities[0]?.type || "reading",
      subject: course.subject,
      estimatedCompletionTime: `${lesson.estimatedMinutes} min`,
      tags: [course.subject.toLowerCase(), module.title.toLowerCase()],
      completionStatus: lesson.completed ? "Completed" : "In progress",
    }))
  )
);

export function getContinueStudyingLessons(limit = 3) {
  return learningLessons
    .filter((lesson) => lesson.completionStatus !== "Completed")
    .slice(0, limit);
}
