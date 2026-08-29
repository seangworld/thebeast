# BHM-002 — Photo-to-Home-Inventory V1

BeastHome 1.0.0 gives signed-in adult members a private, room-by-room home inventory.

## Workflow

Room photo → bounded AI suggestions → member review/edit/remove → explicit confirmation → owner-scoped inventory → dated CSV export.

The photo is sent only for the active detection request and is not persisted by this workflow. AI suggestions are never saved automatically. Members must confirm names, quantities, details, and optional values.

## Security and scope

- Three additive tables enforce `owner_id = auth.uid()` through RLS.
- Anonymous access is revoked; authenticated members receive only normal CRUD rights governed by RLS.
- Receipt linkage reuses the existing owner-scoped Beast Documents identity.
- Household sharing, automated claims, valuation guarantees, video scanning, and home automation remain inactive.
- The API is authenticated, private/no-store, file-type bounded, size bounded, and returns no durable image URL.

## Outcome window

Evaluate after 30 days using privacy-safe aggregate counts for members opening BeastHome, starting an inventory, confirming items, and exporting. Do not collect images, item names, details, values, or member identity in aggregate Outcome reporting.
