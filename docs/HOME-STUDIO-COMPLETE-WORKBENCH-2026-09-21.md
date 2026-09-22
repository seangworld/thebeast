# Home Studio workbench release

## Available workflows

- The default workflow is photo upload first, one plain-language request, then Redesign my room. This explicit action is labeled as paid AI usage and sequentially creates a plan and one image. Existing entitlements and server request limits remain in place.
- Advanced options are collapsed by default and load on first expansion: saved projects, measurements, manual plans, budgets, versions, client delivery, full reports and separate image-prompt review.
- The result shows the image and short summary before optional shopping ideas. Photo selection supports click and drag/drop.
- A failed image retains its completed plan; retry with unchanged inputs requests only the image. Explicit request wording takes precedence over default style/room selections.
- Start a manual plan to organize shopping and measured layouts without any provider request.
- Track USD unit prices, quantities, purchased/needed/owned/deferred status, budget balance and missing prices. AI price ranges never enter actual totals. Enter prices inclusive of shipping/tax. Up to 32 shopping items.
- Up to 24 measured furniture, door, or window rectangles, with coordinates, dimensions and 90-degree rotation. Room outline and packet show entered placements. Overlap and room-boundary warnings are geometric aids, not safe-egress or building-code validation.
- Up to five named design snapshots; compare and restore brief, plan, shopping, layout and budget. Successful rebuild automatically retains the prior design. A full history blocks rebuild until a snapshot is removed; failures retain the current design.
- Versioned JSON backup/import, including old backups. Imports normalize untrusted fields, exclude images and IDs, reject invalid measurements/unsupported versions/oversized files, and start a new unsaved project. Client records and snapshots stay private in backups.
- Private project saves persist through existing owner-scoped JSON fields. Controls lock during save/delete. No schema migration.
- Public client intake at `/home-studio/intake` downloads a JSON brief without submitting personal data. Client sends the file through an agreed channel; designer imports it. No outbound messaging was configured or sent.
- Client record tracks scope, fee, due date, delivery stage and manually recorded payment. Printable proposal can link to a Stripe Payment Link or invoice supplied by the designer. No automatic charge, verified payment badge, or automatic fulfillment. Designer verifies the payment in Stripe and delivers the printable design packet through the agreed channel.
- Printable packets contain the current design, shopping prices/status/notes and measured layout. Client administrative fields and historical versions are excluded.

## Affiliate activation — intentionally OFF

Server-only configuration:

- `HOME_STUDIO_AFFILIATES_ENABLED=true` explicitly enables configured entries.
- `HOME_STUDIO_AFFILIATE_LINKS_JSON` is an array of `{ "retailer": "Amazon", "template": "https://www.amazon.com/s?k={query}&tag=YOUR_APPROVED_TAG" }`.

No real affiliate value is included in this release. Do not turn on until Sean supplies approved links. The template may use `{query}` for encoded shopping search terms, or be a fixed approved link. Exact labels: Amazon, IKEA, Wayfair, Walmart, Home Depot, Lowe's. Destinations are restricted to HTTPS retailer hosts (plus Amazon's amzn.to); a supplied network redirect requires deliberate host review before adding support. Invalid/missing config leaves ordinary links in place. Active links receive an adjacent disclosure, individual affiliate label and `rel=sponsored noopener noreferrer`. No affiliate tracking script is installed.

## Limits / external setup

- Source photos and generated images are session-only; download images/packet before closing.
- Save project to persist workbench changes; no silent local storage of client data.
- A Stripe Payment Link or invoice must be created for the agreed service offer before collecting payment. Existing BEAST membership billing remains unchanged.
- Actual signed-in account acceptance requires a BEAST browser session; the available browser was at sign-in. Automated route and UI tests use fixtures, not live member records.

## September 22 simplification verification

- Nine focused UI/flow tests passed, including one-click plan-to-image with no advanced inputs, photo-picker activation, image-only retry, saved-plan revision protections, and simulated save/reopen.
- TypeScript compilation and focused lint passed. Provider responses were mocked; no live AI generation was purchased during verification.
- Affiliate activation remains off. The real signed-in save/reopen acceptance gap remains unchanged.
