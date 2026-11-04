import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const meta=JSON.parse(readFileSync('vendor/minimatch-compat-provenance.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(hash(meta.tarball),meta.tarballSha256);
for(const [file,digest] of Object.entries(meta.files)){
 assert.equal(hash('vendor/minimatch-compat/'+file),digest);
 assert.equal(hash('node_modules/minimatch/'+file),digest);
}
const pkg=JSON.parse(readFileSync('package.json'));
assert.equal(pkg.overrides.minimatch,'$minimatch');
assert.equal(pkg.devDependencies.minimatch,'file:'+meta.tarball);
const core=require('minimatch-core/package.json');assert.equal(core.name,'minimatch');assert.equal(core.version,'11.0.1');
const lock=JSON.parse(readFileSync('package-lock.json'));
for(const [path,p] of Object.entries(lock.packages)){
 if(path.endsWith('/minimatch')){assert.equal(path,'node_modules/minimatch');assert.equal(p.name,'@seangworld/minimatch-compat');}
 if(p.name==='minimatch')assert.equal(p.version,'11.0.1');
}
for(const name of ['eslint','@eslint/eslintrc','@typescript-eslint/typescript-estree','eslint-plugin-react','eslint-plugin-import','eslint-plugin-jsx-a11y','glob']){
 const from=createRequire(require.resolve(name));assert.equal(realpathSync(from.resolve('minimatch')),realpathSync(require.resolve('minimatch')),name+' has a different matcher');
}
console.log('PASS matcher adapter/source/archive and consumer paths; patched upstream 11.0.1; registry audit remains required.');
