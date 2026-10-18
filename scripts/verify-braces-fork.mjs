// Complement npm's registry audit with fail-closed checks for this private local fork.
import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),meta=JSON.parse(readFileSync('vendor/braces-provenance.json'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const root=JSON.parse(readFileSync('package.json'));
assert.equal(root.overrides.braces,'$braces');
assert.equal(root.devDependencies.braces,'file:'+meta.tarball);
assert.equal(hash(meta.tarball),meta.tarballSha256,'Fork archive changed; review patch and provenance');
for(const [file,expected] of Object.entries(meta.files)){
 assert.equal(hash('vendor/braces/'+file),expected,'Vendored source changed: '+file);
 assert.equal(hash('node_modules/braces/'+file),expected,'Installed fork differs: '+file);
}
const installed=JSON.parse(readFileSync('node_modules/braces/package.json'));
assert.equal(installed.name,meta.fork.name);assert.equal(installed.version,meta.fork.version);assert.equal(installed.private,true);
const lock=JSON.parse(readFileSync('package-lock.json'));
for(const [location,pkg] of Object.entries(lock.packages))if(location.endsWith('/braces')){
 assert.equal(location,'node_modules/braces','Unexpected second braces copy');
 assert.equal(pkg.name,meta.fork.name);assert.equal(pkg.version,meta.fork.version);
}
const from=name=>createRequire(require.resolve(name));
const tailwind=from('tailwindcss'),plugin=from('@next/eslint-plugin-next');
const chokidar=createRequire(tailwind.resolve('chokidar'));
const directMicro=createRequire(tailwind.resolve('micromatch'));
const twGlob=createRequire(tailwind.resolve('fast-glob'));
const lintGlob=createRequire(plugin.resolve('fast-glob'));
const twMicro=createRequire(twGlob.resolve('micromatch'));
const lintMicro=createRequire(lintGlob.resolve('micromatch'));
for(const consumer of [chokidar,directMicro,twMicro,lintMicro])assert.equal(realpathSync(consumer.resolve('braces')),realpathSync(resolve('node_modules/braces/index.js')),'Unpatched consumer path');
console.log('PASS private braces fork: archive/source/installed hashes and all four consumer paths verified; npm registry audit remains required.');
