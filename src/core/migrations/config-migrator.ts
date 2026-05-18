import fs from 'node:fs';
import path from 'node:path';
import { buildLociPaths } from '../runtime/home-layout.js';

interface IndexDefaults {
  backend: string;
  dbPath: string;
  indexPath: string;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  maxIndexedFiles: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingCacheDir: string;
  embeddingDimensions: number;
  rerankerProvider: string;
  rerankerModel: string;
  rerankerCacheDir: string;
}

interface MemoryDefaults {
  enabled: boolean;
  backend: string;
  dbPath: string;
  autoCapture: boolean;
  askForConsentDone: boolean;
}

export interface MigrationResult {
  changed: boolean;
  reason?: string;
  version?: number;
  backupPath?: string;
}

function backupFile(configPath: string, lociHome: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir: string = buildLociPaths(lociHome).dirs.backups;
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(configPath)}.bak.${stamp}`);
  fs.copyFileSync(configPath, backupPath);
  return backupPath;
}

function safeWriteJson(filePath: string, value: unknown): void {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
}

function defaultIndex(lociHome: string): IndexDefaults {
  const layout = buildLociPaths(lociHome);
  return {
    backend: 'sqlite-vec',
    dbPath: layout.sqliteDbPath,
    indexPath: layout.jsonIndexPath,
    chunkLines: 60,
    chunkOverlap: 15,
    maxTermsPerChunk: 80,
    maxIndexedFiles: 20000,
    embeddingProvider: 'huggingface',
    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
    embeddingCacheDir: layout.dirs.cache,
    embeddingDimensions: 384,
    rerankerProvider: 'huggingface',
    rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    rerankerCacheDir: layout.dirs.cache
  };
}

function defaultMemory(lociHome: string): MemoryDefaults {
  const layout = buildLociPaths(lociHome);
  return {
    enabled: false,
    backend: 'auto',
    dbPath: layout.memoryDbPath,
    autoCapture: false,
    askForConsentDone: false
  };
}

export function ensureConfigUpgraded({ configPath, lociHome }: { configPath: string; lociHome: string }): MigrationResult {
  if (!configPath || !fs.existsSync(configPath)) {
    return { changed: false, reason: 'missing' };
  }

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { changed: false, reason: 'invalid-json' };
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.roots)) {
    return { changed: false, reason: 'invalid-shape' };
  }

  const currentVersion = Number.isFinite(parsed.version) ? parsed.version : 1;
  let changed = false;

  if (currentVersion < 2) {
    parsed.version = 2;
    changed = true;
  }

  if (!parsed.index || typeof parsed.index !== 'object') {
    parsed.index = defaultIndex(lociHome);
    changed = true;
  } else {
    const defaults = defaultIndex(lociHome) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(defaults)) {
      if (parsed.index[k] === undefined || parsed.index[k] === null || parsed.index[k] === '') {
        parsed.index[k] = v;
        changed = true;
      }
    }
  }

  if (currentVersion < 4) {
    parsed.version = 4;
    changed = true;
  }

  if (!parsed.memory || typeof parsed.memory !== 'object') {
    parsed.memory = defaultMemory(lociHome);
    changed = true;
  } else {
    const defaults = defaultMemory(lociHome) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(defaults)) {
      if (parsed.memory[k] === undefined || parsed.memory[k] === null || parsed.memory[k] === '') {
        parsed.memory[k] = v;
        changed = true;
      }
    }
  }

  if (!changed) {
    return { changed: false, reason: 'up-to-date', version: parsed.version };
  }

  const backupPath = backupFile(configPath, lociHome);
  safeWriteJson(configPath, parsed);
  return {
    changed: true,
    version: parsed.version,
    backupPath
  };
}
