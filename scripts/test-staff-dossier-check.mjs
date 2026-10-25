import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStaffReceipt,staffSourceDigest,staffCronConfiguration} from './check-staff-dossiers.mjs';
import {readFileSync} from 'node:fs';
test('changed agent source fails closed until dossier source/history receipt is updated',()=>{
 const r=JSON.parse(readFileSync('src/lib/staffDossiers/maintenance.json'));assert.equal(validateStaffReceipt(r,staffSourceDigest()),true);assert.throws(()=>validateStaffReceipt(r,'changed-digest'),/update canonical/);
});
test('incomplete maintenance receipt is rejected; no hidden paid calls',()=>{
 for(const key of ['date','executor','reason','version','evidence','affectedStaffIds']){const r=JSON.parse(readFileSync('src/lib/staffDossiers/maintenance.json'));delete r.changes[0][key];assert.throws(()=>validateStaffReceipt(r,staffSourceDigest()),/requires/);}
});

test('hosted config formatting preserves the dossier digest while a changed cron requires review',()=>{
 const source=readFileSync('vercel.json','utf8'),value=JSON.parse(source);assert.equal(staffCronConfiguration(source),staffCronConfiguration(JSON.stringify(value)));value.crons[1].schedule='0 12 * * *';assert.notEqual(staffCronConfiguration(source),staffCronConfiguration(JSON.stringify(value)));assert.throws(()=>staffCronConfiguration('{}'),/Invalid cron/);
});
