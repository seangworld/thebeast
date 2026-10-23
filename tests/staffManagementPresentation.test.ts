import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {staffDossiers,getStaffDossier} from '../src/lib/staffDossiers';
import {staffGroups,currentLevelLabel,targetLevelLabel,releasedLevelLabel,formatStaffDate} from '../src/lib/staffDossiers/presentation';

test('separate record counts never equate the whole inventory with operational staff',()=>{
 const counts=Object.fromEntries(staffGroups.map(g=>[g.kind,staffDossiers.filter(d=>d.recordKind===g.kind).length]));
 assert.deepEqual(counts,{staff:11,planned:3,system:12,external:3});
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),staffDossiers.length);
 assert.equal(getStaffDossier('product_specialist'),undefined);
 assert.equal(getStaffDossier('support.codex')!.recordKind,'external');assert.equal(getStaffDossier('news.source-scout')!.recordKind,'system');
});
test('historical levels and excluded roles remain distinct; target and evaluation dates are explicit',()=>{
 assert.equal(currentLevelLabel(getStaffDossier('tutor')!),'L2');
 assert.equal(currentLevelLabel(getStaffDossier('agency.cole-mercer')!),'Not graded');
 assert.equal(currentLevelLabel(getStaffDossier('money-coach')!),'L3');
 assert.equal(targetLevelLabel(getStaffDossier('tutor')!),'L3');
 assert.equal(formatStaffDate(getStaffDossier('fusion-director')!.lastEvaluatedAt),'10/18/2026');
 assert.equal(formatStaffDate('2026-08-30T00:00:00Z'),'08/30/2026');assert.equal(formatStaffDate(null),'Not yet evaluated');
});
test('owner view is concise while underlying technical records and authorization remain',()=>{
 const roster=readFileSync('src/app/dashboard/operations/staff/StaffRoster.tsx','utf8');assert.match(roster,/Useful capabilities \/ limits/);assert.match(roster,/Current \/ Target/);assert.match(roster,/Last evaluated/);assert.doesNotMatch(roster,/MetricTile|rounded-xl|competency dimension/i);
 const page=readFileSync('src/app/dashboard/operations/staff/page.tsx','utf8');assert.match(page,/title="Staff Management"/);assert.doesNotMatch(page,/deferred\.map|staffDossiers\.flatMap|<aside/);assert.match(page,/showGuidance=\{false\}/);assert.match(page,/requireStaffDossierOwner/);
 const detail=readFileSync('src/app/dashboard/operations/staff/StaffDossierDetail.tsx','utf8');for(const title of ['Job & current assignment','Assessment & competency','Known limitations','Development plan','Recent changes'])assert.ok(detail.includes(title));assert.match(detail,/<details id="supporting-records"/);assert.match(detail,/Last evaluated:/);assert.match(detail,/Dossier updated:/);assert.match(detail,/StaffSupportingRecords/);
 const support=readFileSync('src/app/dashboard/operations/staff/StaffSupportingRecords.tsx','utf8');for(const preserved of ['Cost evidence','Release history','Audit & change history','Tools, data & authority','d.assessments'])assert.ok(support.includes(preserved));
});

test('documentation release history cannot imply competency for a planned policy record',()=>{
 const specialist={...getStaffDossier('agency.cole-mercer')!,releases:[{date:'2026-10-22',version:'Documentation-only fixture',summary:'No competency certification',url:'https://github.com/seangworld/thebeast/issues/274'}]};
 assert.ok(specialist.releases.length>0);
 assert.equal(releasedLevelLabel(specialist),'Not graded');
 assert.equal(specialist.lifecycle,'planned');
 assert.equal(specialist.released,null);
 assert.equal(releasedLevelLabel(getStaffDossier('reviewer-agent')!),'No competency certification');
});
