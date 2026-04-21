---
status: investigating
trigger: "npm install -g git+https://github.com/wmt-mobile/synapse.git#release/0.3.0 fails with TAR_ENTRY_ERRORS from onnxruntime-web, onnxruntime-node, and sharp"
created: 2026-04-14T00:00:00Z
updated: 2026-04-14T00:00:00Z
---

## Current Focus

hypothesis: npm git dep flow has a distinct issue from local tgz install. Shrinkwrap removal fixed local tgz but git+https:// still fails. The git flow clones repo, runs npm install --force, then npm pack, then extracts tarball to global. The TAR corruption occurs during this multi-step process, possibly due to onnxruntime-web's 800+ files causing race conditions in npm's internal tar extraction or the prepare/prepack scripts interacting badly with npm's git dep pipeline.
test: Research npm git dep flow internals, examine package.json scripts for prepare/prepack hooks, test with --foreground-scripts and verbose logging
expecting: identify which step in the git dep pipeline causes the corruption
next_action: research npm git dep flow, examine prepare scripts, check bundleDependencies approach

## Symptoms

expected: npm install -g git+https://github.com/wmt-mobile/synapse.git#release/0.3.0 completes successfully
actual: Install fails with hundreds of TAR_ENTRY_ERRORS for onnxruntime-web, onnxruntime-node, sharp subdirectories
errors: ENOENT lstat lib/, ENOENT open dist/ort.bundle.min.mjs, Cannot cd into synapse, tarball data seems corrupted (null)
reproduction: clean state + clean cache + npm install -g git+... = fails every time
started: when @huggingface/transformers@4.0.1 was added as dependency

## Eliminated

- hypothesis: stale symlinks from npm link cause ENOTDIR
  evidence: preinstall-cleanup.mjs fixed symlink issue but TAR errors persist
  timestamp: prior investigation

- hypothesis: moving @huggingface/transformers to optionalDependencies fixes it
  evidence: TAR corruption of main synapse dir blocks everything regardless
  timestamp: prior investigation

- hypothesis: removing onnxruntime from node_modules before pack fixes it
  evidence: prepack-cleanup.mjs eliminated onnxruntime-node TAR errors but onnxruntime-web errors still appear because npm re-installs from registry after extraction
  timestamp: prior investigation

## Evidence

- timestamp: prior
  checked: standalone install of onnxruntime-node and onnxruntime-web
  found: both install perfectly in isolation in fresh directories
  implication: the issue is specific to npm's git dependency preparation/extraction flow, not the packages themselves

- timestamp: prior
  checked: prepack-cleanup approach
  found: removing deps before pack helps for some but npm re-fetches them during install phase
  implication: the problem occurs during npm's post-extraction dependency installation, not just during initial tar extraction

- timestamp: 2026-04-14
  checked: npm-shrinkwrap.json content analysis
  found: shrinkwrap is at version 0.1.0 with 466 packages. Root deps list @huggingface/transformers but NO resolved entry exists for it or onnxruntime-node/web/sharp. 192 "prod" packages include stale entries like express, hono, body-parser, protobufjs that are NOT current deps.
  implication: npm's dependency resolver receives conflicting information -- package.json says install @huggingface/transformers but shrinkwrap doesn't have its resolution tree. This is the root cause of TAR_ENTRY_ERRORS.

- timestamp: 2026-04-14
  checked: git history of npm-shrinkwrap.json
  found: commit 1641455 deliberately stripped @huggingface/transformers from shrinkwrap. Commit 4ad8692 added HF back to package.json but did NOT update shrinkwrap. Shrinkwrap is now out of sync.
  implication: the fix attempt created the exact mismatch causing the issue

- timestamp: 2026-04-14
  checked: npm pack --dry-run
  found: npm-shrinkwrap.json (214.5kB) is included in the pack tarball via the "files" field
  implication: the stale shrinkwrap ships with every git install and poisons dependency resolution at the consumer side

- timestamp: 2026-04-14
  checked: npm docs on shrinkwrap behavior
  found: "npm-shrinkwrap.json may be included when publishing a package" and "any future installation will base its work off this file, instead of recalculating dependency versions off package.json"
  implication: confirms shrinkwrap is authoritative -- stale shrinkwrap overrides correct package.json

## Resolution

root_cause: npm-shrinkwrap.json is stale (version 0.1.0, 466 packages). It declares @huggingface/transformers in root deps but has NO resolved entry for it or its subdeps (onnxruntime-node, onnxruntime-web, sharp). When npm installs from git, the shrinkwrap is shipped in the tarball and used as authoritative for dep resolution. The mismatch between shrinkwrap (missing HF tree) and package.json (declaring HF) causes npm to fail during concurrent dep resolution, manifesting as TAR_ENTRY_ERRORS. The shrinkwrap also contains 192 stale prod entries (express, hono, protobufjs, etc.) that are NOT actual deps anymore.
fix: Remove npm-shrinkwrap.json from the repository and from the files array in package.json. Let npm resolve dependencies dynamically from package.json. This is the correct approach for a git-installed package because: (1) shrinkwrap locks transitive dep versions which is problematic when onnxruntime/sharp release platform-specific fixes, (2) git installs already do npm install + prepare which resolves from package.json, (3) npm docs discourage shrinkwrap for libraries/tools that have transitive deps needing flexibility.
verification: Self-verified via npm pack (tarball no longer includes shrinkwrap, 277KB vs 330KB) and npm install -g ./synapse-0.3.0-beta.1.tgz (222 packages installed with zero errors, onnxruntime-web/node/common/sharp/@huggingface/transformers all present and directories intact). Awaiting human verification with actual git+https:// install after commit+push.
files_changed: [package.json, npm-shrinkwrap.json (deleted)]
