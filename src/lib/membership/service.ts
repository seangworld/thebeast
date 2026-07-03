import { createClient } from "../supabase/client";
import {
  DEFAULT_FREE_MEMBERSHIP,
  getMembershipEntitlementPlan,
  isSubscriptionStatusActive,
  normalizeBillingProvider,
  normalizeMembershipPlan,
  normalizeSubscriptionStatus,
  type MembershipRecord,
  type MembershipSnapshot,
  type SubscriptionStatus,
} from "./types";

type SubscriptionRow = Record<string, unknown>;

export type MembershipUpdateInput = {
  userId: string;
  plan: "free" | "pro";
  status: SubscriptionStatus;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

function mapSubscriptionRow(row: SubscriptionRow): MembershipRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan: normalizeMembershipPlan(row.plan),
    status: normalizeSubscriptionStatus(row.status),
    billing_provider: normalizeBillingProvider(row.billing_provider),
    provider_customer_id: (row.provider_customer_id as string | null) ?? null,
    provider_subscription_id:
      (row.provider_subscription_id as string | null) ?? null,
    current_period_end: (row.current_period_end as string | null) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toMembershipSnapshot(
  subscription: MembershipRecord | null,
  source: MembershipSnapshot["source"]
): MembershipSnapshot {
  if (!subscription) return DEFAULT_FREE_MEMBERSHIP;

  return {
    plan: getMembershipEntitlementPlan({
      plan: subscription.plan,
      status: subscription.status,
      isActive: isSubscriptionStatusActive(subscription.status),
    }),
    status: subscription.status,
    isActive: isSubscriptionStatusActive(subscription.status),
    source,
    subscription,
  };
}

async function readMembershipForUser(
  userId: string
): Promise<MembershipSnapshot | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? toMembershipSnapshot(mapSubscriptionRow(data as SubscriptionRow), "database")
    : null;
}

async function createDefaultFreeMembership(
  userId: string
): Promise<MembershipSnapshot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan: "free",
      status: "active",
      billing_provider: "stripe",
      cancel_at_period_end: false,
    })
    .select("*")
    .single();

  if (error) {
    const existing = await readMembershipForUser(userId);
    if (existing) return existing;
    throw error;
  }

  return toMembershipSnapshot(
    mapSubscriptionRow(data as SubscriptionRow),
    "database"
  );
}

export async function getMembershipForUser(
  userId: string
): Promise<MembershipSnapshot> {
  const membership = await readMembershipForUser(userId);
  return membership ?? createDefaultFreeMembership(userId);
}

export async function getCurrentMembership(): Promise<MembershipSnapshot> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return DEFAULT_FREE_MEMBERSHIP;
  }

  return getMembershipForUser(userData.user.id);
}

export async function updateMembership(
  input: MembershipUpdateInput
): Promise<MembershipSnapshot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        plan: input.plan,
        status: input.status,
        billing_provider: "stripe",
        provider_customer_id: input.providerCustomerId ?? null,
        provider_subscription_id: input.providerSubscriptionId ?? null,
        current_period_end: input.currentPeriodEnd ?? null,
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toMembershipSnapshot(
    mapSubscriptionRow(data as SubscriptionRow),
    "database"
  );
}
