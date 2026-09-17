import test from 'node:test';
import assert from 'node:assert/strict';
import { vaccinationReminders, vaccinationCalendar } from '../src/lib/health/vaccinationReminders';
import type { HealthRecord } from '../src/lib/health/foundation';
const record=(id:string,date:string,status:HealthRecord['status']='historical'):HealthRecord=>({id,ownerId:'owner',recordType:'procedure',title:'Private vaccine name',status,occurredOn:'2026-01-01',source:'Private clinic',notes:'Private notes',createdAt:'2026-01-01',updatedAt:'2026-01-01',details:{subtype:'vaccination',dueOn:date,dueSource:'provider'}});
test('reminders include past, today and thirty-day dates, excluding unknown, invalid, distant and archived dates',()=>{
 const results=vaccinationReminders([record('past','2026-09-01'),record('today','2026-09-17'),record('edge','2026-10-17'),record('distant','2026-10-18'),record('invalid','2026-02-30'),record('unknown',''),record('archived','2026-09-17','archived')],'2026-09-17');
 assert.deepEqual(results.map(r=>[r.id,r.state]),[['past','past'],['today','today'],['edge','upcoming']]);
});
test('calendar reminders preserve local date across year rollover and contain two display alarms',()=>{
 const calendar=vaccinationCalendar(record('record-1','2026-12-31'),new Date('2026-09-17T12:00:00Z'));
 assert.match(calendar,/DTSTART;VALUE=DATE:20261231\r\n/); assert.match(calendar,/DTEND;VALUE=DATE:20270101\r\n/);
 assert.equal(calendar.match(/BEGIN:VALARM/g)?.length,2); assert.match(calendar,/TRIGGER:-P7D/);assert.match(calendar,/TRIGGER:PT0S/);
 assert.match(calendar,/DTSTAMP:20260917T120000Z/); assert.match(calendar,/CLASS:PRIVATE/);
 assert.doesNotMatch(calendar,/Private vaccine name|Private clinic|Private notes|owner/);
 assert.ok(calendar.split('\r\n').every(line=>line.length<=75));
});
test('calendar export rejects unavailable dates and archived records instead of guessing',()=>{
 assert.throws(()=>vaccinationCalendar(record('x','')));
 assert.throws(()=>vaccinationCalendar(record('x','2026-02-30')));
 assert.throws(()=>vaccinationCalendar(record('x','2026-10-01','archived')));
});
