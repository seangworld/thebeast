import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
type Rule={source:string;headers:Array<{key:string;value:string}>};
const config=require(resolve('next.config.js')) as {headers:()=>Promise<Rule[]>};
const directive=(policy:string,name:string)=>policy.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+' '));
test('every App Router entry document permits the same-origin Guide frame before client navigation',async()=>{
 const rules=await config.headers();const global=rules.find(r=>r.source==='/(.*)')!;
 const csp=global.headers.find(h=>h.key==='Content-Security-Policy')!.value;
 assert.equal(directive(csp,'frame-src'),"frame-src 'self'",'a Guide-only route header cannot change an already loaded Applications/PWA document');
 assert.equal(directive(csp,'frame-ancestors'),"frame-ancestors 'none'");
 assert.equal(directive(csp,'object-src'),"object-src 'none'");
 assert.equal(directive(csp,'form-action'),"form-action 'self'");
 assert.equal(global.headers.find(h=>h.key==='X-Frame-Options')?.value,'DENY');
});
test('only the approved same-origin Guide child can be framed and it cannot nest frames',async()=>{
 const rules=await config.headers();const child=rules.find(r=>r.source==='/beastguide-app/:path*')!;
 const csp=child.headers.find(h=>h.key==='Content-Security-Policy')!.value;
 assert.equal(directive(csp,'frame-ancestors'),"frame-ancestors 'self'");
 assert.equal(directive(csp,'frame-src'),"frame-src 'none'");
 assert.equal(child.headers.find(h=>h.key==='X-Frame-Options')?.value,'SAMEORIGIN');
 assert.ok(!directive(csp,'script-src')?.includes('https:'));
});
