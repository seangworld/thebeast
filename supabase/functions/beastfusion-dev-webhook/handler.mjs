export const DEVELOPMENT_PROJECT_URL = "https://zvzcojwjgnedrouilovc.supabase.co";
export const DEVELOPMENT_PURCHASE_SCOPE = "beastfusion-dev-commercial-20261008";
const MAX_BYTES = 1024 * 1024;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

async function readPayload(request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("payload_too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// Dependencies are injected to exercise real Stripe signatures without remote writes.
export function createDevelopmentWebhook({ env, verifyEvent, validatePurchase, validateLineItems, readLineItems, issueLicense }) {
  return async function handle(request) {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (env.SUPABASE_URL !== DEVELOPMENT_PROJECT_URL ||
        env.BEASTFUSION_DEV_WEBHOOK_ENABLED !== "true" ||
        !env.BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET ||
        !/^rk_test_/.test(env.BEASTFUSION_DEV_STRIPE_READ_KEY ?? "") ||
        !env.STRIPE_BEASTFUSION_PRO_PRICE_ID ||
        !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "development_webhook_not_configured" }, 503);
    const signature = request.headers.get("stripe-signature");
    if (!signature) return json({ error: "missing_signature" }, 400);
    let payload;
    try { payload = await readPayload(request); }
    catch { return json({ error: "invalid_or_oversized_payload" }, 413); }
    let event;
    try { event = await verifyEvent(payload, signature, env.BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET); }
    catch { return json({ error: "invalid_signature" }, 400); }
    if (event.livemode !== false) return json({ error: "live_event_rejected" }, 400);
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      return json({ received: true, issued: false });
    }
    const session = event.data?.object;
    if (session?.metadata?.product !== "beastfusion-professional" ||
        session?.metadata?.verification_scope !== DEVELOPMENT_PURCHASE_SCOPE) {
      return json({ received: true, issued: false });
    }
    const check = validatePurchase(session, false);
    if (!check.ok) {
      return check.reason === "not_paid" ? json({ received: true, issued: false })
        : json({ error: check.reason }, 400);
    }
    let items;
    try { items = await readLineItems(session.id); }
    catch { return json({ error: "purchase_verification_unavailable" }, 503); }
    if (!validateLineItems(items.data, env.STRIPE_BEASTFUSION_PRO_PRICE_ID, items.has_more)) {
      return json({ error: "beastfusion_price_mismatch" }, 400);
    }
    // The FK is a second boundary: only development auth users can receive a row.
    try {
      const { error } = await issueLicense({
        user_id: check.userId, license_id: check.licenseId, edition: "professional",
        status: "active", updates_until: check.updatesUntil
      }, { onConflict: "license_id", ignoreDuplicates: true });
      if (error) return json({ error: "license_issue_failed" }, 500);
    } catch { return json({ error: "license_issue_failed" }, 500); }
    return json({ received: true, issued: true });
  };
}

