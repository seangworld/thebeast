# BHM-002 — Photo-to-Home-Inventory V1

BeastHome 1.0.0 gives signed-in adult members a private, room-by-room home inventory.

## Workflow

Room photo → bounded AI suggestions → member review/edit/remove → explicit confirmation → owner-scoped inventory → dated CSV export.

The photo is sent only for the active detection request and is not persisted by this workflow. Images are limited to a verified 3 MB decoded payload. AI suggestions are never saved automatically. Members must confirm names, quantities, details, optional values, and any private receipt link.

## Security and scope

- Three additive tables enforce both `owner_id = auth.uid()` and adult/admin Home entitlement through RLS. Minor, unknown-age, and explicitly disabled member access fails closed at the UI, API, and data boundaries.
- Anonymous access is revoked; authenticated members receive only normal CRUD rights governed by RLS.
- Receipt linkage reuses the existing owner-scoped Beast Documents identity and is editable while confirming each item. Deleting a linked document clears only the optional receipt reference.
- Household sharing, automated claims, valuation guarantees, video scanning, and home automation remain inactive.
- The API is authenticated, private/no-store, file-type bounded, size bounded, and returns no durable image URL.
- Items use the room’s inventory and owner as one composite identity, preventing rooms and items from different inventories from being mixed.
- A contextual, skippable, versioned Home Inventory walkthrough explains photo intake, review, receipt linking, and dated export.

## Outcome window

Evaluate after 30 days using privacy-safe, minimum-cohort aggregate counts for members opening BeastHome, starting an inventory, confirming items, and exporting. These four bounded events are implemented through the existing first-party telemetry contract. They do not collect images, item names, details, values, receipt identities, or raw member identity in aggregate Outcome reporting.
