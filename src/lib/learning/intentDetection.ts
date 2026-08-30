import type { LearningConversationType, LearningIntent } from "./types";
import { getSampleLearningContentRecordForGoal } from "./sampleContentRegistry";

export function isLearningWorkReviewRequest(request: string) {
  const value = request.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const directReviewVerb = /\b(?:check|review|grade|verify|evaluate|assess|correct|confirm)\b/.test(value)
    && /\b(?:my|this|the)\b.{0,35}\b(?:work|answer|solution|reasoning|steps?|result|problem)\b/.test(value);
  const correctnessQuestion = /\b(?:is|was)\s+(?:(?:my|this|that|the)\s+)?(?:work|answer|solution|reasoning|result|it|that)\s+(?:right|correct)\b/.test(value)
    || /\b(?:is|was)\s+(?:this|that|it)\s+(?:the\s+)?(?:right|correct)\s+(?:answer|solution|result)\b/.test(value)
    || /\b(?:am i|did i)\b.{0,45}\b(?:right|correct|correctly|well|mistakes?|errors?)\b/.test(value)
    || /\bdoes\b.{0,40}\b(?:work|answer|solution|reasoning|result)\b.{0,20}\blook right\b/.test(value);
  const requestedVerdict = /\b(?:tell me whether|can you tell me if|confirm whether)\b.{0,55}\b(?:got it right|right|correct|mistakes?|errors?)\b/.test(value)
    || /\btell me if i\b.{0,25}\b(?:messed|mixed|got)\b.{0,15}\b(?:up|wrong)\b/.test(value)
    || /\bdo (?:these|my|the) steps? work\b/.test(value)
    || /\bwould (?:this|my answer|my work) earn (?:full )?credit\b/.test(value)
    || /\bcan you (?:see|find|spot) (?:an|any|the) (?:error|mistake)s? (?:here|in this|in my work)?\b/.test(value)
    || /\bis (?:this|that|it) acceptable as (?:my|an|the) answer\b/.test(value)
    || /\b(?:look over|thoughts? on) (?:my|this|the) (?:work|answer|solution|calculation|reasoning|steps?)\b/.test(value)
    || /\b(?:did i make|are there|do you see)\b.{0,25}\b(?:mistakes?|errors?)\b/.test(value)
    || /\bwhat do you think (?:of|about)\b.{0,35}\b(?:work|answer|solution|reasoning|result)\b/.test(value)
    || /\b(?:how did i do|where (?:did i|i) go wrong|first (?:mistake|error))\b/.test(value);
  return directReviewVerb || correctnessQuestion || requestedVerdict;
}

export function detectLearningIntent(request: string): LearningIntent {
  const value = request.toLowerCase();
  const sampleRecord = getSampleLearningContentRecordForGoal(value);

  if (value.includes("homework")) return "Homework help";
  if (value.includes("quiz")) return "Quiz me";
  if (value.includes("practice")) return "Practice";
  if (value.includes("review") || isLearningWorkReviewRequest(value)) return "Review";
  if (value.includes("career") || value.includes("job")) return "Career advice";
  if (sampleRecord?.intent) return sampleRecord.intent;
  if (value.includes("summarize") || value.includes("summary")) return "Summarize";
  if (value.includes("research")) return "Research";
  if (value.includes("explain")) return "Explain";
  if (value.includes("understand")) return "Help me understand";

  return "Teach me";
}

export function conversationTypeFromIntent(intent: LearningIntent): LearningConversationType {
  const map: Record<LearningIntent, LearningConversationType> = {
    "Teach me": "Lesson",
    "Help me understand": "Explanation",
    Review: "Review",
    Practice: "Practice",
    "Quiz me": "Assessment",
    Explain: "Explanation",
    "Career advice": "Career Advice",
    Certification: "Planning",
    "Homework help": "Question",
    Summarize: "Review",
    Research: "Planning",
  };

  return map[intent];
}
