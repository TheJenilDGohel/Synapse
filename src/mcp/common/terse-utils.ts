/**
 * Terse response utilities for Phase 27 (TERSE-01..04) and quick task 260415-n69.
 * Applied at the MCP tool handler layer, NOT in the service/store layer.
 */

// -----------------------------------------------------------------------
// Shape helper: wrap any items[] into PaginatedResult shape.
// Added in quick 260415-n69 — fixes the 10+ retrieval tools whose normalizers
// returned `{query, count, items}` or `{symbol, count, definitions}` style
// shapes that didn't validate against SEARCH_RESULT_SCHEMA. The helper is
// additive: it overlays total_count/limit/offset/has_more/next_offset so
// existing legacy fields (results, callers, definitions, ...) stay intact
// for backwards compat under `.passthrough()`.
// -----------------------------------------------------------------------

export interface PaginatedShape<T = unknown> {
  total_count: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  items: T[];
}

export function ensurePaginatedShape<T = unknown>(
  items: T[],
  options: { total?: number; limit?: number; offset?: number } = {}
): PaginatedShape<T> {
  const safeItems = Array.isArray(items) ? items : [];
  const count = safeItems.length;
  const total = Number.isFinite(options.total) ? (options.total as number) : count;
  const limit = Number.isFinite(options.limit) ? (options.limit as number) : count;
  const offset = Number.isFinite(options.offset) ? (options.offset as number) : 0;
  const has_more = offset + count < total;
  return {
    total_count: total,
    count,
    limit,
    offset,
    has_more,
    next_offset: has_more ? offset + count : null,
    items: safeItems
  };
}

// -----------------------------------------------------------------------
// Write-side: minimal responses
// -----------------------------------------------------------------------

interface MinimalWriteResponse {
  id: unknown;
  ok: boolean;
}

/**
 * When terse is 'minimal', reduce a full write result to {id, ok}.
 * When terse is 'verbose' or omitted, return the result unchanged.
 */
export function toMinimalWriteResponse(result: unknown, terse?: string): unknown {
  if (terse !== 'minimal') return result;

  const obj = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>;

  // Extract id — try common id field names in priority order
  const id = obj.id ?? obj.event_id ?? obj.source_id ?? null;

  // Extract ok — try common boolean indicators
  let ok: boolean;
  if (typeof obj.ok === 'boolean') {
    ok = obj.ok;
  } else if (typeof obj.skipped === 'boolean') {
    ok = !obj.skipped;
  } else if (typeof obj.deleted === 'boolean') {
    ok = obj.deleted;
  } else if (typeof obj.removed === 'boolean') {
    ok = obj.removed;
  } else if (typeof obj.invalidated === 'boolean') {
    ok = obj.invalidated;
  } else if (typeof obj.captured === 'boolean') {
    ok = obj.captured;
  } else if (obj.created === false) {
    ok = false;
  } else {
    ok = true;
  }

  return { id, ok } as MinimalWriteResponse;
}

// -----------------------------------------------------------------------
// Read-side: strip empty fields and redundant scores (TERSE-03, TERSE-04)
// Expanded in quick 260415-n69 to cover agent_id/actor_id/source_ref plus
// null last_recalled_at and zero recall_count — ~10% extra savings per item.
// -----------------------------------------------------------------------

/** Fields stripped when they are empty strings. */
const STRIP_WHEN_EMPTY = [
  'nest', 'branch', 'topic', 'feature',
  // Expanded in 260415-n69:
  'agent_id', 'actor_id', 'source_ref'
] as const;

/** Fields stripped when they are null. */
const STRIP_WHEN_NULL = ['last_recalled_at'] as const;

/** Fields stripped when they are 0. */
const STRIP_WHEN_ZERO = ['recall_count'] as const;

/** Fields stripped when they are empty arrays. */
const STRIP_WHEN_EMPTY_ARRAY = ['links', 'revisions'] as const;

/** scope_* fields that duplicate non-prefixed equivalents. */
const SCOPE_DUPLICATES = ['scope_root_path', 'scope_project_path', 'scope_branch_name'] as const;

/**
 * Strip empty taxonomy fields, redundant scope_* prefixes, raw_score when
 * score is present, and a handful of null/zero/empty-array noise fields.
 * Operates on a shallow copy — does not mutate input.
 *
 * Works on a single object (e.g. a MemoryEntry or RecallResultItem).
 * For arrays, call on each element.
 */
