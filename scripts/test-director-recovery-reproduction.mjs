// Reproduce the original defect from the evaluated commit, then exercise the fix.
// No model, network, customer data or database modifications.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';
import { advanceDirectorObjective, authorizeDirectorCorrection } from '../.test-dist/src/lib/directorAssignments.js';
const oldText=execFileSync('git',['show','2dccdff:src/lib/directorAssignments.ts'],{encoding:'utf8'});
const filename=resolve('.test-dist/src/lib/directorAssignments.before-improvement.js');
const oldModule=new Module(filename);oldModule.filename=filename;oldModule.paths=Module._nodeModulePaths(resolve('.test-dist/src/lib'));oldModule.require=createRequire(filename);
oldModule._compile(ts.transpileModule(oldText,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const now='2026-10-17T12:00:00Z';
function fixture(){let row={id:'same',owner_id:'synthetic-owner',goal_id:'g',capability:'money.cash-review',status:'running',dependencies:[],attempts:3,revision:2,lease_id:'expired',lease_until:'2000-01-01T00:00:00Z',result:null,events:[{at:'2000-01-01',status:'running',detail:'Retain me'}],blocker:null,updated_at:now};const store={list:async()=>structuredClone([row]),compareAndSwap:async(prev,next)=>{assert.equal(prev.id,row.id);assert.equal(prev.revision,row.revision);row=structuredClone(next);return true}};return {store,access:{authorize:async()=>true,snapshot:async()=>{throw new Error('No private record reads needed')}},ownerId:'synthetic-owner',goalId:'g',now,leaseId:'new',row:()=>row};}
test('old code reproduces exhausted expired lease stuck running and refusing correction',async()=>{
 const f=fixture();assert.equal((await oldModule.exports.advanceDirectorObjective(f)).state,'blocked');assert.equal(f.row().status,'running');
 await assert.rejects(oldModule.exports.authorizeDirectorCorrection({...f,taskId:'same'}),/Resume the active or expired/);
});
test('new code retains same id/history and opens the existing explicit correction path',async()=>{
 const f=fixture();assert.equal((await advanceDirectorObjective(f)).state,'blocked');assert.equal(f.row().status,'blocked');
 assert.equal(await authorizeDirectorCorrection({...f,taskId:'same'}),true);assert.equal(f.row().id,'same');assert.equal(f.row().events[0].detail,'Retain me');assert.equal(f.row().attempts,0);
});
