function getByPath(obj: Record<string, unknown>, dotPath: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return dotPath.split('.').reduce<unknown>((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

function hasValue(value: unknown, type: string): boolean {
  if (type === 'array') return Array.isArray(value) && value.length > 0;
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return Number.isFinite(value as number);
  if (type === 'string') return typeof value === 'string' && (value as string).trim() !== '';
  return value !== undefined && value !== null && value !== '';
}

function normalizeProvider(provider: unknown, fallback: string): string {
  const value = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
  if (!value) return fallback;
  if (value === 'xenova') return fallback;
  return value;
}

function normalizeModel(model: unknown, fallback: string): string {
  const value = typeof model === 'string' ? model.trim() : '';
  if (!value) return fallback;
  if (/^xenova\//i.test(value)) return fallback;
  return value;
}

export interface SetupField {
  path: string;
  label: string;
  type: string;
}

export const REQUIRED_SETUP_FIELDS: SetupField[] = [
  { path: 'roots', label: 'project roots', type: 'array' },
  { path: 'index.backend', label: 'index backend', type: 'string' },
  { path: 'index.dbPath', label: 'SQLite DB path', type: 'string' },
  { path: 'index.indexPath', label: 'JSON index path', type: 'string' },
  { path: 'memory.enabled', label: 'memory enabled flag', type: 'boolean' },
  { path: 'memory.backend', label: 'memory backend', type: 'string' },
  { path: 'memory.dbPath', label: 'memory DB path', type: 'string' },
  { path: 'memory.autoCapture', label: 'memory auto-capture flag', type: 'boolean' },
  { path: 'memory.askForConsentDone', label: 'memory consent marker', type: 'boolean' }
];

export function findMissingRequiredSetupFields(config: Record<string, unknown>): SetupField[] {
  return REQUIRED_SETUP_FIELDS.filter((field) => !hasValue(getByPath(config, field.path), field.type));
}

export interface IndexConfig {
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

export interface MemoryConfig {
  enabled: boolean;
  backend: string;
  dbPath: string;
  autoCapture: boolean;
  askForConsentDone: boolean;
}

export interface NormalizedConfig {
  roots: string[];
  index: IndexConfig;
  memory: MemoryConfig;
}

export interface UpgradeConfigInput {
  existingConfig: Record<string, unknown>;
  defaults: NormalizedConfig;
}

export function normalizeUpgradeConfig({ existingConfig, defaults }: UpgradeConfigInput): NormalizedConfig {
  const existing = existingConfig && typeof existingConfig === 'object' ? existingConfig : {} as Record<string, unknown>;
  const existingRoots = (existing as { roots?: string[] }).roots;
  const roots = Array.isArray(existingRoots) && existingRoots.length > 0
    ? existingRoots
    : defaults.roots;

  const existingIndex = (existing as { index?: Record<string, unknown> }).index || {};
  const index: IndexConfig = {
    backend: (existingIndex.backend as string) || defaults.index.backend,
    dbPath: (existingIndex.dbPath as string) || defaults.index.dbPath,
    indexPath: (existingIndex.indexPath as string) || defaults.index.indexPath,
    chunkLines: Number.isFinite(existingIndex.chunkLines as number) ? existingIndex.chunkLines as number : defaults.index.chunkLines,
    chunkOverlap: Number.isFinite(existingIndex.chunkOverlap as number) ? existingIndex.chunkOverlap as number : defaults.index.chunkOverlap,
    maxTermsPerChunk: Number.isFinite(existingIndex.maxTermsPerChunk as number)
      ? existingIndex.maxTermsPerChunk as number
      : defaults.index.maxTermsPerChunk,
    maxIndexedFiles: Number.isFinite(existingIndex.maxIndexedFiles as number)
      ? existingIndex.maxIndexedFiles as number
      : defaults.index.maxIndexedFiles,
    embeddingProvider: normalizeProvider(
      existingIndex.embeddingProvider,
      defaults.index.embeddingProvider
    ),
    embeddingModel: normalizeModel(
      existingIndex.embeddingModel,
      defaults.index.embeddingModel
    ),
    embeddingCacheDir: (existingIndex.embeddingCacheDir as string) || defaults.index.embeddingCacheDir,
    embeddingDimensions: Number.isFinite(existingIndex.embeddingDimensions as number)
      ? existingIndex.embeddingDimensions as number
      : defaults.index.embeddingDimensions,
    rerankerProvider: normalizeProvider(
      existingIndex.rerankerProvider,
      defaults.index.rerankerProvider
    ),
    rerankerModel: normalizeModel(
      existingIndex.rerankerModel,
      defaults.index.rerankerModel
    ),
    rerankerCacheDir: (existingIndex.rerankerCacheDir as string) || defaults.index.rerankerCacheDir
  };

  const existingMemory = (existing as { memory?: Record<string, unknown> }).memory || {};
  const memoryEnabled = typeof existingMemory.enabled === 'boolean'
    ? existingMemory.enabled
    : defaults.memory.enabled;
  const memory: MemoryConfig = {
    enabled: memoryEnabled,
    backend: (existingMemory.backend as string) || defaults.memory.backend,
    dbPath: (existingMemory.dbPath as string) || defaults.memory.dbPath,
    autoCapture: typeof existingMemory.autoCapture === 'boolean'
      ? existingMemory.autoCapture
      : memoryEnabled,
    askForConsentDone: typeof existingMemory.askForConsentDone === 'boolean'
      ? existingMemory.askForConsentDone
      : defaults.memory.askForConsentDone
  };

  return {
    roots,
    index,
    memory
  };
}
