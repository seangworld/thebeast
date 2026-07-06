import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import {
  buildFeedbackInsertPayload,
  learningTableNames,
  mapFeedbackRow,
} from "@/lib/learning/persistence";
import type { LearningFeedbackCategory } from "@/lib/learning/types";

export const dynamic = "force-dynamic";

const categories: LearningFeedbackCategory[] = [
  "feature request",
  "bug",
  "confusing experience",
  "like",
  "dislike",
  "suggestion",
];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    category?: LearningFeedbackCategory;
    message?: string;
    context?: string;
  };
  const category = body.category;
  const message = body.message?.trim();

  if (!category || !categories.includes(category) || !message) {
    return NextResponse.json(
      { error: "Feedback category and message are required." },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(learningTableNames.feedback)
    .insert(
      buildFeedbackInsertPayload({
        userId: user.id,
        category,
        message,
        context: body.context || "BeastLearning feedback",
      })
    )
    .select("id, category, message, context, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "saved", item: mapFeedbackRow(data) });
}
