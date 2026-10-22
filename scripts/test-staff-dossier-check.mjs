import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStaffReceipt,staffSourceDigest} from './check-staff-dossiers.mjs';
import {readFileSync} from 'node:fs';
test('changed agent source fails closed until dossier source/history receipt is updated',()=>{
 const r=JSON.parse(readFileSync('src/lib/staffDossiers/maintenance.json'));assert.equal(validateStaffReceipt(r,staffSourceDigest()),true);assert.throws(()=>validateStaffReceipt(r,'changed-digest'),/update canonical/);
});
test('incomplete maintenance receipt is rejected; no hidden paid calls',()=>{
 for(const key of ['date','executor','reason','version','evidence','affectedStaffIds']){const r=JSON.parse(readFileSync('src/lib/staffDossiers/maintenance.json'));delete r.changes[0][key];assert.throws(()=>validateStaffReceipt(r,r.changes[0].sourceDigest),/requires/);}
});
