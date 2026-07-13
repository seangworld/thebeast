import { builtLearningCourses, calculateBuiltCourseProgress } from "./courses";
import type {
  LearningBuiltCourse,
  LearningGoal,
  LearningJourney,
  LearningJourneyStep,
} from "./types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function goalMatchesCourse(goal: LearningGoal, course: LearningBuiltCourse) {
  const goalText = normalize(`${goal.id} ${goal.title} ${goal.category} ${goal.target}`);
  const courseText = normalize(`${course.id} ${course.title} ${course.subject}`);

  return (
    goalText.includes(courseText) ||
    courseText.includes(normalize(goal.title)) ||
    goalText.split(" ").some((part) => part.length > 3 && courseText.includes(part))
  );
}

function stepStatus({
  completed,
  current,
  previousComplete,
  reviewDue,
  remediationRequired,
}: {
  completed: boolean;
  current: boolean;
  previousComplete: boolean;
  reviewDue?: boolean;
  remediationRequired?: boolean;
}): LearningJourneyStep["status"] {
  if (remediationRequired) return "remediation_required";
  if (reviewDue) return "review_due";
  if (completed) return "completed";
  if (current) return "current";
  if (previousComplete) return "available";
  return "locked_by_prerequisite";
}

function minutesLabel(minutes: number) {
  if (minutes <= 0) return "No time estimate yet";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)} hours`;
}

function flattenCourse(course: LearningBuiltCourse) {
  const modules = course.modules;
  const lessons = modules.flatMap((module) => module.lessons);
  const topics = lessons.flatMap((lesson) => lesson.topics);
  const activities = topics.flatMap((topic) => topic.activities);

  return { modules, lessons, topics, activities };
}

function buildMappedJourney(goal: LearningGoal, course: LearningBuiltCourse): LearningJourney {
  const progressPercent = calculateBuiltCourseProgress(course);
  const { modules, lessons, topics, activities } = flattenCourse(course);
  const completedModules = modules.filter((module) => module.completed).length;
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const remainingLessons = lessons.filter((lesson) => !lesson.completed).length;
  const remainingCheckpoints = activities.filter(
    (activity) => !activity.completed && activity.type === "assessment"
  ).length;
  const remainingMinutes = activities
    .filter((activity) => !activity.completed)
    .reduce((sum, activity) => sum + activity.estimatedMinutes, 0);
  const currentModule = modules.find((module) => !module.completed) || modules[0];
  const currentLesson = lessons.find((lesson) => !lesson.completed);
  const nextLesson = lessons.find(
    (lesson) => !lesson.completed && lesson.id !== currentLesson?.id
  );
  const currentTopic = topics.find((topic) => !topic.completed);
  const nextActivity = activities.find((activity) => !activity.completed);
  const reviewTopic = topics.find((topic) => topic.completed && topic.reviewPrompt);
  const lessonBeforeCurrent = currentLesson
    ? lessons.slice(0, lessons.indexOf(currentLesson)).every((lesson) => lesson.completed)
    : true;
  const steps: LearningJourneyStep[] = [
    {
      id: `${goal.id}-goal`,
      kind: "goal",
      title: goal.title,
      status: "completed",
      progress: 100,
      detail: "Learning goal selected.",
    },
    {
      id: course.id,
      kind: "course",
      title: course.title,
      status: course.completed ? "completed" : "current",
      progress: progressPercent,
      detail: `${completedModules} of ${modules.length} module${modules.length === 1 ? "" : "s"} complete.`,
    },
    ...course.milestones.map((milestone, index) => ({
      id: `${course.id}-milestone-${index + 1}`,
      kind: "milestone" as const,
      title: milestone,
      status: index === 0 && completedLessons > 0
        ? "completed" as const
        : index === 1 && completedLessons > 0
          ? "available" as const
          : index === 0
            ? "current" as const
            : "locked_by_prerequisite" as const,
      progress: index === 0 && completedLessons > 0 ? 100 : index === 0 ? progressPercent : 0,
      detail:
        index === 0 && completedLessons > 0
          ? "Checkpoint Reached"
          : index <= completedLessons
            ? "Next Mission"
            : "Locked until earlier milestones are complete.",
      prerequisiteLabel:
        index <= completedLessons ? undefined : "Complete the earlier milestone first.",
    })),
    ...modules.map((module, index) => {
      const previousComplete = modules.slice(0, index).every((item) => item.completed);
      const current = module.id === currentModule?.id;

      return {
        id: module.id,
        kind: "module" as const,
        title: module.title,
        status: stepStatus({
          completed: module.completed,
          current,
          previousComplete,
          remediationRequired: previousComplete && current && goal.progress < 25,
        }),
        progress: module.completed ? 100 : current ? progressPercent : 0,
        detail: module.completed
          ? "Mission Complete"
          : current
            ? "Current unit"
            : "Locked until earlier work is complete.",
        prerequisiteLabel: previousComplete ? undefined : "Complete the previous module first.",
      };
    }),
    ...lessons.map((lesson, index) => {
      const previousComplete = lessons.slice(0, index).every((item) => item.completed);
      const current = lesson.id === currentLesson?.id;

      return {
        id: lesson.id,
        kind: "lesson" as const,
        title: lesson.title,
        status: stepStatus({
          completed: lesson.completed,
          current,
          previousComplete,
          reviewDue: lesson.completed && Boolean(lesson.topics.find((topic) => topic.reviewPrompt)),
          remediationRequired: previousComplete && current && goal.progress < 25,
        }),
        progress: lesson.completed ? 100 : current ? Math.max(10, progressPercent) : 0,
        detail: lesson.completed
          ? "Checkpoint Reached"
          : current
            ? "Next Mission"
            : "Locked by prerequisite.",
        prerequisiteLabel: previousComplete ? undefined : "Complete the previous lesson first.",
      };
    }),
    ...topics.map((topic, index) => {
      const previousComplete = topics.slice(0, index).every((item) => item.completed);
      const current = topic.id === currentTopic?.id;

      return {
        id: topic.id,
        kind: "concept" as const,
        title: topic.title,
        status: stepStatus({
          completed: topic.completed,
          current,
          previousComplete,
          reviewDue: topic.completed && Boolean(topic.reviewPrompt),
        }),
        progress: topic.completed ? 100 : current ? 25 : 0,
        detail: topic.completed ? topic.reviewPrompt : current ? "Unlocked" : "Locked by prerequisite.",
        prerequisiteLabel: previousComplete ? undefined : "Finish the previous concept first.",
      };
    }),
    ...activities.map((activity, index) => {
      const previousComplete = activities.slice(0, index).every((item) => item.completed);
      const current = activity.id === nextActivity?.id;

      return {
        id: activity.id,
        kind: activity.type === "assessment" ? "mastery" as const : "skill" as const,
        title: activity.title,
        status: stepStatus({
          completed: activity.completed,
          current,
          previousComplete,
        }),
        progress: activity.completed ? 100 : current ? 10 : 0,
        detail: activity.completed ? "Mission Complete" : current ? "Unlocked" : "Locked by prerequisite.",
        prerequisiteLabel: previousComplete ? undefined : "Complete the prior activity first.",
      };
    }),
    {
      id: `${goal.id}-completion`,
      kind: "completion",
      title: `${goal.title} completion`,
      status: course.completed ? "completed" : "locked_by_prerequisite",
      progress: course.completed ? 100 : 0,
      detail: course.completed
        ? "Mission Complete"
        : "Unlocks after all required lessons and checkpoints are complete.",
      prerequisiteLabel: course.completed ? undefined : "Finish the required journey first.",
    },
  ];

  return {
    id: `${goal.id}-journey`,
    title: goal.title,
    active: goal.status === "Active",
    steps,
    progressPercent,
    progressLabel: `You've completed ${completedLessons} of ${lessons.length} lesson${lessons.length === 1 ? "" : "s"}.`,
    currentUnitLabel: currentModule?.title || "No current unit",
    nextUnitLabel: currentLesson?.title || "All required lessons are complete",
    remainingWorkLabel:
      remainingLessons > 0 || remainingCheckpoints > 0
        ? `${remainingLessons} lesson${remainingLessons === 1 ? "" : "s"} and ${remainingCheckpoints} checkpoint${remainingCheckpoints === 1 ? "" : "s"} remain, about ${minutesLabel(remainingMinutes)} of work.`
        : "No required lessons remain in this mapped path.",
    nextMilestoneLabel:
      nextActivity?.title ||
      currentLesson?.title ||
      "Completion record is ready after final review.",
    unlockMessage: currentLesson && lessonBeforeCurrent
      ? `Checkpoint reached. Your next mission is ready: ${currentLesson.title}.`
      : reviewTopic
        ? `Review due: ${reviewTopic.title}.`
        : undefined,
    estimateIsHonest: activities.length > 0,
  };
}

