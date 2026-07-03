# Stripe Sandbox Testing

Use this checklist to validate the Beast v2 subscription lifecycle in Stripe test mode.

## Test card

- Card number: `4242 4242 4242 4242`
- Expiration: any future date
- CVC: any value
- ZIP: any value

## Monthly upgrade

1. Sign in as a Free user.
2. Open `/dashboard/money/billing`.
3. Click `Upgrade Monthly`.
4. Complete Stripe Checkout with the test card.
5. Confirm the return URL is `/dashboard/money/billing?success=true`.
6. Confirm the Supabase `subscriptions` row has `plan = pro`, `status = active`, a Stripe customer ID, and a Stripe subscription ID.
7. Confirm Pro features unlock and no longer show upgrade previews.

## Checkout 500 troubleshooting

- Confirm `STRIPE_SECRET_KEY` is set and matches the Stripe mode you are testing, such as `sk_test_...` for sandbox checkout.
- Confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` uses the same mode as the secret key.
- Confirm `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_ANNUAL_PRICE_ID` both start with `price_`.
- Confirm the monthly and annual Price IDs exist in the same Stripe account and test/live mode as the secret key.
- Confirm `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL` point back to `/dashboard/money/billing`.
- If checkout cannot start, Billing should show a readable error card instead of an unexplained 500 page.

## Annual upgrade

1. Start from a Free test user or cancel/reset the existing test subscription.
2. Open `/dashboard/money/billing`.
3. Click `Upgrade Annual`.
4. Complete Stripe Checkout with the test card.
5. Confirm Stripe used the annual Pro price.
6. Confirm the Supabase `subscriptions` row updates to Pro.

## Cancellation

1. Open `/dashboard/money/billing` as a Pro user.
2. Click `Manage Subscription`.
3. Cancel the subscription in the Stripe Customer Portal.
4. Confirm the portal returns to `/dashboard/money/billing`.
5. Confirm the webhook updates the Supabase `subscriptions` row to a Free-safe status.
6. Confirm Pro features return to upgrade preview state.

## Entitlement checks

- A Free user should see upgrade previews, not access denied.
- A Pro user should access Velocity Planner and Beast Advisor.
- A canceled, unpaid, incomplete, incomplete-expired, or past-due subscription should fall back to Free access.
- Admin View As should still override database membership: Admin override, then database membership, then default Free.

## Mobile Reset Due Date

1. On a mobile viewport, open `/dashboard/money/cashflow#bills`.
2. Reset due date on an active bill and confirm the button shows a temporary resetting state.
3. Confirm the bill list refreshes and the assigned paycheck/funding source remains unchanged.
4. Archive and restore a bill, then repeat the reset.
5. Open `/dashboard/money/cashflow#debts`.
6. Reset due date on an active debt and confirm the button shows a temporary resetting state.
7. Confirm the debt list refreshes and the assigned paycheck/funding source remains unchanged.
8. Archive and restore a debt, then repeat the reset.
