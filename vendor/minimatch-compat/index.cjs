// API adapter only: every match is performed by patched upstream minimatch 11.
// ESLint 8/plugins and glob 7 expect the historical callable CommonJS export.
const core = require('minimatch-core');
function compatible(api) {
  function match(path, pattern, options) { return api.minimatch(path, pattern, options); }
  Object.assign(match, api);
  // The installed import plugin consumes only makeRe(...).test(path). Upstream
  // 11 deliberately does not generate regexes; retain that safe matching surface.
  match.makeRe = (pattern, options) => {
    const matcher = new api.Minimatch(pattern, options);
    return { test: path => matcher.match(String(path)) };
  };
  match.defaults = options => {
    const defaults = api.minimatch.defaults(options);
    return compatible({ ...api, minimatch: defaults, Minimatch: api.Minimatch.defaults(options),
      filter: defaults.filter, makeRe: defaults.makeRe, match: defaults.match,
      braceExpand: defaults.braceExpand });
  };
  return match;
}
module.exports = compatible(core);
