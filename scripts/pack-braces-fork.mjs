// Manual maintenance command: review source diff first; never runs during install/build.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const meta=JSON.parse(readFileSync('vendor/braces-provenance.json'));
const files=['package.json','LICENSE','index.js',...readdirSync('vendor/braces/lib').map(f=>'lib/'+f)].sort();
const pack=JSON.parse(execFileSync('npm',['pack','./vendor/braces','--pack-destination','./vendor','--ignore-scripts','--json'],{encoding:'utf8'}))[0];
if('vendor/'+pack.filename!==meta.tarball)throw Error('Update reviewed fork version/provenance together');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
meta.files=Object.fromEntries(files.map(f=>[f,hash('vendor/braces/'+f)]));
meta.tarballSha256=hash(meta.tarball);
writeFileSync('vendor/braces-provenance.json',JSON.stringify(meta,null,2)+'\n');
console.log('Packed private local fork; review archive/provenance diff and update lockfile before verification.');