function buildUnmappedJourney(goal: LearningGoal): LearningJourney {
  return {
    id: `${goal.id}-journey`,
    title: goal.title,
    active: goal.status === "Active",
    steps: [
      {
        id: `${goal.id}-goal`,
        kind: "goal",
        title: goal.title,
        status: goal.status === "Completed" ? "completed" : "current",
        progress: goal.status === "Completed" ? 100 : Math.max(0, goal.progress),
        detail: goal.target,
      },
      {
        id: `${goal.id}-path-building`,
        kind: "course",
        title: "Learning path",
        status: "current",
        progress: 0,
        detail:
          "This path is still being built, so I can't give you an honest finish estimate yet.",
      },
    ],
    progressPercent: Math.max(0, goal.progress),
    progressLabel: "Journey Progress will become precise after a mapped path exists.",
    currentUnitLabel: goal.title,
    nextUnitLabel: "Path mapping in progress",
    remainingWorkLabel:
      "This path is still being built, so I can't give you an honest finish estimate yet.",
    nextMilestoneLabel: "First mapped lesson",
    estimateIsHonest: false,
  };
}

export function buildLearningJourneys(
  goals: LearningGoal[],
  courses: LearningBuiltCourse[] = builtLearningCourses
): LearningJourney[] {
  return goals.map((goal) => {
    const mappedCourse = courses.find((course) => goalMatchesCourse(goal, course));

    return mappedCourse ? buildMappedJourney(goal, mappedCourse) : buildUnmappedJourney(goal);
  });
}
