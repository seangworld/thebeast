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
type SupabaseMembershipClient = {
  from: (table: "subscriptions") => any;
};

export type MembershipUpdateInput = {
  userId: string;
  plan: "free" | "pro";
  status: SubscriptionStatus;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export function mapSubscriptionRow(row: SubscriptionRow): MembershipRecord {
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

export function toMembershipSnapshot(
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

export function buildMembershipUpsertPayload(input: MembershipUpdateInput) {
  return {
    user_id: input.userId,
    plan: input.plan,
    status: input.status,
    billing_provider: "stripe",
    provider_customer_id: input.providerCustomerId ?? null,
    provider_subscription_id: input.providerSubscriptionId ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
  };
}

export async function readMembershipForUserWithClient(
  supabase: SupabaseMembershipClient,
  userId: string
): Promise<MembershipSnapshot | null> {
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

export async function readMembershipForCustomerWithClient(
  supabase: SupabaseMembershipClient,
  customerId: string
): Promise<MembershipSnapshot | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("provider_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? toMembershipSnapshot(mapSubscriptionRow(data as SubscriptionRow), "database")
    : null;
}

export async function createDefaultFreeMembershipWithClient(
  supabase: SupabaseMembershipClient,
  userId: string
): Promise<MembershipSnapshot> {
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
    const existing = await readMembershipForUserWithClient(supabase, userId);
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
  const supabase = createClient();
  return getMembershipForUserWithClient(supabase, userId);
}

export async function getMembershipForUserWithClient(
  supabase: SupabaseMembershipClient,
  userId: string
): Promise<MembershipSnapshot> {
  const membership = await readMembershipForUserWithClient(supabase, userId);
  return membership ?? createDefaultFreeMembershipWithClient(supabase, userId);
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
  return updateMembershipWithClient(supabase, input);
}

export async function updateMembershipWithClient(
  supabase: SupabaseMembershipClient,
  input: MembershipUpdateInput
): Promise<MembershipSnapshot> {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(buildMembershipUpsertPayload(input), { onConflict: "user_id" })
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
