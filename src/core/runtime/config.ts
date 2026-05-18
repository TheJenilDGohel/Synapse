import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureConfigUpgraded } from '../migrations/config-migrator.js';
import { RG_BIN, canonicalizePath } from './platform.js';
import {
  migrateLociHomeLayout,
  resolveConfigPath as resolveDefaultConfigPath,
  resolveLociHome,
  resolveWritableModelCacheDir
} from './home-layout.js';
import type { WritableModelCacheResult } from './home-layout.js';
import { findSqliteVecExtensionPath } from './sqlite-vec-extension.js';

function parseBoolean(value: string | undefined | null, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function parseIntEnv(value: string | undefined | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntEnvClamped(value: string | undefined | null, fallback: number, min: number, max: number): number {
  const parsed = parseIntEnv(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

function parseStringEnv(value: string | undefined | null, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim();
}

export const DEFAULT_MAX_READ_LINES: number = 400;
export const DEFAULT_MAX_RESULTS: number = 100;
export const DEFAULT_MAX_FILE_BYTES: number = 512 * 1024;
export const DEFAULT_MAX_INDEX_FILES: number = 20000;

export const IGNORE_DIRS: Set<string> = new Set([
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  'build',
  'dist',
  '.dart_tool',
  '.next',
  '.turbo',
  'target',
  'coverage',
  'graphify-out',
  'venv',
  '.venv',
  '__pycache__'
]);

export const PROJECT_MARKER_FILES: Set<string> = new Set([
  'package.json',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'pubspec.yaml',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'poetry.lock',
  'setup.py',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'settings.gradle',
  'settings.gradle.kts',
  'gradle.properties',
  'go.mod',
  'Cargo.toml',
  '.sln',
  'Gemfile',
  'composer.json',
  'Package.swift',
  'CMakeLists.txt',
  'Makefile',
  'meson.build'
]);

export const PROJECT_HINT_DIRS: Set<string> = new Set([
  'src',
  'lib',
  'app',
  'apps',
  'packages',
  'modules',
  'cmd',
  'android',
  'ios',
  'web',
  'test',
  'tests'
]);

export const TEXT_EXTENSIONS: Set<string> = new Set([
  '.py', '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
  '.yaml', '.yml', '.toml', '.ini', '.sh', '.bash', '.zsh',
  '.dart', '.java', '.kt', '.kts', '.swift', '.go', '.rs',
  '.c', '.h', '.hpp', '.cpp', '.cs', '.rb', '.php', '.sql',
  '.graphql', '.proto', '.xml', '.html', '.css', '.scss'
]);

export function expandHome(inputPath: string): string {
  // Cross-platform: use os.homedir() (Windows: USERPROFILE; POSIX: HOME) and
  // accept both `~/` and `~\` so user-provided config paths work on every OS.
  return inputPath.replace(/^~(?=$|[\\/])/, os.homedir());
}

export interface RootEntry {
  label: string;
  path: string;
}

function normalizeRootEntry(label: string | undefined, rootPath: string): RootEntry | null {
  const resolved = path.resolve(expandHome(rootPath));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return null;
  }

  const canonical = canonicalizePath(resolved);

  return {
    label: (label || path.basename(canonical) || 'root').trim(),
    path: canonical
  };
}

function parseProjectRootsEnv(projectRoots: string | undefined): RootEntry[] {
  const raw = (projectRoots || '').trim();
  if (!raw) return [];

  const roots: RootEntry[] = [];
  for (const entry of raw.split(';').map((x) => x.trim()).filter(Boolean)) {
    let label: string | undefined;
    let rootPath: string;

    if (entry.includes('=')) {
      const idx = entry.indexOf('=');
      label = entry.slice(0, idx).trim();
      rootPath = entry.slice(idx + 1).trim();
    } else {
      rootPath = entry;
      label = path.basename(rootPath) || 'root';
    }

    const normalized = normalizeRootEntry(label, rootPath);
    if (normalized) roots.push(normalized);
  }

  return roots;
}

interface ConfigFileRootItem {
  label?: string;
  path?: string;
}

interface ConfigFileParsed {
  roots?: ConfigFileRootItem[];
  index?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  version?: number;
}

function parseConfigFileRoots(configPath: string | undefined): RootEntry[] {
  const resolvedPath = path.resolve(configPath || 'loci.config.json');
  if (!fs.existsSync(resolvedPath)) return [];

  let parsed: ConfigFileParsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as ConfigFileParsed;
  } catch {
    return [];
  }

  if (!parsed || !Array.isArray(parsed.roots)) {
    return [];
  }

  const roots: RootEntry[] = [];
  for (const item of parsed.roots) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.path !== 'string') continue;

    const normalized = normalizeRootEntry(
      typeof item.label === 'string' ? item.label : undefined,
      item.path
    );
    if (normalized) roots.push(normalized);
  }

  return roots;
}

