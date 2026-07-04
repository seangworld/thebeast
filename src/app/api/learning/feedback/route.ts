import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    userId?: string;
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

  const supabase = createAdminClient();
  let userId = body.userId;

  if (!userId) {
    try {
      const routeClient = createRouteClient();
      const {
        data: { user },
      } = await routeClient.auth.getUser();

      userId = user?.id;
    } catch {
      userId = undefined;
    }
  }

  if (!supabase || !userId) {
    return NextResponse.json({
      status: "fallback-static",
      item: {
        id: `feedback-${Date.now()}`,
        category,
        message,
        context: body.context || "BeastLearning Private Beta",
        submittedAt: new Date().toISOString(),
        status: "New",
      },
    });
  }

  const { data, error } = await supabase
    .from(learningTableNames.feedback)
    .insert(
      buildFeedbackInsertPayload({
        userId,
        category,
        message,
        context: body.context || "BeastLearning Private Beta",
      })
    )
    .select("id, category, message, context, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "supabase-ready", item: mapFeedbackRow(data) });
}
