export type CheckoutStartErrorCode =
  | "configuration"
  | "invalid_price"
  | "authentication"
  | "stripe"
  | "unexpected";

export function getCheckoutStartErrorMessage(code: CheckoutStartErrorCode) {
  if (code === "configuration") {
    return "Stripe billing is not fully configured. Check the Stripe environment variables and try again.";
  }

  if (code === "invalid_price") {
    return "Stripe could not start checkout because the Pro price configuration is invalid. Confirm the monthly and annual price IDs exist in the same Stripe test/live mode as the secret key.";
  }

  if (code === "authentication") {
    return "Please sign in again before starting checkout.";
  }

  if (code === "stripe") {
    return "Stripe could not start checkout right now. Please try again in a moment.";
  }

  return "Checkout could not start. Please try again or review billing configuration.";
}
