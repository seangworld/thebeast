'use strict';

// Fixed safety ceiling; callers cannot opt back into stack-exhausting trees.
const MAX_DEPTH = 128;
const fail = message => {
  const error = new SyntaxError(message);
  error.code = 'ERR_BRACES_DEPTH';
  throw error;
};

const assertDepth = ast => {
  const pending = [[ast, 0, false]];
  const ancestors = new WeakSet();
  while (pending.length) {
    const [node, depth, exiting] = pending.pop();
    if (exiting) { ancestors.delete(node); continue; }
    if (depth > MAX_DEPTH) fail('Brace AST exceeds safe depth of 128');
    if (ancestors.has(node)) fail('Brace AST must be acyclic');
    ancestors.add(node);
    pending.push([node, depth, true]);
    if (node.nodes) {
      for (const child of node.nodes) pending.push([child, depth + 1, false]);
    }
  }
};
assertDepth.beforePush = stack => {
  // Root occupies depth zero; leave space for a leaf within MAX_DEPTH.
  if (stack.length >= MAX_DEPTH) fail('Brace AST exceeds safe depth of 128');
};
module.exports = assertDepth;
