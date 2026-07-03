# Stripe Sandbox Testing

Use this checklist to validate the Beast v2 subscription lifecycle in Stripe test mode.

## Test card

- Card number: `4242 4242 4242 4242`
- Expiration: any future date
- CVC: any value
- ZIP: any value

## Monthly upgrade

1. Sign in as a Free user.
2. Open `/dashboard/billing`.
3. Click `Upgrade Monthly`.
4. Complete Stripe Checkout with the test card.
5. Confirm the return URL is `/dashboard/billing?success=true`.
6. Confirm the Supabase `subscriptions` row has `plan = pro`, `status = active`, a Stripe customer ID, and a Stripe subscription ID.
7. Confirm Pro features unlock and no longer show upgrade previews.

## Annual upgrade

1. Start from a Free test user or cancel/reset the existing test subscription.
2. Open `/dashboard/billing`.
3. Click `Upgrade Annual`.
4. Complete Stripe Checkout with the test card.
5. Confirm Stripe used the annual Pro price.
6. Confirm the Supabase `subscriptions` row updates to Pro.

## Cancellation

1. Open `/dashboard/billing` as a Pro user.
2. Click `Manage Subscription`.
3. Cancel the subscription in the Stripe Customer Portal.
4. Confirm the portal returns to `/dashboard/billing`.
5. Confirm the webhook updates the Supabase `subscriptions` row to a Free-safe status.
6. Confirm Pro features return to upgrade preview state.

## Entitlement checks

- A Free user should see upgrade previews, not access denied.
- A Pro user should access Velocity Planner and Beast Advisor.
- A canceled, unpaid, incomplete, incomplete-expired, or past-due subscription should fall back to Free access.
- Admin View As should still override database membership: Admin override, then database membership, then default Free.
