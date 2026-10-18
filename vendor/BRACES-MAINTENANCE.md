# Private braces depth-safety fork

This repository owns `@seangworld/braces@3.0.3-beast.1`. It is **not** an upstream release, published registry fork, or claim of upstream support. It is used only by development/build tooling. Owner authorized this scoped local maintenance in Issue #264; implementation is isolated in PR #267.

## Provenance and scope

Base: npm `braces@3.0.3`, MIT, upstream tag commit `483836c3484f6bd0ff6db6e00d1dc35505efda15`. Original LICENSE/attribution retained. Registry tarball integrity, local source/archive hashes and inspiration are recorded in `braces-provenance.json`.

Related upstream proposal: https://github.com/micromatch/braces/pull/88 at `a795ee83ecd011131b2d618fe754ac5a8e124dae` (unmerged). This is a local adaptation, not an upstream endorsement. Other proposals #78/#79/#82/#87 were identified; #87 and #88 diffs were reviewed; no public issue, comment or pull request was submitted by this task. `braces-depth.patch` is the complete runtime-source delta from 3.0.3.

- Parser checks structural stack depth before adding braces **and parentheses**, respecting existing escape, quote and bracket parsing. Root/leaf accounting rejects a group push when stack length is already 128.
- An iterative ancestor/depth preflight protects compile, expand and stringify from externally supplied deep/cyclic child ASTs before recursive traversal. Shared acyclic children remain valid.
- Ceiling: AST edge depth 128; at most 127 parsed nested groups with room for a leaf. Rejection is `SyntaxError`, code `ERR_BRACES_DEPTH`. Caller options cannot disable the ceiling. Existing input-length and expansion-range limits remain.
- All other runtime code is upstream 3.0.3. No utility, Tailwind, Next, lint rule, source glob or app style was migrated.

This corrects the specific recursion-depth failure in GHSA-vfj7-8cjw-p6xm. It does **not** make arbitrary user-supplied globs/regular expressions safe or solve every CPU/memory exhaustion concern. Build configuration and patterns remain trusted repository inputs. Member data must never become build globs.

## Installation and audit coverage

Root devDependency `braces` points to the committed local tarball. The supported npm override reference `$braces` directs all transitive consumers to that reviewed package. Nothing is downloaded from or published to an organization registry. npm lockfile includes the archive integrity and npm ci reproduces installation.

A private fork has no automatic public advisory matching. Therefore **plain npm audit is insufficient to certify it**. `audit:ci` first verifies archive/source/installed hashes and all Tailwind/chokidar/micromatch/Next lint consumer resolutions, runs the security regressions, and then runs the unchanged full registry audit. `build` continues to require `audit:ci && next build`. No advisory exclusion, omit-dev gate, severity waiver, or forged upstream version is used. Deliberately modified installed code is a negative gate test.

## Maintenance and update strategy

Responsibility: The Beast engineering owner; review this fork whenever updating Tailwind, Next lint, glob tooling, or the advisory status. Do not silently repack during installation/build.

1. Obtain exact upstream source/tarball; compare registry integrity and tag. Review any upstream fix and compatibility impact. Do not treat an unmerged PR as a supported release.
2. Keep the runtime delta confined to `braces-depth.patch`. For an approved local correction, bump the explicit `-beast.N` version and update the root file dependency/provenance paths together.
3. Run `node scripts/pack-braces-fork.mjs` manually. Review source diff, archive and generated provenance. `npm install --ignore-scripts` updates the lockfile. Do not merely regenerate hashes to accept an unexplained mismatch.
4. Clean `npm ci`, fork gate/security tests, exact upstream compatibility tests, full audit/prod audit, required build, 2,425 application regressions, TypeScript/lint and relevant desktop/mobile checks must pass. Generated application CSS should remain identical unless separately approved.
5. Prefer removing this fork when a compatible upstream patched release or supported complete parent replacement becomes available. Remove the direct fork devDependency/override and vendor artifacts, install the reviewed release, and rerun the same gates. Keep focused depth regression coverage adapted to the replacement. No automatic remote updates.

## Rollback and contribution

Revert the isolated patch commit(s) and restore prior package/lockfile and audit script together; run npm ci. This restores the previous seven findings and **closes the build gate**. Rollback does not grant release permission or allow disabling audit.

The runtime patch and focused tests could support an upstream contribution if Sean separately authorizes one. Existing upstream proposals already cover the approach; contributing should avoid duplicating them. This task made no public upstream submission. No independent open-source service or long-lived release process has been started.
