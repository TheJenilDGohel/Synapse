import fs from 'node:fs';
import path from 'node:path';

/**
 * Cross-platform shim helpers for spawning external binaries.
 *
 * Why this exists:
 * - On Windows, Node's `child_process.spawn` does NOT auto-resolve PATHEXT
 *   like the shell does, so `spawnSync('rg', [...])` fails with ENOENT even
 *   when `rg.exe` is on PATH. We have to ask for the `.exe` (or `.cmd`)
 *   variant explicitly.
 * - npm-installed CLIs (`npm`, `npx`, `synapse`) ship as `.cmd` shims on
 *   Windows. Same problem, same solution.
 *
 * Centralizing this here keeps the platform check in one place instead of
 * sprinkling `process.platform === 'win32'` ternaries across every spawn site.
 */

export const isWindows = process.platform === 'win32';

/** ripgrep binary name — `rg.exe` on Windows, `rg` everywhere else. */
const RG_BASE = isWindows ? 'rg.exe' : 'rg';

/**
 * Resolve the absolute path to the ripgrep binary.
 * 1. Checks system PATH (standard 'rg').
 * 2. Checks local node_modules/.bin (if ripgrep-bin is installed).
 * 3. Checks global node_modules/.bin fallback.
 */
export function resolveRgBin(): string {
  // 1. Try system path first
  try {
    const res = require('node:child_process').spawnSync(RG_BASE, ['--version'], { stdio: 'ignore', shell: isWindows });
    if (res.status === 0) return RG_BASE;
  } catch { /* ignore */ }

  // 2. Try to find it in node_modules (if ripgrep-bin is present)
  try {
    // This file is at <root>/src/core/runtime/platform.ts
    // node_modules is at <root>/node_modules
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const pkgRoot = path.resolve(__dirname, '..', '..', '..');
    const localRg = path.join(pkgRoot, 'node_modules', '.bin', RG_BASE);
    if (fs.existsSync(localRg)) return localRg;
  } catch { /* ignore */ }

  return RG_BASE;
}

export const RG_BIN = resolveRgBin();

/** npm binary — `npm.cmd` on Windows. */
export const NPM_BIN = isWindows ? 'npm.cmd' : 'npm';

/** npx binary — `npx.cmd` on Windows. */
export const NPX_BIN = isWindows ? 'npx.cmd' : 'npx';

/** Local `synapse` CLI — `synapse.cmd` on Windows. */
export const SYNAPSE_BIN = isWindows ? 'synapse.cmd' : 'synapse';

/**
 * Generic helper for any tool that uses the same name+`.cmd` convention
 * (most npm-installed CLIs do).
 */
export function platformBin(name: string, winSuffix = '.cmd'): string {
  return isWindows ? `${name}${winSuffix}` : name;
}

/** Case-insensitive path equality check on Windows. */
export function equalPaths(a: string, b: string): boolean {
  if (isWindows) return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

/** Case-insensitive string matching for paths on Windows. */
export function isPathInside(parent: string, child: string): boolean {
  const p = isWindows ? parent.toLowerCase() : parent;
  const c = isWindows ? child.toLowerCase() : child;
  return c === p || (!c.startsWith('..') && c.startsWith(p + (isWindows ? '\\' : '/')));
}

/** Get canonical casing for a path on disk. */
export function canonicalizePath(p: string): string {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}
