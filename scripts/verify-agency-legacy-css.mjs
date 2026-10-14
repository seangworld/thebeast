import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import postcss from 'postcss';

// Built-output check: unchanged legacy integration templates keep their utility behavior.
const files = process.argv.slice(2);
const roots = (files.length ? files : readdirSync('.next/static/css').filter(name => name.endsWith('.css')).map(name => `.next/static/css/${name}`))
  .map(name => postcss.parse(readFileSync(name, 'utf8')));
const declarations = utility => {
  const selector = '.' + utility.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`);
  const result = [];
  for (const root of roots) root.walkRules(rule => {
    if (rule.selector.split(',').some(part => part.trim().startsWith(selector) && !/[a-zA-Z0-9_\\-]/.test(part.trim()[selector.length] ?? ' '))) rule.walkDecls(declaration => result.push([declaration.prop, declaration.value]));
  });
  assert.ok(result.length, `Missing generated utility: ${utility}`);
  return result;
};
const equals = (utility, property, value) => {
  const found = declarations(utility).filter(([name]) => name === property).at(-1)?.[1];
  assert.equal(found?.replace('transparent', '#0000').replace(/(?<![0-9])0\./g, '.'), value, `${utility}: ${property}`);
};
equals('break-words', 'overflow-wrap', 'break-word');
equals('focus:outline-none', 'outline', '2px solid #0000');
equals('focus:outline-none', 'outline-offset', '2px');
equals('rounded-[1.5rem]', 'border-radius', '1.5rem');
equals('max-w-[22rem]', 'max-width', '22rem');
equals('max-w-[38rem]', 'max-width', '38rem');
equals('max-h-[30rem]', 'max-height', '30rem');
equals('max-h-[36rem]', 'max-height', '36rem');
equals('aspect-[9/16]', 'aspect-ratio', '9/16');
for (const [utility, percentage] of [['bg-white/[0.03]', '3%'], ['bg-amber-300/[0.04]', '4%'], ['hover:bg-cyan-300/[0.04]', '4%']]) {
  assert.ok(declarations(utility).some(([property, value]) => property === 'background-color' && (value.includes(percentage) || /#[0-9a-f]{8}/i.test(value))), utility);
}
equals('rounded', 'border-radius', '.25rem');
equals('rounded-sm', 'border-radius', '.125rem');
equals('flex-shrink-0', 'flex-shrink', '0');
equals('backdrop-blur', '--tw-backdrop-blur', 'blur(8px)');
assert.ok(declarations('shadow-sm').some(([property, value]) => property === '--tw-shadow' && /0 1px 2px/.test(value)), 'Original small shadow geometry');
for (const [utility, direction] of [['bg-gradient-to-r', 'right'], ['bg-gradient-to-b', 'bottom'], ['bg-gradient-to-t', 'top'], ['bg-gradient-to-br', 'bottom right']]) {
  const positions = declarations(utility).filter(([property]) => property === '--tw-gradient-position').map(([, value]) => value);
  assert.ok(positions.at(-1).includes('srgb'), `${utility}: final interpolation preserves sRGB`);
  assert.ok(positions.at(-1).includes(direction), `${utility}: direction`);
}
equals('focus-visible:outline', 'outline-style', 'solid');
assert.ok(roots.some(root => root.toString().includes('textarea:focus')), 'Textarea focus target remains on the descendant');
assert.ok(declarations('[&_textarea]:focus:ring-0').some(([property, value]) => property === '--tw-ring-shadow' && value.includes('0px')), 'Textarea focus ring reset');
for (const utility of ['!gap-4', '!p-3', 'sm:!p-4']) {
  const selector = '.' + utility.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`);
  let important = false;
  for (const root of roots) root.walkRules(rule => {
    if (rule.selector.split(',').some(part => part.trim().startsWith(selector) && !/[a-zA-Z0-9_\\-]/.test(part.trim()[selector.length] ?? ' '))) rule.walkDecls(declaration => { if (declaration.important) important = true; });
  });
  assert.ok(important, `${utility}: important modifier`);
}
let responsive = false;
for (const root of roots) root.walkAtRules('media', rule => {
  if (rule.params.includes('40rem')) rule.walkRules(child => { if (child.selector.includes('.sm\\:\\!p-4')) responsive = true; });
});
assert.ok(responsive, 'Small-screen responsive padding remains inside its media query');
console.log('PASS: 27 compiled legacy utility and responsive compatibility checks');
