/* eslint-disable @typescript-eslint/no-explicit-any */
import { ensurePaginatedShape, stripEmptyFields } from '../terse-utils.js';

export interface NormalizedMemoryRecallResult {
  query: string;
  count: number;
  items: unknown[];
  [key: string]: unknown;
}

export function normalizeMemoryRecallResult(result: any, query: string = ''): NormalizedMemoryRecallResult {
  const items = Array.isArray(result?.items) ? result.items.map(stripEmptyFields) : [];
  // quick 260415-n69: wrap into PaginatedResult shape so the response
  // validates against SEARCH_RESULT_SCHEMA. Preserves all legacy fields
  // (query, count, ...spread) via passthrough(). The service-provided
  // `count` is authoritative — it may differ from items.length if the
  // service reports a total match count separately from the paginated
  // slice (recall tolerates this).
  const serviceCount = Number.isFinite(result?.count) ? result.count : items.length;
  const paginated = ensurePaginatedShape(items, {
    total: Number.isFinite(result?.total_count) ? result.total_count : serviceCount,
    limit: Number.isFinite(result?.limit) ? result.limit : items.length,
    offset: Number.isFinite(result?.offset) ? result.offset : 0
  });
  return {
    ...result,
    ...paginated,
    query: result?.query || query,
    count: serviceCount,
    items: paginated.items
  };
}

export interface NormalizedMemoryEntryPayload {
  id: string | null;
  kind: string | null;
  title: string | null;
  summary: string;
  content: string;
  status: string | null;
  importance: number | null;
  confidence: number | null;
  revisions: unknown[];
  memory: unknown;
  [key: string]: unknown;
}

export function normalizeMemoryEntryPayload(entry: any, extras: Record<string, unknown> = {}): NormalizedMemoryEntryPayload {
  if (!entry || typeof entry !== 'object') {
    return { ...extras, id: null, kind: null, title: null, summary: '', content: '', status: null, importance: null, confidence: null, revisions: [], memory: entry ?? null } as NormalizedMemoryEntryPayload;
  }

  const payload = {
    ...extras,
    id: entry.id ?? null,
    kind: entry.kind ?? null,
    title: entry.title ?? null,
    summary: entry.summary ?? '',
    content: entry.content ?? '',
    status: entry.status ?? null,
    importance: entry.importance ?? null,
    confidence: entry.confidence ?? null,
    revisions: Array.isArray(entry.revisions) ? entry.revisions : [],
    memory: entry
  };
  return stripEmptyFields(payload) as NormalizedMemoryEntryPayload;
}

export interface NormalizedDeleteResult {
  id: string | null;
  deleted: boolean;
}

export function normalizeDeleteResult(result: any, fallback: { id?: string } = {}): NormalizedDeleteResult {
  return {
    id: result?.id ?? fallback.id ?? null,
    deleted: Boolean(result?.deleted)
  };
}

export interface NormalizedMemoryEventsResult {
  count: number;
  items: unknown[];
  [key: string]: unknown;
}

export function normalizeMemoryEventsResult(result: any): NormalizedMemoryEventsResult {
  const items = Array.isArray(result?.items) ? result.items : [];
  // quick 260415-n69: PaginatedResult wrap.
  const paginated = ensurePaginatedShape(items, {
    total: Number.isFinite(result?.total_count) ? result.total_count : items.length,
    limit: Number.isFinite(result?.limit) ? result.limit : items.length,
    offset: Number.isFinite(result?.offset) ? result.offset : 0
  });
  return {
    ...result,
    ...paginated,
    count: paginated.count,
    items: paginated.items
  };
}

export interface NormalizedMemorySuggestionResult {
  id: string;
  source_title: string | null;
  count: number;
  threshold: number;
  using_embeddings: boolean;
  suggestions: unknown[];
  [key: string]: unknown;
}

export function normalizeMemorySuggestionResult(result: any, id: string, threshold: number): NormalizedMemorySuggestionResult {
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];
  // quick 260415-n69: alias suggestions as items + PaginatedResult wrap.
  const paginated = ensurePaginatedShape(suggestions, { total: suggestions.length });
  return {
    ...result,
    ...paginated,
    id: result?.id ?? id,
    source_title: result?.source_title || null,
    count: paginated.count,
    threshold: result?.threshold ?? threshold,
    using_embeddings: Boolean(result?.using_embeddings),
    suggestions,
    items: paginated.items
  };
}

export interface NormalizedRelationResult {
  source_id: string;
  target_id: string;
  relation_type: string;
}

export function normalizeRelationResult(result: any, fallback: { source_id: string; target_id: string; relation_type: string }): NormalizedRelationResult {
  return {
    source_id: result?.source_id ?? fallback.source_id,
    target_id: result?.target_id ?? fallback.target_id,
    relation_type: result?.relation_type ?? fallback.relation_type
  };
}

export interface NormalizedRelationRemovalResult {
  removed: boolean;
  source_id: string;
  target_id: string;
}

export function normalizeRelationRemovalResult(result: any, fallback: { source_id: string; target_id: string }): NormalizedRelationRemovalResult {
  return {
    removed: Boolean(result?.removed),
    source_id: result?.source_id ?? fallback.source_id,
    target_id: result?.target_id ?? fallback.target_id
  };
}

export interface NormalizedRelatedMemoriesResult {
  id: string;
  count: number;
  related: unknown[];
  [key: string]: unknown;
}

export function normalizeRelatedMemoriesResult(result: any, id: string): NormalizedRelatedMemoriesResult {
  const related = Array.isArray(result?.related) ? result.related : [];
  // quick 260415-n69: alias `related` as `items` + PaginatedResult wrap.
  const paginated = ensurePaginatedShape(related, { total: related.length });
  return {
    ...result,
    ...paginated,
    id: result?.id ?? id,
    count: paginated.count,
    related,
    items: paginated.items
  };
}
