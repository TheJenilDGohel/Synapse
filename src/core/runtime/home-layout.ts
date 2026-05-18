import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface LociPaths {
  home: string;
  dirs: {
    config: string;
    data: string;
    cache: string;
    backups: string;
    vendor: string;
    sqliteVecVendor: string;
  };
  configPath: string;
  legacyConfigPath: string;
  legacyCompatConfigPath: string;
  snippetPath: string;
  legacySnippetPath: string;
  sqliteDbPath: string;
  legacySqliteDbPath: string;
  jsonIndexPath: string;
  legacyJsonIndexPath: string;
  memoryDbPath: string;
  legacyMemoryDbPath: string;
  updateStatusPath: string;
  legacyUpdateStatusPath: string;
}

export interface CacheAttempt {
  path: string;
  source: string;
  code: string | null;
  message: string;
}

export interface WritableModelCacheResult {
  path: string;
  preferredPath: string;
  selectedSource: string;
  writable: boolean;
  fallbackUsed: boolean;
  attemptedPaths: CacheAttempt[];
  preferredFailure: CacheAttempt | null;
}

export interface MigrationResult {
  changed: boolean;
  paths: LociPaths;
}

export function resolveLociHome(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): string {
  return path.resolve(env.LOCI_HOME || path.join(os.homedir(), '.loci'));
}

export function buildLociPaths(lociHome: string): LociPaths {
  const home = path.resolve(lociHome);
  const configDir = path.join(home, 'config');
  const dataDir = path.join(home, 'data');
  const cacheDir = path.join(home, 'cache');
  const backupsDir = path.join(home, 'backups');
  const vendorDir = path.join(home, 'vendor');

  return {
    home,
    dirs: {
      config: configDir,
      data: dataDir,
      cache: cacheDir,
      backups: backupsDir,
      vendor: vendorDir,
      sqliteVecVendor: path.join(vendorDir, 'sqlite-vec')
    },
    configPath: path.join(configDir, 'loci.config.json'),
    legacyConfigPath: path.join(home, 'loci.config.json'),
    legacyCompatConfigPath: path.join(home, 'config.json'),
    snippetPath: path.join(configDir, 'mcp.loci.json'),
    legacySnippetPath: path.join(home, 'mcp.loci.json'),
    sqliteDbPath: path.join(dataDir, 'loci.db'),
    legacySqliteDbPath: path.join(home, 'loci.db'),
    jsonIndexPath: path.join(dataDir, 'loci.index.json'),
    legacyJsonIndexPath: path.join(home, 'loci.index.json'),
    memoryDbPath: path.join(dataDir, 'loci.memory.db'),
    legacyMemoryDbPath: path.join(home, 'loci.memory.db'),
    updateStatusPath: path.join(cacheDir, 'update-status.json'),
    legacyUpdateStatusPath: path.join(home, 'update-status.json')
  };
}