interface ConfigFileSettings {
  backend?: string;
  dbPath?: string;
  indexPath?: string;
  chunkLines?: number;
  chunkOverlap?: number;
  maxTermsPerChunk?: number;
  maxIndexedFiles?: number;
  sqliteVecExtensionPath?: string;
  sqliteVecModule?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingCacheDir?: string;
  embeddingDimensions?: number;
  rerankerProvider?: string;
  rerankerModel?: string;
  rerankerCacheDir?: string;
  memoryEnabled?: boolean;
  memoryBackend?: string;
  memoryDbPath?: string;
  memoryAutoCapture?: boolean;
  memoryConsentDone?: boolean;
  nerEnabled?: boolean;
  nerModel?: string;
  nerConfidenceThreshold?: number;
  classifierEnabled?: boolean;
  classifierModel?: string;
  classifierConfidenceThreshold?: number;
  enrichmentEnabled?: boolean;
  enrichmentModel?: string;
  enrichmentDevice?: string;
}

function parseConfigFileSettings(configPath: string | undefined): ConfigFileSettings {
  const resolvedPath = path.resolve(configPath || 'loci.config.json');
  if (!fs.existsSync(resolvedPath)) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== 'object') return {};

  const index = (parsed.index && typeof parsed.index === 'object' ? parsed.index : {}) as Record<string, unknown>;
  const memory = (parsed.memory && typeof parsed.memory === 'object' ? parsed.memory : {}) as Record<string, unknown>;

  return {
    backend: typeof index.backend === 'string' ? index.backend : undefined,
    dbPath: typeof index.dbPath === 'string' ? index.dbPath : undefined,
    indexPath: typeof index.indexPath === 'string' ? index.indexPath : undefined,
    chunkLines: Number.isFinite(index.chunkLines) ? index.chunkLines as number : undefined,
    chunkOverlap: Number.isFinite(index.chunkOverlap) ? index.chunkOverlap as number : undefined,
    maxTermsPerChunk: Number.isFinite(index.maxTermsPerChunk) ? index.maxTermsPerChunk as number : undefined,
    maxIndexedFiles: Number.isFinite(index.maxIndexedFiles) ? index.maxIndexedFiles as number : undefined,
    sqliteVecExtensionPath: typeof index.sqliteVecExtensionPath === 'string'
      ? index.sqliteVecExtensionPath
      : undefined,
    sqliteVecModule: typeof index.sqliteVecModule === 'string' ? index.sqliteVecModule : undefined,
    embeddingProvider: typeof index.embeddingProvider === 'string' ? index.embeddingProvider : undefined,
    embeddingModel: typeof index.embeddingModel === 'string' ? index.embeddingModel : undefined,
    embeddingCacheDir: typeof index.embeddingCacheDir === 'string' ? index.embeddingCacheDir : undefined,
    embeddingDimensions: Number.isFinite(index.embeddingDimensions) ? index.embeddingDimensions as number : undefined,
    rerankerProvider: typeof index.rerankerProvider === 'string' ? index.rerankerProvider : undefined,
    rerankerModel: typeof index.rerankerModel === 'string' ? index.rerankerModel : undefined,
    rerankerCacheDir: typeof index.rerankerCacheDir === 'string' ? index.rerankerCacheDir : undefined,
    memoryEnabled: typeof memory.enabled === 'boolean' ? memory.enabled : undefined,
    memoryBackend: typeof memory.backend === 'string' ? memory.backend : undefined,
    memoryDbPath: typeof memory.dbPath === 'string' ? memory.dbPath : undefined,
    memoryAutoCapture: typeof memory.autoCapture === 'boolean' ? memory.autoCapture : undefined,
    memoryConsentDone: typeof memory.askForConsentDone === 'boolean' ? memory.askForConsentDone : undefined,
    nerEnabled: typeof memory.nerEnabled === 'boolean' ? memory.nerEnabled : undefined,
    nerModel: typeof memory.nerModel === 'string' ? memory.nerModel : undefined,
    nerConfidenceThreshold: Number.isFinite(memory.nerConfidenceThreshold) ? memory.nerConfidenceThreshold as number : undefined,
    classifierEnabled: typeof memory.classifierEnabled === 'boolean' ? memory.classifierEnabled : undefined,
    classifierModel: typeof memory.classifierModel === 'string' ? memory.classifierModel : undefined,
    classifierConfidenceThreshold: Number.isFinite(memory.classifierConfidenceThreshold) ? memory.classifierConfidenceThreshold as number : undefined,
    enrichmentEnabled: typeof index.enrichmentEnabled === 'boolean' ? index.enrichmentEnabled : undefined,
    enrichmentModel: typeof index.enrichmentModel === 'string' ? index.enrichmentModel : undefined,
    enrichmentDevice: typeof index.enrichmentDevice === 'string' ? index.enrichmentDevice : undefined
  };
}

