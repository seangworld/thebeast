import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { getCollectionResourceCount } from "@/lib/learning/collections";
import type { LearningDashboardContent } from "@/lib/learning/types";

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-2.5 py-1 text-xs font-bold text-[#dbe3ef]">
      {label}
    </span>
  );
}

export default function LearningContentIntelligencePanel({
  content,
}: {
  content: LearningDashboardContent;
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Content Intelligence"
        title="Learning library and study assets"
        description="BeastEducation now has typed foundations for materials, subjects, courses, lessons, flashcards, quizzes, exams, guides, notes, bookmarks, search, collections, and review scheduling."
        action={<ModuleBadge module="learning" label="v0.4 Content" />}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Library"
          value={String(content.library.length)}
          detail="Materials organized"
          icon="L"
          tone="purple"
        />
        <MetricTile
          label="Reviews"
          value={String(content.upcomingReview.length)}
          detail="Due or overdue"
          icon="R"
          tone="yellow"
        />
        <MetricTile
          label="Flashcards"
          value={String(content.flashcardsDue.length)}
          detail="Ready to review"
          icon="F"
          tone="blue"
        />
        <MetricTile
          label="Collections"
          value={String(content.studyCollections.length)}
          detail="Mixed resource sets"
          icon="C"
          tone="green"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Continue Studying
                </div>
                <h3 className="mt-1 font-black text-white">
                  Next lessons and materials
                </h3>
              </div>
              <StatusPill label={`${content.recentMaterials.length} recent`} />
            </div>
            <div className="mt-4 grid gap-3">
              {content.continueStudying.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-lg border border-indigo-300/25 bg-indigo-300/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-white">{lesson.title}</div>
                    <StatusPill label={lesson.estimatedCompletionTime} />
                  </div>
                  <p className="mt-1 text-sm text-indigo-100">
                    {lesson.subject} · {lesson.lessonType}
                  </p>
                </div>
              ))}
              {content.recentMaterials.slice(0, 2).map((material) => (
                <div
                  key={material.id}
                  className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-white">{material.title}</div>
                    <StatusPill label={material.type} />
                  </div>
                  <p className="mt-1 text-sm text-[#c7cfdb]">
                    {material.subject} · {material.estimatedStudyTime}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Study Collections
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {content.studyCollections.slice(0, 4).map((collection) => (
                <div
                  key={collection.id}
                  className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-white">{collection.title}</div>
                    <StatusPill label={`${getCollectionResourceCount(collection)} items`} />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                    {collection.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Recommended Resources
            </div>
            <div className="mt-3 grid gap-2">
              {content.recommendedResources.map((resource) => (
                <div
                  key={`${resource.type}-${resource.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#0f1419] px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">
                    {resource.title}
                  </span>
                  <span className="text-xs font-bold uppercase text-[#7f8da3]">
                    {resource.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Review Queue
            </div>
            <div className="mt-3 grid gap-2">
              {content.upcomingReview.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0f1419] px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">
                    {review.itemId}
                  </span>
                  <StatusPill label={`${review.priority} · ${review.nextReview}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Bookmarked Items
            </div>
            <div className="mt-3 grid gap-2">
              {content.bookmarkedItems.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0f1419] px-3 py-2"
                >
                  <span className="text-sm font-bold text-white">
                    {bookmark.title}
                  </span>
                  <StatusPill label={bookmark.targetType} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
