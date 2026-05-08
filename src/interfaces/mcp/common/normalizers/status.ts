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

export function normalizeEmbedStatus(status: Record<string, unknown> | null | undefined): NormalizedEmbedStatus {
  const embedding = (status?.embedding as Record<string, unknown>) || {};
  const provider = (embedding.provider as string) || 'none';
  const model = (embedding.model as string) || null;
  const enabled = Boolean(embedding.enabled);
  const available = (embedding.available as boolean) ?? false;

  return {
    backend: (status?.backend as string) || 'json',
    ready: enabled ? Boolean(available) : true,
    provider,
    model,
    enabled,
    available,
    dimensions: (embedding.dimensions as number) ?? null,
    error: (embedding.error as string) || null,
    sqlite_vec_loaded: (status?.sqlite_vec_loaded as boolean) ?? ((status?.sqlite_vec_extension as Record<string, unknown>)?.loaded as boolean) ?? null,
    sqlite_vec_extension: (status?.sqlite_vec_extension as Record<string, unknown>) || null,
    sqlite_vec_table_ready: (status?.sqlite_vec_table_ready as boolean) ?? null,
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

export function normalizeIndexStatus(status: Record<string, unknown> | null | undefined): NormalizedIndexStatus {
  return {
    ...status,
    backend: (status?.backend as string) || 'json',
    total_files: Number.isFinite(status?.total_files) ? (status?.total_files as number) : 0,
    total_chunks: Number.isFinite(status?.total_chunks) ? (status?.total_chunks as number) : 0,
    upgrade_recommended: Boolean(status?.upgrade_recommended),
    upgrade_reason: (status?.upgrade_reason as string) || null
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

export function normalizeIndexProjectResult(result: Record<string, unknown> | null | undefined, maxFiles: number): NormalizedIndexProjectResult {
  const failedFiles = Array.isArray(result?.failed_files) ? (result?.failed_files as Array<Record<string, unknown>>) : [];
  return {
    ...result,
    scanned_files: Number.isFinite(result?.scanned_files) ? (result?.scanned_files as number) : 0,
    indexed_files: Number.isFinite(result?.indexed_files) ? (result?.indexed_files as number) : 0,
    skipped_files: Number.isFinite(result?.skipped_files) ? (result?.skipped_files as number) : 0,
    removed_files: Number.isFinite(result?.removed_files) ? (result?.removed_files as number) : 0,
    failed_files: failedFiles,
    failed_file_count: failedFiles.length,
    failed_file_samples: failedFiles.slice(0, 3),
    total_files: Number.isFinite(result?.total_files) ? (result?.total_files as number) : 0,
    total_chunks: Number.isFinite(result?.total_chunks) ? (result?.total_chunks as number) : 0,
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

export function normalizeMemoryStatus(status: Record<string, unknown> | null | undefined): NormalizedMemoryStatus {
  const backend = (status?.backend as Record<string, unknown>) || {};
  const store = (status?.store as Record<string, unknown>) || {};

  return {
    ...status,
    enabled: Boolean(status?.enabled),
    auto_capture: Boolean(status?.auto_capture),
    consent_done: Boolean(status?.consent_done),
    requested_backend: (status?.requested_backend as string) ?? (backend.requested as string) ?? null,
    db_path: (status?.db_path as string) || null,
    db_exists: Boolean(status?.db_exists),
    db_dir: (status?.db_dir as string) || null,
    synapse_home: (status?.synapse_home as string) || null,
    backend: {
      requested: (backend.requested as string) ?? (status?.requested_backend as string) ?? null,
      selected: (backend.selected as string) ?? null,
      available: Boolean(backend.available),
      reason: (backend.reason as string) || null
    },
    store: {
      initialized: Boolean(store.initialized),
      total_entries: Number.isFinite(store.total_entries) ? (store.total_entries as number) : 0,
      total_events: Number.isFinite(store.total_events) ? (store.total_events as number) : 0,
      error: (store.error as string) || null
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

export function normalizeTaskContextResult(result: Record<string, unknown> | null | undefined, input: Record<string, unknown> | null | undefined = {}): NormalizedTaskContextResult {
  const memory = (result?.memory as Record<string, unknown>) || {};
  const recall = (result?.recall as Record<string, unknown>) || {};
  const scope = (result?.scope as Record<string, unknown>) || {};

  return {
    query: (result?.query as string) || (input?.query as string) || (input?.task as string) || '',
    scope: {
      root_path: (scope.root_path as string) || (input?.root_path as string) || '',
      project_path: (scope.project_path as string) || (input?.project_path as string) || '',
      branch_name: (scope.branch_name as string) || (input?.branch_name as string) || '',
      topic: (scope.topic as string) || (input?.topic as string) || '',
      feature: (scope.feature as string) || (input?.feature as string) || ''
    },
    runtime: result?.runtime || null,
    memory: {
      enabled: Boolean(memory.enabled),
      auto_capture: Boolean(memory.auto_capture),
      consent_done: Boolean(memory.consent_done),
      backend_available: Boolean(memory.backend_available),
      requested_backend: (memory.requested_backend as string) || null,
      selected_backend: (memory.selected_backend as string) || null,
      total_entries: Number.isFinite(memory.total_entries) ? (memory.total_entries as number) : 0,
      total_events: Number.isFinite(memory.total_events) ? (memory.total_events as number) : 0
    },
    recall: {
      attempted: Boolean(recall.attempted),
      skipped_reason: (recall.skipped_reason as string) || '',
      count: Number.isFinite(recall.count) ? (recall.count as number) : 0,
      items: Array.isArray(recall.items) ? (recall.items as unknown[]) : []
    },
    guidance: Array.isArray(result?.guidance) ? (result?.guidance as string[]) : []
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

export function normalizeCaptureOutcomeResult(result: Record<string, unknown> | null | undefined): NormalizedCaptureOutcomeResult {
  return {
    captured: Boolean(result?.captured),
    skipped_reason: (result?.skipped_reason as string) || '',
    runtime: result?.runtime || null,
    memory: normalizeMemoryStatus((result?.memory as Record<string, unknown>) || {}),
    event: result?.event || null,
    result: result?.result || null
  };
}

