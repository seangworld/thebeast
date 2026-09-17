import test from "node:test";
import assert from "node:assert/strict";
import { emptyVaccination, isVaccination, vaccinationDraft, vaccinationDueLabel, vaccinationValues, validateVaccination } from "../src/lib/health/vaccinations";
import type { HealthRecord } from "../src/lib/health/foundation";
const record = (details: HealthRecord['details']): HealthRecord => ({ id: 'r', ownerId: 'o', recordType: 'procedure', title: 'Vaccination', status: 'historical', occurredOn: null, source: null, details, notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });
test('vaccination dates reject impossible, future administration, and inverted next-dose dates', () => {
  const draft = { ...emptyVaccination(), name: 'Example vaccine', receivedOn: '2026-02-30' };
  assert.match(validateVaccination(draft, '2026-09-17')!, /valid dates/);
  draft.receivedOn = '2026-09-18'; assert.match(validateVaccination(draft, '2026-09-17')!, /future/);
  draft.receivedOn = '2026-09-17'; draft.dueOn = '2026-09-16'; draft.dueSource = 'provider';
  assert.match(validateVaccination(draft, '2026-09-17')!, /after/);
});
test('missing dates remain unknown and known due dates require provenance', () => {
  const draft = { ...emptyVaccination(), name: 'Example' };
  assert.equal(validateVaccination(draft, '2026-09-17'), null);
  assert.equal(vaccinationValues(draft).occurred_on, null);
  assert.equal(vaccinationDueLabel('', '2026-09-17'), 'Next dose: unknown');
  draft.dueOn = '2026-10-01'; assert.match(validateVaccination(draft, '2026-09-17')!, /where/);
  draft.dueSource = 'provider'; assert.equal(validateVaccination(draft, '2026-09-17'), null);
});
test('vaccination reminders distinguish recorded past, today, and upcoming dates', () => {
  assert.match(vaccinationDueLabel('2026-09-16', '2026-09-17'), /Past recorded/);
  assert.match(vaccinationDueLabel('2026-09-17', '2026-09-17'), /today/);
  assert.match(vaccinationDueLabel('2026-10-01', '2026-09-17'), /within 30 days/);
  assert.match(vaccinationDueLabel('2027-01-01', '2026-09-17'), /Next recorded/);
});
test('both document extraction and conversation vaccine records are recognized without guessing from free text', () => {
  const extracted = record({ extraction_category: 'vaccination', context: 'Example vaccine', source_excerpt: 'Vaccine: Example vaccine' });
  assert.equal(isVaccination(extracted), true); assert.equal(vaccinationDraft(extracted).name, 'Example vaccine');
  assert.equal(isVaccination(record({ subtype: 'vaccination', vaccinationName: 'Example' })), true);
  assert.equal(isVaccination(record({ context: 'asked about vaccines' })), false);
});
test('editing a vaccination preserves extraction provenance and unknown values', () => {
  const original = record({ extraction_item_id: 'item', beast_document_id: 'doc', source_excerpt: 'source', subtype: 'vaccination' });
  const values = vaccinationValues({ ...emptyVaccination(), name: 'Example', receivedOn: '2026-09-01' }, original);
  assert.equal((values.details as Record<string, unknown>).extraction_item_id, 'item'); assert.equal((values.details as Record<string, unknown>).beast_document_id, 'doc');
  assert.equal(values.occurred_on, '2026-09-01'); assert.equal(values.status, 'historical');
  assert.equal(values.details.dueOn, null);
});
test('generic extracted document dates are not assumed to be vaccination administration dates', () => {
  const extracted = { ...record({ extraction_category: 'vaccination', context: 'Next shot due 2026-10-01' }), occurredOn: '2026-10-01' };
  assert.equal(vaccinationDraft(extracted).receivedOn, '');
  assert.equal(vaccinationDraft(extracted).administrationStatus, 'unknown');
});
