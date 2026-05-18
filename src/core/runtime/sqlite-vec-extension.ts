import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as sqliteVec from 'sqlite-vec';

import type { SpawnSyncReturns } from 'node:child_process';

import { NPM_BIN, isWindows } from './platform.js';

type SpawnFn = (command: string, args: string[], options?: object) => SpawnSyncReturns<string>;

export interface SqliteVecFindResult {
  path: string;
  source: string;
}

export interface SqliteVecEnsureResult {
  ok: boolean;
  installed: boolean;
  path: string;
  source: string;
  reason?: string;
}

function getPlatformBinaryNames(platform: string = process.platform): string[] {
  if (platform === 'win32') return ['vec0.dll'];
  if (platform === 'darwin') return ['vec0.dylib'];
  return ['vec0.so'];
}

function splitSearchDirs(value: string | undefined | null): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

function safeReadDir(dirPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function findMatchingBinary(rootDir: string, names: string[], maxDepth: number = 5): string {
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const normalized = path.resolve(current.dir);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    for (const entry of safeReadDir(normalized)) {
      const fullPath = path.join(normalized, entry.name);
      if (entry.isFile() && names.includes(entry.name)) {
        return fullPath;
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return '';
}

function detectGlobalNpmRoot(spawn: SpawnFn = spawnSync as unknown as SpawnFn): string {
  try {
    const result = spawn(NPM_BIN, ['root', '-g'], {
      encoding: 'utf8',
      shell: isWindows
    });
    if (result.status !== 0) return '';
    return String(result.stdout || '').trim();
  } catch {
    return '';
  }
}

export interface FindSqliteVecExtensionPathOptions {
  lociHome?: string;
  env?: Record<string, string | undefined>;
  cwd?: string;
  spawn?: SpawnFn;
  sqliteVecModule?: typeof sqliteVec;
}

export function findSqliteVecExtensionPath({
  lociHome,
  env = process.env as Record<string, string | undefined>,
  cwd = process.cwd(),
  spawn = spawnSync as unknown as SpawnFn,
  sqliteVecModule = sqliteVec
}: FindSqliteVecExtensionPathOptions = {}): SqliteVecFindResult | null {
  // 1. Try official sqlite-vec package first (preferred for stability)
  try {
    const loadablePath = sqliteVecModule.getLoadablePath();
    if (loadablePath && fs.existsSync(loadablePath)) {
      return {
        path: loadablePath,
        source: 'sqlite-vec-package'
      };
    }
  } catch {
    // Fall back to manual discovery if package API fails or is not found
  }

  // 2. Fallback to manual discovery logic
  const binaryNames = getPlatformBinaryNames();
  const globalRoot = detectGlobalNpmRoot(spawn);
  const candidateDirs = [
    ...splitSearchDirs(env.LOCI_SQLITE_VEC_SEARCH_DIRS),
    lociHome ? path.join(path.resolve(lociHome), 'vendor', 'sqlite-vec') : '',
    lociHome ? path.join(path.resolve(lociHome), 'vendor', 'sqlite-vec', 'node_modules', 'sqlite-vec') : '',
    path.join(path.resolve(cwd), 'node_modules', 'sqlite-vec'),
    globalRoot ? path.join(globalRoot, 'sqlite-vec') : ''
  ]
    .filter(Boolean)
    .map((entry) => path.resolve(entry));

  const seen = new Set<string>();
  for (const dirPath of candidateDirs) {
    if (seen.has(dirPath)) continue;
    seen.add(dirPath);
    const found = findMatchingBinary(dirPath, binaryNames);
    if (found) {
      return {
        path: found,
        source: dirPath.includes(`${path.sep}vendor${path.sep}sqlite-vec`)
          ? 'loci-vendor'
          : dirPath.includes(`${path.sep}node_modules${path.sep}sqlite-vec`)
            ? 'node-modules'
            : 'search-dir'
      };
    }
  }

  return null;
}

export interface EnsureSqliteVecExtensionOptions {
  lociHome?: string;
  env?: Record<string, string | undefined>;
  cwd?: string;
  installIfMissing?: boolean;
  spawn?: SpawnFn;
  sqliteVecModule?: typeof sqliteVec;
}

export function ensureSqliteVecExtension({
  lociHome,
  env = process.env as Record<string, string | undefined>,
  cwd = process.cwd(),
  installIfMissing = true,
  spawn = spawnSync as unknown as SpawnFn,
  sqliteVecModule = sqliteVec
}: EnsureSqliteVecExtensionOptions = {}): SqliteVecEnsureResult {
  const existing = findSqliteVecExtensionPath({
    lociHome,
    env,
    cwd,
    spawn,
    sqliteVecModule
  });
  if (existing?.path) {
    return {
      ok: true,
      installed: false,
      path: existing.path,
      source: existing.source
    };
  }

  if (!installIfMissing) {
    return {
      ok: false,
      installed: false,
      path: '',
      source: 'missing',
      reason: 'sqlite-vec extension not found'
    };
  }

  const vendorRoot = path.join(path.resolve(lociHome || path.join(os.homedir(), '.loci')), 'vendor', 'sqlite-vec');
  fs.mkdirSync(vendorRoot, { recursive: true });

  let installResult: SpawnSyncReturns<string>;
  try {
    installResult = spawn(NPM_BIN, ['install', '--no-save', 'sqlite-vec'], {
      cwd: vendorRoot,
      encoding: 'utf8',
      shell: isWindows
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      ok: false,
      installed: false,
      path: '',
      source: 'install-failed',
      reason: err?.message || String(error)
    };
  }

  if (installResult.status !== 0) {
    return {
      ok: false,
      installed: false,
      path: '',
      source: 'install-failed',
      reason: String(installResult.stderr || installResult.stdout || 'sqlite-vec install failed').trim()
    };
  }

  const installed = findSqliteVecExtensionPath({
    lociHome,
    env,
    cwd,
    spawn,
    sqliteVecModule
  });
  if (installed?.path) {
    return {
      ok: true,
      installed: true,
      path: installed.path,
      source: installed.source
    };
  }

  return {
    ok: false,
    installed: true,
    path: '',
    source: 'installed-but-not-detected',
    reason: 'sqlite-vec package installed but vec0 binary was not found'
  };
}
