import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),braces=require('braces');
const rejected=fn=>assert.throws(fn,e=>e instanceof SyntaxError&&e.code==='ERR_BRACES_DEPTH'&&!/call stack/i.test(e.message));
for(const method of ['parse','compile','expand','stringify']){
 for(const [open,close] of [['{','}'],['(',')'],['{(',')}']])test(method+' rejects deep '+open+' patterns before recursive overflow',()=>{
  for(const depth of [128,1000,4500]){const pattern=open.repeat(depth)+'x,y'+close.repeat(depth);if(pattern.length<=10000)rejected(()=>braces[method](pattern));}
 });
 test(method+' preserves escaped/quoted bracket text',()=>{
  assert.doesNotThrow(()=>braces[method]('"'+'{'.repeat(4000)+'"'));
  assert.doesNotThrow(()=>braces[method]('['+'{'.repeat(4000)+']'));
  assert.doesNotThrow(()=>braces[method]('\\{'.repeat(4000)));
 });
}
for(const method of ['compile','expand','stringify']){
 test(method+' rejects externally supplied deep and cyclic ASTs',()=>{
  let ast={type:'text',value:'x'};for(let i=0;i<12000;i++)ast={type:'root',nodes:[ast]};rejected(()=>braces[method](ast));
  const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);rejected(()=>braces[method](cycle));
 });
}
test('ordinary expansions, options and preserved input limits',()=>{
 assert.deepEqual(braces.expand('src/{app,components}/**/*.{ts,tsx}'),['src/app/**/*.ts','src/app/**/*.tsx','src/components/**/*.ts','src/components/**/*.tsx']);
 assert.deepEqual(braces.expand('a/{01..03}/{x,y}'),['a/01/x','a/01/y','a/02/x','a/02/y','a/03/x','a/03/y']);
 assert.deepEqual(braces(['{a,b}','{a,b}'],{expand:true,nodupes:true}),['a','b']);
 assert.throws(()=>braces.parse('x'.repeat(10001)),SyntaxError);
 assert.throws(()=>braces.expand('{1..1001}'),RangeError);
 for(const depth of [1,16,64,127])assert.doesNotThrow(()=>braces.compile('{'.repeat(depth)+'x,y'+'}'.repeat(depth)));
 assert.throws(()=>braces.compile('{'.repeat(128)+'x,y'+'}'.repeat(128)),SyntaxError);
 const leaf={type:'text',value:'a'};assert.equal(braces.stringify({type:'root',nodes:[leaf,leaf]}),'aa');
});
test('low-stack subprocess rejects the advisory payload deterministically',()=>{
 const result=spawnSync(process.execPath,['--stack_size=256','-e',`const b=require('braces');for(const method of ['compile','expand','stringify']){try{b[method]('{'.repeat(4500)+'x,y'+'}'.repeat(4500));process.exit(2)}catch(e){if(e.code!=='ERR_BRACES_DEPTH')throw e}}`],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,0,result.stderr);assert.equal(result.error,undefined);
});
test('verification gate rejects modified installed fork code',async()=>{
 const {mkdtempSync,mkdirSync,cpSync,appendFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');
 const fixture=mkdtempSync(join(tmpdir(),'braces-gate-'));
 try{
  mkdirSync(join(fixture,'node_modules'),{recursive:true});
  cpSync('vendor',join(fixture,'vendor'),{recursive:true});
  cpSync('node_modules/braces',join(fixture,'node_modules/braces'),{recursive:true});
  for(const f of ['package.json','package-lock.json'])cpSync(f,join(fixture,f));
  appendFileSync(join(fixture,'node_modules/braces/lib/assert-depth.js'),'\n// tampered fixture\n');
  const result=spawnSync(process.execPath,[resolve('scripts/verify-braces-fork.mjs')],{cwd:fixture,encoding:'utf8',timeout:5000});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Installed fork differs: lib\/assert-depth.js/);
 }finally{rmSync(fixture,{recursive:true,force:true});}
});
