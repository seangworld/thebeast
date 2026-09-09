/** Insert only. An existing campaign of any lifecycle state remains authoritative. */
export async function retainOrCreateSearchCampaign<TCampaign, TDraft>(operations: {
  find: () => Promise<TCampaign | null>;
  prepare: () => Promise<TDraft | null>;
  insert: (draft: TDraft) => Promise<TCampaign>;
}) {
  const existing = await operations.find();
  if (existing) return { campaign: existing, reused: true };
  const draft = await operations.prepare();
  if (!draft) return null;
  try {
    return { campaign: await operations.insert(draft), reused: false };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      const concurrent = await operations.find();
      if (concurrent) return { campaign: concurrent, reused: true };
    }
    throw error;
  }
}

export function selectSearchCampaign(campaigns: readonly { id: string }[], current: string, requested: string) {
  if (current && campaigns.some((item) => item.id === current)) return current;
  if (requested) return campaigns.some((item) => item.id === requested) ? requested : "";
  return campaigns[0]?.id || "";
}
