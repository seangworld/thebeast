import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),mm=require('minimatch');
test('legacy callable API and modern constructors retain lint/glob matching',()=>{
 assert.equal(mm('src/login.tsx','**/*.tsx'),true);
 assert.equal(mm('src/login.ts','**/*.tsx'),false);
 assert.equal(mm('.env','*'),false);assert.equal(mm('.env','*',{dot:true}),true);
 assert.equal(mm.defaults({nocase:true})('LOGIN.TSX','*.tsx'),true);
 assert.deepEqual(['a.ts','b.js'].filter(mm.filter('*.ts')),['a.ts']);
 assert.deepEqual(mm.match(['a.ts','b.js'],'*.ts'),['a.ts']);
 assert.deepEqual(mm.braceExpand('a{b,c}'),['ab','ac']);
 assert.equal(new mm.Minimatch('**/*.tsx').match('src/a.tsx'),true);
 assert.ok(mm.makeRe('*.ts').test('a.ts'));
});
test('patched upstream bounds globpart amplification',()=>{
 const pattern=Array(30).fill('**/../a/b').join('/');
 const matcher=new mm.Minimatch(pattern,{optimizationLevel:2,braceExpandMax:64});
 assert.ok(matcher.set.length<=64);
});