export function stripEmptyFields(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const src = obj as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  // Empty-string fields (TERSE-03 + 260415-n69 expansion)
  for (const key of STRIP_WHEN_EMPTY) {
    if (out[key] === '') delete out[key];
  }

  // Null fields
  for (const key of STRIP_WHEN_NULL) {
    if (out[key] === null) delete out[key];
  }

  // Zero fields (260415-n69)
  for (const key of STRIP_WHEN_ZERO) {
    if (out[key] === 0) delete out[key];
  }

  // Empty-array fields (260415-n69)
  for (const key of STRIP_WHEN_EMPTY_ARRAY) {
    if (Array.isArray(out[key]) && (out[key] as unknown[]).length === 0) delete out[key];
  }

  // TERSE-03: remove scope_* duplicates
  for (const key of SCOPE_DUPLICATES) {
    if (key in out) delete out[key];
  }

  // TERSE-04: remove raw_score when score is present
  if ('score' in out && 'raw_score' in out) {
    delete out.raw_score;
  }

  // Recurse into 'memory' field if present (RecallResultItem wraps MemoryEntry)
  if (out.memory && typeof out.memory === 'object' && !Array.isArray(out.memory)) {
    out.memory = stripEmptyFields(out.memory);
  }

  return out;
}

// -----------------------------------------------------------------------
// Read-side response_format tiers — `compact` (~50% smaller) and `lite`
// (~85% smaller). Opt-in via `response_format` on read tools. Default
// `verbose` for backwards compat. Added in quick 260415-n69.
// -----------------------------------------------------------------------

export type ReadResponseFormat = 'verbose' | 'compact' | 'lite';

/** Keys preserved in the `compact` tier. */
const COMPACT_KEEP = [
  'id', 'memory_id',
  'title', 'summary', 'tags',
  'kind', 'importance', 'score', 'raw_score',
  // Some retrieval items are shaped differently (code/triple/entity); keep
  // their identifying fields too so compact works across all SEARCH tools.
  'file', 'start_line', 'end_line',
  'subject', 'predicate', 'object', 'triple_id',
  'name', 'type'
] as const;

/** Keys preserved in the `lite` tier. */
const LITE_KEEP = [
  'id', 'memory_id',
  'title', 'score',
  'file', 'triple_id', 'name'
] as const;

/**
 * Reshape a single read-side item per the requested response format.
 * - `verbose` (default): runs `stripEmptyFields` only (backwards compat).
 * - `compact`: keeps id/title/summary/tags/kind/importance/score (~50% smaller).
 * - `lite`: keeps id/title/score (~85% smaller) — for rehydration enumeration.
 *
 * Handles nested `.memory` wrappers (RecallResultItem pattern): projects
 * both the outer and inner object so the caller sees the identifying fields
 * regardless of which layer they live on.
 */
export function applyReadFormat(item: unknown, format: ReadResponseFormat = 'verbose'): unknown {
  if (format === 'verbose') return stripEmptyFields(item);
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;

  const src = item as Record<string, unknown>;
  const nested = (src.memory && typeof src.memory === 'object' && !Array.isArray(src.memory))
    ? src.memory as Record<string, unknown>
    : null;

  const keep = format === 'compact' ? COMPACT_KEEP : LITE_KEEP;
  const out: Record<string, unknown> = {};
  for (const key of keep) {
    if (key in src && src[key] !== '' && src[key] !== null && src[key] !== undefined) {
      out[key] = src[key];
    } else if (nested && key in nested && nested[key] !== '' && nested[key] !== null && nested[key] !== undefined) {
      out[key] = nested[key];
    }
  }
  return out;
}

/**
 * Convenience: apply `applyReadFormat` to every item of a response that
 * already carries an `items` array (the PaginatedShape produced by
 * `ensurePaginatedShape`). Returns a new object so the caller can safely
 * mutate without touching the original.
 */
export function applyReadFormatToItems<T = unknown>(
  response: { items: T[]; [key: string]: unknown },
  format: ReadResponseFormat = 'verbose'
): { items: unknown[]; [key: string]: unknown } {
  const items = Array.isArray(response?.items) ? response.items : [];
  return {
    ...response,
    items: items.map((it) => applyReadFormat(it, format))
  };
}
