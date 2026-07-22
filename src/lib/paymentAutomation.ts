export type PaymentAutomationSettings = { autoPayEnabled: boolean; reminderEnabled: boolean };
export type PaymentAutomationRecord = { id: string; name: string; auto_pay_enabled?: boolean | null; reminder_enabled?: boolean | null; paid?: boolean | number | null };

export function normalizePaymentAutomation(record: PaymentAutomationRecord): PaymentAutomationSettings {
  return { autoPayEnabled: record.auto_pay_enabled === true, reminderEnabled: record.reminder_enabled !== false };
}

export function buildPaymentAutomationContext(records: readonly PaymentAutomationRecord[]) {
  const items = records.map((record) => ({ id: record.id, name: record.name, ...normalizePaymentAutomation(record), paymentConfirmed: record.paid === true }));
  return {
    items,
    autoPayCount: items.filter((item) => item.autoPayEnabled).length,
    manualPaymentCount: items.filter((item) => !item.autoPayEnabled).length,
    remindersEnabledCount: items.filter((item) => item.reminderEnabled).length,
    needsAttentionCount: items.filter((item) => !item.autoPayEnabled && !item.paymentConfirmed).length,
  };
}

export function assertAutomationChangeConfirmed(confirmed: boolean) {
  if (!confirmed) throw new Error("Explicit user confirmation is required to change payment automation settings.");
}
