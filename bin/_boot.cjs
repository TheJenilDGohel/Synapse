#!/usr/bin/env node

/**
 * Universal boot loader for Synapse CLI.
 *
 * Resolves tsx/esm from the package's own node_modules (not CWD),
 * then launches a target ESM bin script with --import tsx/esm.
 *
 * Cross-platform note: npm creates symlinks on POSIX systems but `.cmd` /
 * `.ps1` shims on Windows. The previous version of this file detected which
 * bin entry was invoked by inspecting `basename(process.argv[1])` against the
 * symlink name — that does not work on Windows because every Windows shim
 * spawns `node bin/_boot.cjs ...`, so the basename is always `_boot`.
 *
 * Solution: this module now exports `runTarget(scriptName, [argv])`. Each bin
 * entry in `package.json` points at its own tiny shim under `bin/<name>.cjs`
 * which calls `runTarget('<scriptName>')` with the right ESM target hard-coded.
 * This works identically on Linux, macOS, and Windows.
 *
 * Direct invocation (`node _boot.cjs <script> [args...]`) is preserved for
 * back-compat / debugging.
 */

'use strict';

const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { resolve, basename } = require('node:path');

const pkgDir = resolve(__dirname, '..');
const req = createRequire(resolve(pkgDir, 'package.json'));

function resolveTsxEsm() {
  try {
    return pathToFileURL(req.resolve('tsx/esm')).href;
  } catch {
    process.stderr.write('[synapse] fatal: tsx not found. Reinstall: npm install -g synapse-mcp\n');
    process.exit(1);
  }
}

/**
 * Launch a target ESM bin script under tsx/esm.
 *
 * @param {string} targetName  filename under `bin/`, e.g. `synapse.js`
 * @param {string[]} [forwardArgs] arguments to forward (defaults to process.argv.slice(2))
 */
function runTarget(targetName, forwardArgs) {
  if (!targetName || typeof targetName !== 'string') {
    process.stderr.write('[synapse] _boot.runTarget: targetName is required\n');
    process.exit(1);
  }
  const tsxEsmPath = resolveTsxEsm();
  const scriptPath = resolve(__dirname, targetName);
  const args = Array.isArray(forwardArgs) ? forwardArgs : process.argv.slice(2);

  const result = spawnSync(
    process.execPath,
    ['--import', tsxEsmPath, scriptPath, ...args],
    { stdio: 'inherit', env: process.env }
  );

  process.exit(result.status ?? 1);
}

module.exports = { runTarget };

// Direct invocation: `node bin/_boot.cjs <script.js> [args...]` (legacy / debug).
// On Windows this is the only thing that gets invoked when launched by an old
// `.cmd` shim that still points at `_boot.cjs` directly — keep it working as a
// graceful fallback so users who upgrade in place don't break mid-flight.
if (require.main === module) {
  const invoked = basename(process.argv[1] || '', '.cjs');

  if (invoked === '_boot') {
    const target = process.argv[2];
    const forwardArgs = process.argv.slice(3);
    if (!target) {
      process.stderr.write('Usage: _boot.cjs <script.js> [args...]\n');
      process.exit(1);
    }
    runTarget(target, forwardArgs);
  } else {
    // Legacy POSIX symlink fallback — only reachable when invoked via a
    // pre-existing symlink whose name maps to a bin script.
    runTarget(invoked + '.js', process.argv.slice(2));
  }
}
