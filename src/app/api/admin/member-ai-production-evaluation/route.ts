import { NextResponse } from "next/server";
import {
  buildProductionHandoffEvaluationContext,
  buildProductionEvaluationContext,
  emptyProductionEvaluationState,
  evaluateProductionEntitlement,
  productionEvaluationEntitlementChecks,
  productionEvaluationScenarios,
  requireProductionEvaluationScenario,
  runDigitalStaffRuntime,
  selectDigitalStaffModel,
  type ConversationState,
  type RuntimeMessage,
} from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const privateHeaders = { "Cache-Control": "private, no-store, no-transform" } as const;

async function requireOwner() {
  const supabase = createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders }) };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return { response: NextResponse.json({ error: "Owner access could not be verified." }, { status: 503, headers: privateHeaders }) };
  if (profile?.role !== "admin") return { response: NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403, headers: privateHeaders }) };
  return { response: null };
}

export async function GET() {
  const access = await requireOwner();
  if (access.response) return access.response;
  return NextResponse.json({
    packageId: "BF-AGT-016",
    environment: process.env.VERCEL_ENV || "local",
    configuredModelPolicy: {
      turns: productionEvaluationScenarios.flatMap((scenario) => [
        ...scenario.turns.map((turn, turnIndex) => {
          const context = buildProductionEvaluationContext({ scenario, turnIndex, recentMessages: [], state: emptyProductionEvaluationState });
          return { scenarioId: scenario.id, turnId: turn.id, professionalId: scenario.professionalId, selectedModel: selectDigitalStaffModel(context) };
        }),
        ...(scenario.handoffExercise ? [{
          scenarioId: scenario.id,
          turnId: "handoff-target",
          professionalId: scenario.handoffExercise.targetProfessionalId,
          selectedModel: selectDigitalStaffModel(buildProductionHandoffEvaluationContext({ scenario })),
        }] : []),
      ]),
      selectionSource: "deployed server environment with canonical runtime defaults",
    },
    entitlementChecks: productionEvaluationEntitlementChecks.map((check) => {
      const result = evaluateProductionEntitlement(check);
      return { ...check, actualAllowed: result.allowed, reason: result.reason, passed: result.allowed === check.expectedAllowed };
    }),
    scenarios: productionEvaluationScenarios.map(({ id, title, professionalId, ageBand, dimensions, turns }) => ({
      id, title, professionalId, ageBand, dimensions, turns: turns.map(({ id: turnId, criteria }) => ({ id: turnId, criteria })),
    })),
  }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const access = await requireOwner();
  if (access.response) return access.response;
  let body: { scenarioId?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "A valid evaluation request is required." }, { status: 400, headers: privateHeaders }); }
  if (typeof body.scenarioId !== "string") return NextResponse.json({ error: "An approved scenario is required." }, { status: 400, headers: privateHeaders });
  let scenario;
  try { scenario = requireProductionEvaluationScenario(body.scenarioId); } catch { return NextResponse.json({ error: "Unknown evaluation scenario." }, { status: 400, headers: privateHeaders }); }

  const recentMessages: RuntimeMessage[] = [];
  let state: ConversationState = { ...emptyProductionEvaluationState };
  const results: Array<Record<string, unknown>> = [];
  const handoffExecutions: Array<Record<string, unknown>> = [];
  try {
    const sourceEntitlement = evaluateProductionEntitlement({ professionalId: scenario.professionalId, ageBand: scenario.ageBand });
    if (!sourceEntitlement.allowed) {
      return NextResponse.json({ error: "The synthetic member is not entitled to this specialist.", entitlementReason: sourceEntitlement.reason }, { status: 403, headers: privateHeaders });
    }
    for (let index = 0; index < scenario.turns.length; index += 1) {
      const context = buildProductionEvaluationContext({ scenario, turnIndex: index, recentMessages, state });
      const selectedModel = selectDigitalStaffModel(context);
      const result = await runDigitalStaffRuntime(context);
      results.push({
        turnId: scenario.turns[index].id,
        memberMessage: context.message.text,
        criteria: scenario.turns[index].criteria,
        selectedModel,
        returnedModel: result.model,
        response: result.response,
        intent: result.intent,
        nextQuestion: result.nextQuestion,
        handoff: result.handoff,
        navigationTarget: result.navigationTarget,
        proposalCount: result.proposals.length,
        toolCalls: result.toolCalls,
        researchSources: result.researchSources,
        validationFailures: result.validationFailures,
        responseContract: result.responseContract,
        timings: result.timings,
      });
      recentMessages.push(context.message, {
        id: `${scenario.id}-${scenario.turns[index].id}-assistant`,
        role: "assistant",
        text: result.response,
        createdAt: new Date(Date.UTC(2026, 7, 30, 12, index, 30)).toISOString(),
      });
      state = result.state;

      if (scenario.handoffExercise?.sourceTurnId === scenario.turns[index].id) {
        const expectedTarget = scenario.handoffExercise.targetProfessionalId;
        if (result.handoff?.professionalId !== expectedTarget) {
          handoffExecutions.push({
            sourceTurnId: scenario.turns[index].id,
            status: "source-handoff-missing",
            expectedTarget,
            offeredTarget: result.handoff?.professionalId || null,
            receiverInvoked: false,
          });
        } else {
          const targetEntitlement = evaluateProductionEntitlement({ professionalId: expectedTarget, ageBand: scenario.handoffExercise.targetAgeBand });
          if (!targetEntitlement.allowed) {
            handoffExecutions.push({
              sourceTurnId: scenario.turns[index].id,
              status: "target-entitlement-denied",
              expectedTarget,
              entitlementReason: targetEntitlement.reason,
              receiverInvoked: false,
            });
          } else {
            const targetContext = buildProductionHandoffEvaluationContext({ scenario });
            const targetModel = selectDigitalStaffModel(targetContext);
            const targetResult = await runDigitalStaffRuntime(targetContext);
            handoffExecutions.push({
              sourceTurnId: scenario.turns[index].id,
              status: "completed",
              expectedTarget,
              entitlementRechecked: true,
              entitlementReason: targetEntitlement.reason,
              receiverInvoked: true,
              sourceConversationCopied: false,
              sourceMemoryCopied: false,
              sourceRecordsCopied: false,
              targetRecordDomains: targetContext.structuredRecords.map((record) => record.domain),
              selectedModel: targetModel,
              returnedModel: targetResult.model,
              response: targetResult.response,
              validationFailures: targetResult.validationFailures,
              responseContract: targetResult.responseContract,
              timings: targetResult.timings,
            });
          }
        }
      }
    }
    return NextResponse.json({
      packageId: "BF-AGT-016",
      scenarioId: scenario.id,
      title: scenario.title,
      professionalId: scenario.professionalId,
      ageBand: scenario.ageBand,
      dimensions: scenario.dimensions,
      environment: process.env.VERCEL_ENV || "local",
      syntheticOnly: true,
      memberRecordsLoaded: false,
      modelOverrideUsed: false,
      executionComplete: !scenario.handoffExercise || handoffExecutions.some((item) => item.status === "completed"),
      results,
      handoffExecutions,
    }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "The controlled Production-model evaluation failed safely.", completedTurns: results.length }, { status: 502, headers: privateHeaders });
  }
}
