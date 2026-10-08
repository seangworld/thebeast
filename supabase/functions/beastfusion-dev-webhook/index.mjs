import Stripe from "npm:stripe@22.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.104.1";
import { validateBeastFusionPurchase, validateBeastFusionLineItems } from "../../../src/lib/beastfusion/validatePurchase.ts";
import { createDevelopmentWebhook } from "./handler.mjs";

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  BEASTFUSION_DEV_WEBHOOK_ENABLED: Deno.env.get("BEASTFUSION_DEV_WEBHOOK_ENABLED"),
  BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET: Deno.env.get("BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET"),
  BEASTFUSION_DEV_STRIPE_READ_KEY: Deno.env.get("BEASTFUSION_DEV_STRIPE_READ_KEY"),
  STRIPE_BEASTFUSION_PRO_PRICE_ID: Deno.env.get("STRIPE_BEASTFUSION_PRO_PRICE_ID")
};
// A separate restricted test key needs only Checkout Session read access.
// The handler rejects live/broad keys and missing configuration before API I/O.
const stripe = new Stripe(env.BEASTFUSION_DEV_STRIPE_READ_KEY ?? "disabled");
Deno.serve(createDevelopmentWebhook({
  env,
  validatePurchase: validateBeastFusionPurchase,
  validateLineItems: validateBeastFusionLineItems,
  readLineItems: (id) => stripe.checkout.sessions.listLineItems(id, { limit: 2 }),
  verifyEvent: (body, signature, secret) =>
    stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider),
  issueLicense: (row, options) =>
    createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    }).from("beastfusion_licenses").upsert(row, options)
}));

