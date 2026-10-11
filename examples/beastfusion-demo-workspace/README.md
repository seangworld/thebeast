# BeastFusion — safe demo workspace
This is a **small, fictional software project** intended for recording an authentic product walkthrough. It contains no customer data, credentials, external APIs, accounts, payments, or AI calls.

## Setup
Requirements: Node.js 20 or later.

```bash
cd examples/beastfusion-demo-workspace
npm test
```

The initial test suite intentionally has **one failing boundary case**. The example order subtotal is $50.00, which should qualify for free shipping, but the implementation currently requires more than $50.00. This is intentional demo data, not a defect in the BeastFusion product.

## Demonstration assignment
> In this demo-only shipping function, fix the free-shipping threshold so exactly 5000 cents is eligible while orders below the threshold still pay 599 cents. Maintain strict input validation. Modify only the sample shipping function; do not touch application or deployment code. Run `npm test`, report the test outcomes and any unresolved risks, and present the change for independent review. Do **not** deploy or connect production services.

The expected human-reviewed code change is `orderSubtotalCents > 5000` to `orderSubtotalCents >= 5000`; do not fake an AI agent making that change. For marketing footage, **only** show actual agent output if a real demo execution is run with owner-approved provider cost. Otherwise show the input and explicitly label the segment a *guided tour, not a completed task execution*.

## Demo recording guardrails
- Use a throwaway clone or branch of the sample. Never use the production BeastFusion repository as the live demo workspace.
- The fixture alone is not evidence that a BeastFusion agent performed or reviewed the change.
- Do not put personal account credentials, payment data, or real API keys on screen.
- Capture the actual BeastFusion UI for setup, bounded task, review and approval screens. Skip any screen not present in the released customer runtime.
- Never publish product claims about independent reviews, saved time, or results unless the recording shows the actual evidence.
- Capture both the initially failing test and the actual result after the task only if it has genuinely been executed. Preserve raw results for verification.
- External publication requires owner approval; don't automatically send or post.
