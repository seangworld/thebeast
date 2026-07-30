export type GuidanceCounselorSessionAwareness = {
  greeting: string;
  opening: string;
  firstVisit: boolean;
  elapsedSinceReview: string | null;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "";
}

function timeGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function guidanceElapsedTime(
  previousReviewAt: string,
  now: Date
) {
  const previous = new Date(previousReviewAt);
  if (Number.isNaN(previous.getTime())) return null;
  const milliseconds = Math.max(0, now.getTime() - previous.getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 2) return "a moment";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "an hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  if (days < 14) return days === 1 ? "a day" : `${days} days`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return weeks === 1 ? "a week" : `${weeks} weeks`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month" : `${months} months`;
}

export function buildGuidanceCounselorSessionAwareness({
  memberName,
  now,
  previousReviewAt,
  previousConversationSummary,
}: {
  memberName: string;
  now: Date;
  previousReviewAt?: string;
  previousConversationSummary?: string;
}): GuidanceCounselorSessionAwareness {
  const name = firstName(memberName);
  const greeting = `${timeGreeting(now)}${name ? `, ${name}` : ""}.`;
  const elapsedSinceReview = previousReviewAt
    ? guidanceElapsedTime(previousReviewAt, now)
    : null;

  if (!elapsedSinceReview) {
    return {
      greeting,
      opening:
        "I’m your Guidance Counselor. Tell me about your educational journey.",
      firstVisit: true,
      elapsedSinceReview: null,
    };
  }

  const memory = previousConversationSummary?.trim();
  return {
    greeting,
    opening: memory
      ? `It’s been ${elapsedSinceReview} since our last review. Last time, ${memory}. What would be most useful to work through today?`
      : `It’s been ${elapsedSinceReview} since our last review. What would be most useful to work through today?`,
    firstVisit: false,
    elapsedSinceReview,
  };
}
