/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NormalizedEmbedStatus {
  backend: string;
  ready: boolean;
  provider: string;
  model: string | null;
  enabled: boolean;
  available: boolean;
  dimensions: number | null;
  error: string | null;
  sqlite_vec_loaded: boolean | null;
  sqlite_vec_extension: Record<string, unknown> | null;
  sqlite_vec_table_ready: boolean | null;
  embedding: Record<string, unknown>;
}

export function normalizeEmbedStatus(status: any): NormalizedEmbedStatus {
  const embedding = status?.embedding || {};
  const provider = embedding.provider || 'none';
  const model = embedding.model || null;
  const enabled = Boolean(embedding.enabled);
  const available = embedding.available ?? false;

  return {
    backend: status?.backend || 'json',
    ready: enabled ? Boolean(available) : true,
    provider,
    model,
    enabled,
    available,
    dimensions: embedding.dimensions ?? null,
    error: embedding.error || null,
    sqlite_vec_loaded: status?.sqlite_vec_loaded ?? status?.sqlite_vec_extension?.loaded ?? null,
    sqlite_vec_extension: status?.sqlite_vec_extension || null,
    sqlite_vec_table_ready: status?.sqlite_vec_table_ready ?? null,
    embedding
  };
}

export interface NormalizedIndexStatus {
  backend: string;
  total_files: number;
  total_chunks: number;
  upgrade_recommended: boolean;
  upgrade_reason: string | null;
  [key: string]: unknown;
}

export function normalizeIndexStatus(status: any): NormalizedIndexStatus {
  return {
    ...status,
    backend: status?.backend || 'json',
    total_files: Number.isFinite(status?.total_files) ? status.total_files : 0,
    total_chunks: Number.isFinite(status?.total_chunks) ? status.total_chunks : 0,
    upgrade_recommended: Boolean(status?.upgrade_recommended),
    upgrade_reason: status?.upgrade_reason || null
  };
}

export interface NormalizedIndexProjectResult {
  scanned_files: number;
  indexed_files: number;
  skipped_files: number;
  removed_files: number;
  failed_files: Array<Record<string, unknown>>;
  failed_file_count: number;
  failed_file_samples: Array<Record<string, unknown>>;
  total_files: number;
  total_chunks: number;
  max_files_requested: number;
  [key: string]: unknown;
}

export function normalizeIndexProjectResult(result: any, maxFiles: number): NormalizedIndexProjectResult {
  const failedFiles = Array.isArray(result?.failed_files) ? result.failed_files : [];
  return {
    ...result,
    scanned_files: Number.isFinite(result?.scanned_files) ? result.scanned_files : 0,
    indexed_files: Number.isFinite(result?.indexed_files) ? result.indexed_files : 0,
    skipped_files: Number.isFinite(result?.skipped_files) ? result.skipped_files : 0,
    removed_files: Number.isFinite(result?.removed_files) ? result.removed_files : 0,
    failed_files: failedFiles,
    failed_file_count: failedFiles.length,
    failed_file_samples: failedFiles.slice(0, 3),
    total_files: Number.isFinite(result?.total_files) ? result.total_files : 0,
    total_chunks: Number.isFinite(result?.total_chunks) ? result.total_chunks : 0,
    max_files_requested: maxFiles
  };
}

export interface NormalizedMemoryStatus {
  enabled: boolean;
  auto_capture: boolean;
  consent_done: boolean;
  requested_backend: string | null;
  db_path: string | null;
  db_exists: boolean;
  db_dir: string | null;
  synapse_home: string | null;
  backend: {
    requested: string | null;
    selected: string | null;
    available: boolean;
    reason: string | null;
  };
  store: {
    initialized: boolean;
    total_entries: number;
    total_events: number;
    error: string | null;
  };
  [key: string]: unknown;
}

export function normalizeMemoryStatus(status: any): NormalizedMemoryStatus {
  const backend = status?.backend || {};
  const store = status?.store || {};

  return {
    ...status,
    enabled: Boolean(status?.enabled),
    auto_capture: Boolean(status?.auto_capture),
    consent_done: Boolean(status?.consent_done),
    requested_backend: status?.requested_backend ?? backend.requested ?? null,
    db_path: status?.db_path || null,
    db_exists: Boolean(status?.db_exists),
    db_dir: status?.db_dir || null,
    synapse_home: status?.synapse_home || null,
    backend: {
      requested: backend.requested ?? status?.requested_backend ?? null,
      selected: backend.selected ?? null,
      available: Boolean(backend.available),
      reason: backend.reason || null
    },
    store: {
      initialized: Boolean(store.initialized),
      total_entries: Number.isFinite(store.total_entries) ? store.total_entries : 0,
      total_events: Number.isFinite(store.total_events) ? store.total_events : 0,
      error: store.error || null
    }
  };
}

export interface NormalizedTaskContextResult {
  query: string;
  scope: {
    root_path: string;
    project_path: string;
    branch_name: string;
    topic: string;
    feature: string;
  };
  runtime: unknown;
  memory: {
    enabled: boolean;
    auto_capture: boolean;
    consent_done: boolean;
    backend_available: boolean;
    requested_backend: string | null;
    selected_backend: string | null;
    total_entries: number;
    total_events: number;
  };
  recall: {
    attempted: boolean;
    skipped_reason: string;
    count: number;
    items: unknown[];
  };
  guidance: string[];
}

export function normalizeTaskContextResult(result: any, input: any = {}): NormalizedTaskContextResult {
  const memory = result?.memory || {};
  const recall = result?.recall || {};
  const scope = result?.scope || {};

  return {
    query: result?.query || input.query || input.task || '',
    scope: {
      root_path: scope.root_path || input.root_path || '',
      project_path: scope.project_path || input.project_path || '',
      branch_name: scope.branch_name || input.branch_name || '',
      topic: scope.topic || input.topic || '',
      feature: scope.feature || input.feature || ''
    },
    runtime: result?.runtime || null,
    memory: {
      enabled: Boolean(memory.enabled),
      auto_capture: Boolean(memory.auto_capture),
      consent_done: Boolean(memory.consent_done),
      backend_available: Boolean(memory.backend_available),
      requested_backend: memory.requested_backend || null,
      selected_backend: memory.selected_backend || null,
      total_entries: Number.isFinite(memory.total_entries) ? memory.total_entries : 0,
      total_events: Number.isFinite(memory.total_events) ? memory.total_events : 0
    },
    recall: {
      attempted: Boolean(recall.attempted),
      skipped_reason: recall.skipped_reason || '',
      count: Number.isFinite(recall.count) ? recall.count : 0,
      items: Array.isArray(recall.items) ? recall.items : []
    },
    guidance: Array.isArray(result?.guidance) ? result.guidance : []
  };
}

export interface NormalizedCaptureOutcomeResult {
  captured: boolean;
  skipped_reason: string;
  runtime: unknown;
  memory: NormalizedMemoryStatus;
  event: unknown;
  result: unknown;
}

export function normalizeCaptureOutcomeResult(result: any): NormalizedCaptureOutcomeResult {
  return {
    captured: Boolean(result?.captured),
    skipped_reason: result?.skipped_reason || '',
    runtime: result?.runtime || null,
    memory: normalizeMemoryStatus(result?.memory || {}),
    event: result?.event || null,
    result: result?.result || null
  };
}

