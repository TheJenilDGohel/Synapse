#!/usr/bin/env node

/**
 * Preinstall cleanup — removes blockers that cause errors during global install:
 *   1. Stale npm temp dirs (.loci-<hash>) → ENOTEMPTY on retry
 *   2. Symlinked package entry (from `npm link`) → ENOTDIR because npm tries to
 *      rename the entry to a temp dir and a symlink is not a directory
 *
 * Cross-platform: works on Linux, macOS, and Windows. Earlier versions hard-
 * coded POSIX paths (`path.join('/', ...)`, forward-slash string matching,
 * `URL().pathname` which on Windows returns `/C:/...`) and `npm root -g`
 * which on Windows requires `npm.cmd`. All of those are now platform-aware.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const PKG_NAME = 'loci-mcp';
const isWindows = process.platform === 'win32';
const NPM_BIN = isWindows ? 'npm.cmd' : 'npm';

function getGlobalNodeModulesDir() {
  try {
    const prefix = execSync(`${NPM_BIN} root -g`, { encoding: 'utf8' }).trim();
    if (fs.existsSync(prefix)) return prefix;
  } catch { /* ignore */ }

  // Fallback: derive from process.execPath. nvm puts node under
  // .nvm/versions/node/<version>/bin/node — the lib/node_modules sibling is
  // the global modules dir. Use path.parse so it works with Windows drive
  // letters and back-slashes.
  const segments = process.execPath.split(path.sep);
  const nvmIdx = segments.findIndex((s) => s === 'nvm');
  if (nvmIdx !== -1 && segments.length > nvmIdx + 3) {
    const parsed = path.parse(process.execPath);
    const root = parsed.root; // '/' on POSIX, 'C:\\' on Windows
    const slice = segments.slice(parsed.root === '/' ? 1 : 0, nvmIdx + 3);
    const candidate = path.join(root, ...slice, 'lib', 'node_modules');
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function cleanupStaleTempDirs(nodeModulesDir) {
  if (!fs.existsSync(nodeModulesDir)) return 0;

  const entries = fs.readdirSync(nodeModulesDir);
  const stalePrefix = `.${PKG_NAME}-`;
  let removed = 0;

  for (const entry of entries) {
    if (entry.startsWith(stalePrefix)) {
      const fullPath = path.join(nodeModulesDir, entry);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        removed++;
      } catch {
        // Best-effort — don't block install if cleanup fails
      }
    }
  }

  return removed;
}

function removeSymlinkedPackage(nodeModulesDir) {
  const pkgPath = path.join(nodeModulesDir, PKG_NAME);
  let stat;
  try {
    stat = fs.lstatSync(pkgPath);
  } catch {
    return; // doesn't exist — nothing to do
  }
  if (stat.isSymbolicLink()) {
    try {
      fs.unlinkSync(pkgPath);
    } catch {
      // Best-effort — don't block install if unlink fails
    }
  }
}

// Only run for global installs (npm install -g), NOT during git-dep preparation.
// npm_config_global leaks from the outer npm into the inner prep npm, so also check
// whether we're running inside a temp git-clone dir (pacote's staging area).
const isGlobal = process.env.npm_config_global === 'true';
if (!isGlobal) process.exit(0);

// Use fileURLToPath so the comparison works on Windows (avoids the
// `/C:/...` artefact returned by URL.pathname on Windows).
const selfDir = path.dirname(fileURLToPath(import.meta.url));
const gitDepFragment = path.join('.npm', '_cacache', 'tmp');
const isGitDepPrep = selfDir.includes(gitDepFragment);
if (isGitDepPrep) process.exit(0);

const nodeModulesDir = getGlobalNodeModulesDir();
if (!nodeModulesDir) process.exit(0);

removeSymlinkedPackage(nodeModulesDir);
cleanupStaleTempDirs(nodeModulesDir);
