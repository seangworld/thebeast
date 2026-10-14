import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('Agency release keeps the complete dependency audit in the production build gate', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['audit:ci'], 'npm audit');
  assert.match(pkg.scripts.build, /^npm run audit:ci && next build$/);
  assert.equal(pkg.overrides['@next/eslint-plugin-next']['fast-glob'], 'npm:tinyglobby@0.2.17');
});

test('Next lint root-directory adapter retains supported directory glob behavior', () => {
  const { createRequire } = require('node:module');
  const nextRequire = createRequire(require.resolve('@next/eslint-plugin-next'));
  const glob = nextRequire('fast-glob');
  const root = mkdtempSync(join(tmpdir(), 'agency-glob-fixture-'));
  try {
    mkdirSync(join(root, 'apps', 'one'), {recursive:true});
    mkdirSync(join(root, 'apps', 'two'), {recursive:true});
    // The Next rule passes each result to path.join and fs.existsSync.
    // tinyglobby returns relative directory paths; normalize their equivalent destinations.
    const result = glob.globSync(`${root}/apps/*`, {onlyDirectories:true}).map((path: string) => resolve(path)).sort();
    assert.deepEqual(result, [join(root, 'apps', 'one'), join(root, 'apps', 'two')]);
    assert.deepEqual(glob.globSync(`${root}/missing/*`, {onlyDirectories:true}), []);
  } finally { rmSync(root, {recursive:true, force:true}); }
});

test('Tailwind migration preserves module-local variables and utility precedence', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  assert.match(css, /@theme inline\s*\{/);
  assert.match(css, /@utility break-words\s*\{\s*overflow-wrap: break-word;/);
  assert.match(css, /@layer utilities\s*\{/);
  assert.match(css, /outline: 2px solid transparent;\s*outline-offset: 2px;/);
  assert.match(css, /@layer components\s*\{\s*:root/);
  assert.match(css, /--color-beast-accent: var\(--beast-accent\)/);
  assert.doesNotMatch(css, /@tailwind (base|components|utilities)/);
  const postcss = readFileSync('postcss.config.js', 'utf8');
  assert.match(postcss, /@tailwindcss\/postcss/);
});

test('Private license and customer pages stay dynamic without relaxing authentication', () => {
  const license = readFileSync('src/app/admin/beastfusion-licenses/page.tsx','utf8');
  assert.match(license, /export const dynamic = "force-dynamic"/);
  assert.match(license, /auth\.getUser\(\)/);
  assert.match(license, /profile\?\.role!=="admin"\)notFound\(\)/);
  assert.match(readFileSync('src/app/beastfusion/customer/page.tsx','utf8'), /export const dynamic = "force-dynamic"/);
});
