type MemberRequestBudget = {
  activeProfessionals: Map<string, { acquiredAt: number; token: symbol }>;
  acceptedAt: number[];
};

export type DigitalStaffRequestLease = {
  ok: true;
  release: () => void;
} | {
  ok: false;
  reason: "concurrent_request" | "rate_limit";
  retryAfterSeconds: number;
};

const requestWindowMs = 60_000;
const maximumRequestsPerWindow = 12;
export const maximumDigitalStaffLeaseMs = 65_000;
const memberBudgets = new Map<string, MemberRequestBudget>();

export function acquireDigitalStaffRequestLease(
  ownerId: string,
  professionalId: string,
  now = Date.now()
): DigitalStaffRequestLease {
  memberBudgets.forEach((budget, memberId) => {
    budget.activeProfessionals.forEach((lease, activeProfessionalId) => {
      if (now - lease.acquiredAt >= maximumDigitalStaffLeaseMs) {
        budget.activeProfessionals.delete(activeProfessionalId);
      }
    });
    if (
      budget.activeProfessionals.size === 0
      && budget.acceptedAt.every((acceptedAt: number) => now - acceptedAt >= requestWindowMs)
    ) {
      memberBudgets.delete(memberId);
    }
  });
  const existing = memberBudgets.get(ownerId) || {
    activeProfessionals: new Map<string, { acquiredAt: number; token: symbol }>(),
    acceptedAt: [],
  };
  existing.acceptedAt = existing.acceptedAt.filter(
    (acceptedAt) => now - acceptedAt < requestWindowMs
  );
  memberBudgets.set(ownerId, existing);

  if (existing.activeProfessionals.has(professionalId)) {
    return { ok: false, reason: "concurrent_request", retryAfterSeconds: 2 };
  }
  if (existing.acceptedAt.length >= maximumRequestsPerWindow) {
    const oldest = existing.acceptedAt[0] || now;
    return {
      ok: false,
      reason: "rate_limit",
      retryAfterSeconds: Math.max(1, Math.ceil((requestWindowMs - (now - oldest)) / 1_000)),
    };
  }

  const token = Symbol(professionalId);
  existing.activeProfessionals.set(professionalId, { acquiredAt: now, token });
  existing.acceptedAt.push(now);
  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      if (existing.activeProfessionals.get(professionalId)?.token === token) {
        existing.activeProfessionals.delete(professionalId);
      }
      if (existing.activeProfessionals.size === 0 && existing.acceptedAt.length === 0) {
        memberBudgets.delete(ownerId);
      }
    },
  };
}
