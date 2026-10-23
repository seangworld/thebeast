import assert from 'node:assert/strict';
import test from 'node:test';
import {z} from 'zod';
import {globalConfigSchema,authConfigSchema} from '@vercel/cli-config';

test('security-only Zod override preserves Vercel config schema compatibility without reading credentials',()=>{
 const config={currentTeam:'synthetic-team',credStorage:'file',telemetry:{enabled:false},guidance:{enabled:true},updates:{auto:false},futureSetting:{preserved:true}};
 assert.deepEqual(globalConfigSchema.parse(config),config);
 assert.equal(globalConfigSchema.safeParse({credStorage:'unexpected'}).success,false);
 assert.equal(authConfigSchema.safeParse({token:'synthetic-not-real',tokenSource:'env',expiresAt:123}).success,true);
 assert.equal(authConfigSchema.safeParse({tokenSource:'invalid'}).success,false);
});
test('oversized constrained collection rejects before accumulating per-element failures',()=>{
 const result=z.array(z.number()).max(2).safeParse(Array(10000).fill('invalid'));
 assert.equal(result.success,false);
 assert.ok(result.error!.issues.length<=2,'oversized collection must fail before allocating thousands of element issues');
});