function sanitizeOwnerToken(input: unknown): string {
  return String(input || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'user';
}

function writeProbeFile(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
  const probe = path.join(dirPath, `.loci-cache-probe-${process.pid}-${Date.now()}`);
  fs.writeFileSync(probe, 'ok', 'utf8');
  fs.rmSync(probe, { force: true });
}

export interface ResolveWritableModelCacheDirOptions {
  preferredDir?: string;
  lociHome?: string;
  env?: Record<string, string | undefined>;
}

export function resolveWritableModelCacheDir(
  { preferredDir, lociHome, env = process.env as Record<string, string | undefined> }: ResolveWritableModelCacheDirOptions = {}
): WritableModelCacheResult {
  const preferred = path.resolve(preferredDir || path.join(resolveLociHome(env), 'cache'));
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const owner = Number.isInteger(uid) ? `uid-${uid}` : sanitizeOwnerToken(env.USER || env.USERNAME || 'user');
  const fallbackBase = path.join(os.tmpdir(), `loci-models-${owner}`);
  const fallbackShared = path.join(os.tmpdir(), 'loci-models');
  const candidateEntries: Array<{ path: string; source: string } | null> = [
    { path: preferred, source: 'preferred' },
    lociHome ? { path: path.join(path.resolve(lociHome), 'cache'), source: 'loci-home' } : null,
    { path: fallbackBase, source: 'tmp-user' },
    { path: fallbackShared, source: 'tmp-shared' }
  ];
  const filteredEntries = candidateEntries.filter(
    (entry): entry is { path: string; source: string } => entry !== null
  );
  const seen = new Set<string>();
  const candidates: Array<{ path: string; source: string }> = [];
  for (const entry of filteredEntries) {
    const normalized = path.resolve(entry.path);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({ path: normalized, source: entry.source });
  }

  const attempted: CacheAttempt[] = [];
  for (const candidate of candidates) {
    try {
      writeProbeFile(candidate.path);
      return {
        path: candidate.path,
        preferredPath: preferred,
        selectedSource: candidate.source,
        writable: true,
        fallbackUsed: candidate.path !== preferred,
        attemptedPaths: attempted,
        preferredFailure: attempted.find((entry) => entry.path === preferred) || null
      };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      attempted.push({
        path: candidate.path,
        source: candidate.source,
        code: err?.code || null,
        message: err?.message || String(error)
      });
    }
  }

  return {
    path: preferred,
    preferredPath: preferred,
    selectedSource: 'preferred',
    writable: false,
    fallbackUsed: false,
    attemptedPaths: attempted,
    preferredFailure: attempted.find((entry) => entry.path === preferred) || null
  };
}

function moveIfNeeded(source: string, target: string): boolean {
  if (!fs.existsSync(source)) return false;
  if (fs.existsSync(target)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(source, target);
  return true;
}

function moveSqliteFamily(baseSource: string, baseTarget: string): boolean {
  let moved = false;
  const suffixes = ['', '-wal', '-shm'];
  for (const suffix of suffixes) {
    moved = moveIfNeeded(`${baseSource}${suffix}`, `${baseTarget}${suffix}`) || moved;
  }
  return moved;
}

export interface ResolveConfigPathOptions {
  env?: Record<string, string | undefined>;
  lociHome?: string;
}

export function resolveConfigPath({ env = process.env as Record<string, string | undefined>, lociHome }: ResolveConfigPathOptions = {}): string {
  const home = lociHome || resolveLociHome(env);
  const paths = buildLociPaths(home);
  if (env.LOCI_CONFIG) {
    const explicit = path.resolve(env.LOCI_CONFIG);
    if (fs.existsSync(explicit)) return explicit;
    if (
      explicit === paths.legacyConfigPath ||
      explicit === paths.legacyCompatConfigPath
    ) {
      if (fs.existsSync(paths.configPath)) return paths.configPath;
    }
    return explicit;
  }
  if (fs.existsSync(paths.configPath)) return paths.configPath;
  if (fs.existsSync(paths.legacyConfigPath)) return paths.legacyConfigPath;
  return paths.configPath;
}

export function migrateLociHomeLayout(lociHome: string): MigrationResult {
  const paths = buildLociPaths(lociHome);
  fs.mkdirSync(paths.home, { recursive: true });
  fs.mkdirSync(paths.dirs.config, { recursive: true });
  fs.mkdirSync(paths.dirs.data, { recursive: true });
  fs.mkdirSync(paths.dirs.cache, { recursive: true });
  fs.mkdirSync(paths.dirs.backups, { recursive: true });
  fs.mkdirSync(paths.dirs.vendor, { recursive: true });

  let moved = false;

  moved = moveIfNeeded(paths.legacyConfigPath, paths.configPath) || moved;
  moved = moveIfNeeded(paths.legacySnippetPath, paths.snippetPath) || moved;
  moved = moveIfNeeded(paths.legacyUpdateStatusPath, paths.updateStatusPath) || moved;
  moved = moveIfNeeded(paths.legacyJsonIndexPath, paths.jsonIndexPath) || moved;
  moved = moveIfNeeded(paths.legacyCompatConfigPath, path.join(paths.dirs.backups, 'config.json')) || moved;
  moved = moveSqliteFamily(paths.legacySqliteDbPath, paths.sqliteDbPath) || moved;
  moved = moveSqliteFamily(paths.legacyMemoryDbPath, paths.memoryDbPath) || moved;

  const entries = fs.readdirSync(paths.home, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith('loci.config.json.bak.')) continue;
    moved = moveIfNeeded(
      path.join(paths.home, entry.name),
      path.join(paths.dirs.backups, entry.name)
    ) || moved;
  }

  return {
    changed: moved,
    paths
  };
}