function resolveRoots({ projectRoots, lociConfigPath }: { projectRoots: string | undefined; lociConfigPath: string }): RootEntry[] {
  const envRoots = parseProjectRootsEnv(projectRoots);
  if (envRoots.length > 0) return envRoots;

  const fileRoots = parseConfigFileRoots(lociConfigPath);
  if (fileRoots.length > 0) return fileRoots;

  const cwd = path.resolve(process.cwd());
  return [{ label: path.basename(cwd) || 'cwd', path: cwd }];
}

function detectRipgrep(): boolean {
  try {
    const result = spawnSync(RG_BIN, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

export interface RuntimeConfig {
  lociHome: string;
  mcpMode: string;
  disableConsoleOutput: boolean;
  rgTimeoutMs: number;
  autoProjectSplit: boolean;
  maxAutoProjects: number;
  forceSplitChildren: boolean;
  indexBackend: string;
  vectorIndexPath: string;
  sqliteDbPath: string;
  sqliteVecExtensionPath: string;
  sqliteVecExtensionSource: string;
  sqliteVecModule: string;
  vectorChunkLines: number;
  vectorChunkOverlap: number;
  vectorMaxTermsPerChunk: number;
  vectorMaxIndexedFiles: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingCacheDir: string;
  embeddingCacheStatus: WritableModelCacheResult;
  embeddingDimensions: number;
  rerankerProvider: string;
  rerankerModel: string;
  rerankerCacheDir: string;
  rerankerCacheStatus: WritableModelCacheResult;
  updatePackageName: string;
  updateCheckIntervalMinutes: number;
  updateFailureBackoffMinutes: number;
  indexSweepIntervalMinutes: number;
  healthMonitorIntervalMinutes: number;
  extraProjectMarkers: Set<string>;
  memoryEnabled: boolean;
  memoryBackend: string;
  memoryDbPath: string;
  memoryAutoCapture: boolean;
  memoryConsentDone: boolean;
  nerEnabled: boolean;
  nerModel: string;
  nerConfidenceThreshold: number;
  classifierEnabled: boolean;
  classifierModel: string;
  classifierConfidenceThreshold: number;
  enrichmentEnabled: boolean;
  enrichmentModel: string;
  enrichmentDevice: string;
  roots: RootEntry[];
  hasRipgrep: boolean;
}

export function buildRuntimeConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  testMocks?: { sqliteVecModule?: any }
): RuntimeConfig {
  const lociHome = resolveLociHome(env);
  const mcpMode = (env.MCP_MODE || 'stdio').toLowerCase();
  const layout = migrateLociHomeLayout(lociHome).paths;
  const configPath = resolveDefaultConfigPath({ env, lociHome });
  const migration = ensureConfigUpgraded({
    configPath: path.resolve(configPath),
    lociHome
  });
  if (migration.changed && migration.backupPath) {
    process.stderr.write(
      `[loci-config] migrated to version ${migration.version}; backup: ${migration.backupPath}\n`
    );
  }
  const fileSettings = parseConfigFileSettings(configPath);
  const embeddingCachePreferred = path.resolve(
    env.LOCI_EMBED_CACHE_DIR || fileSettings.embeddingCacheDir || layout.dirs.cache
  );
  const rerankerCachePreferred = path.resolve(
    env.LOCI_RERANKER_CACHE_DIR || fileSettings.rerankerCacheDir || layout.dirs.cache
  );
  const embeddingCacheResolved = resolveWritableModelCacheDir({
    preferredDir: embeddingCachePreferred,
    lociHome,
    env
  });
  const rerankerCacheResolved = resolveWritableModelCacheDir({
    preferredDir: rerankerCachePreferred,
    lociHome,
    env
  });

  if (embeddingCacheResolved.fallbackUsed) {
    const reason = embeddingCacheResolved.preferredFailure?.message || 'preferred cache path not writable';
    process.stderr.write(
      `[loci-config] info: embedding cache using fallback path\n` +
      `  preferred: ${embeddingCacheResolved.preferredPath}\n` +
      `  resolved: ${embeddingCacheResolved.path}\n` +
      `  reason: ${reason}\n`
    );
  }
  if (rerankerCacheResolved.fallbackUsed) {
    const reason = rerankerCacheResolved.preferredFailure?.message || 'preferred cache path not writable';
    process.stderr.write(
      `[loci-config] info: reranker cache using fallback path\n` +
      `  preferred: ${rerankerCacheResolved.preferredPath}\n` +
      `  resolved: ${rerankerCacheResolved.path}\n` +
      `  reason: ${reason}\n`
    );
  }
  const configuredSqliteVecExtensionPath = parseStringEnv(
    env.LOCI_SQLITE_VEC_EXTENSION,
    fileSettings.sqliteVecExtensionPath || ''
  );
  const detectedSqliteVecExtension = configuredSqliteVecExtensionPath
    ? null
    : findSqliteVecExtensionPath({
      lociHome,
      env,
      sqliteVecModule: testMocks?.sqliteVecModule
    });

  return {
    lociHome,
    mcpMode,
    disableConsoleOutput: parseBoolean(env.DISABLE_CONSOLE_OUTPUT, false),
    rgTimeoutMs: parseIntEnv(env.LOCI_RG_TIMEOUT_MS, 15000),
    autoProjectSplit: parseBoolean(env.LOCI_AUTO_PROJECT_SPLIT, true),
    maxAutoProjects: parseIntEnv(env.LOCI_MAX_AUTO_PROJECTS, 120),
    forceSplitChildren: parseBoolean(env.LOCI_FORCE_SPLIT_CHILDREN, false),
    indexBackend: parseStringEnv(env.LOCI_INDEX_BACKEND, fileSettings.backend || 'sqlite-vec'),
    vectorIndexPath: path.resolve(
      env.LOCI_INDEX_PATH || fileSettings.indexPath || layout.jsonIndexPath
    ),
    sqliteDbPath: path.resolve(
      env.LOCI_DB_PATH || fileSettings.dbPath || layout.sqliteDbPath
    ),
    sqliteVecExtensionPath: configuredSqliteVecExtensionPath || detectedSqliteVecExtension?.path || '',
    sqliteVecExtensionSource: configuredSqliteVecExtensionPath
      ? 'configured'
      : detectedSqliteVecExtension?.source || 'missing',
    sqliteVecModule: parseStringEnv(env.LOCI_SQLITE_VEC_MODULE, fileSettings.sqliteVecModule || 'vec0'),
    vectorChunkLines: parseIntEnv(
      env.LOCI_VECTOR_CHUNK_LINES,
      fileSettings.chunkLines || 60
    ),
    vectorChunkOverlap: parseIntEnv(
      env.LOCI_VECTOR_CHUNK_OVERLAP,
      fileSettings.chunkOverlap || 15
    ),
    vectorMaxTermsPerChunk: parseIntEnv(
      env.LOCI_VECTOR_MAX_TERMS,
      fileSettings.maxTermsPerChunk || 80
    ),
    vectorMaxIndexedFiles: parseIntEnv(
      env.LOCI_VECTOR_MAX_FILES,
      fileSettings.maxIndexedFiles || DEFAULT_MAX_INDEX_FILES
    ),
    embeddingProvider: parseStringEnv(
      env.LOCI_EMBED_PROVIDER,
      fileSettings.embeddingProvider || 'huggingface'
    ),
    embeddingModel: parseStringEnv(
      env.LOCI_EMBED_MODEL,
      fileSettings.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2'
    ),
    embeddingCacheDir: embeddingCacheResolved.path,
    embeddingCacheStatus: embeddingCacheResolved,
    embeddingDimensions: parseIntEnv(
      env.LOCI_EMBED_DIMS,
      fileSettings.embeddingDimensions || 384
    ),
    rerankerProvider: parseStringEnv(
      env.LOCI_RERANKER_PROVIDER,
      fileSettings.rerankerProvider || 'huggingface'
    ),
    rerankerModel: parseStringEnv(
      env.LOCI_RERANKER_MODEL,
      fileSettings.rerankerModel || 'cross-encoder/ms-marco-MiniLM-L-6-v2'
    ),
    rerankerCacheDir: rerankerCacheResolved.path,
    rerankerCacheStatus: rerankerCacheResolved,
    updatePackageName: parseStringEnv(env.LOCI_UPDATE_PACKAGE, 'loci'),
    updateCheckIntervalMinutes: parseIntEnvClamped(
      env.LOCI_UPDATE_CHECK_INTERVAL_MINUTES,
      60,
      15,
      1440
    ),
    updateFailureBackoffMinutes: parseIntEnvClamped(
      env.LOCI_UPDATE_FAILURE_BACKOFF_MINUTES,
      15,
      5,
      240
    ),
    indexSweepIntervalMinutes: parseIntEnvClamped(
      env.LOCI_INDEX_SWEEP_INTERVAL_MINUTES,
      mcpMode === 'stdio' ? 0 : 5,
      0,
      1440
    ),
    healthMonitorIntervalMinutes: parseIntEnvClamped(
      env.LOCI_HEALTH_MONITOR_INTERVAL_MINUTES,
      30,
      0,
      1440
    ),
    extraProjectMarkers: new Set(
      (env.LOCI_EXTRA_PROJECT_MARKERS || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    ),
    memoryEnabled: parseBoolean(env.LOCI_MEMORY_ENABLED, fileSettings.memoryEnabled ?? true),
    memoryBackend: parseStringEnv(env.LOCI_MEMORY_BACKEND, fileSettings.memoryBackend || 'auto'),
    memoryDbPath: path.resolve(
      env.LOCI_MEMORY_DB_PATH || fileSettings.memoryDbPath || layout.memoryDbPath
    ),
    memoryAutoCapture: parseBoolean(env.LOCI_MEMORY_AUTO_CAPTURE, fileSettings.memoryAutoCapture ?? true),
    memoryConsentDone: parseBoolean(env.LOCI_MEMORY_CONSENT_DONE, fileSettings.memoryConsentDone ?? true),
    nerEnabled: parseBoolean(env.LOCI_NER_ENABLED, fileSettings.nerEnabled ?? false),
    nerModel: parseStringEnv(env.LOCI_NER_MODEL, fileSettings.nerModel || 'Xenova/bert-base-NER'),
    nerConfidenceThreshold: parseIntEnv(env.LOCI_NER_CONFIDENCE, fileSettings.nerConfidenceThreshold ?? 75) / 100,
    classifierEnabled: parseBoolean(env.LOCI_CLASSIFIER_ENABLED, fileSettings.classifierEnabled ?? false),
    classifierModel: parseStringEnv(env.LOCI_CLASSIFIER_MODEL, fileSettings.classifierModel || 'Xenova/nli-deberta-v3-small'),
    classifierConfidenceThreshold: parseIntEnv(env.LOCI_CLASSIFIER_CONFIDENCE, fileSettings.classifierConfidenceThreshold ?? 35) / 100,
    enrichmentEnabled: parseBoolean(env.LOCI_ENRICHMENT_ENABLED, fileSettings.enrichmentEnabled ?? false),
    enrichmentModel: parseStringEnv(env.LOCI_ENRICHMENT_MODEL, fileSettings.enrichmentModel || 'Qwen/Qwen2.5-Coder-1.5B-Instruct'),
    enrichmentDevice: parseStringEnv(env.LOCI_ENRICHMENT_DEVICE, fileSettings.enrichmentDevice || 'webgpu'),
    roots: resolveRoots({
      projectRoots: env.PROJECT_ROOTS,
      lociConfigPath: configPath
    }),
    hasRipgrep: detectRipgrep()
  };
}

export function applyConsolePolicy(disableConsoleOutput: boolean): void {
  if (!disableConsoleOutput) return;
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}
