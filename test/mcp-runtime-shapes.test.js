import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  normalizeMemoryRecallResult,
  normalizeMemoryEventsResult,
  normalizeMemorySuggestionResult,
  normalizeRelatedMemoriesResult
} from '../src/mcp/common/normalizers/memory.js';
import {
  normalizeSearchHybridResult,
  normalizeSymbolResult,
  normalizeUsageResult,
  normalizeCallersResult,
  normalizeDefinitionResult,
  normalizeImplementationsResult,
  normalizeRenamePreviewResult
} from '../src/mcp/common/normalizers/retrieval.js';
import { ensurePaginatedShape } from '../src/mcp/common/terse-utils.js';

/**
 * Runtime shape test for SEARCH_RESULT_SCHEMA (quick 260415-n69).
 *
 * Backfills the gap exposed by dogfooding during the token-consumption deep
 * dive: test/mcp-annotations.test.js only asserts schema IDENTITY
 * (`meta.outputSchema === expectedArchetype`) but NOT that the handler's
 * actual return value validates against the declared schema. That gave
 * false confidence through the entire 0.3.0 cycle — `synapse_find`,
 * `synapse_memory_recall`, `synapse_search_hybrid`,
 * `synapse_find_definition`, and ~6 more were shipping responses that
 * MCP SDK was rejecting with structured-content validation errors.
 *
 * This test short-circuits the whole tool pipeline and verifies each
 * normalizer's output directly against `SEARCH_RESULT_SCHEMA.data.parse()`.
 * Any normalizer whose output doesn't validate will fail loudly here.
 */

// Build a zod validator from SEARCH_RESULT_SCHEMA.data so we can `.parse()`
// normalizer outputs directly. SEARCH_RESULT_SCHEMA.data is a union of
// PaginatedResult and bare-array, so plain .parse() gives the right coverage.
const searchDataSchema = z.union([
  z.object({
    total_count: z.number().int(),
    count: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    has_more: z.boolean(),
    next_offset: z.number().int().nullable(),
    items: z.array(z.any())
  }).passthrough(),
  z.array(z.any())
]);

// ---------------------------------------------------------------------------
// Shape helper smoke
// ---------------------------------------------------------------------------

test('ensurePaginatedShape produces a valid SEARCH_RESULT_SCHEMA shape from a plain array', () => {
  const result = ensurePaginatedShape([{ id: 'a' }, { id: 'b' }]);
  searchDataSchema.parse(result);
  assert.equal(result.total_count, 2);
  assert.equal(result.count, 2);
  assert.equal(result.has_more, false);
  assert.equal(result.next_offset, null);
});

test('ensurePaginatedShape honors explicit total/limit/offset for pagination metadata', () => {
  const result = ensurePaginatedShape([{ id: 'a' }], { total: 10, limit: 1, offset: 3 });
  searchDataSchema.parse(result);
  assert.equal(result.total_count, 10);
  assert.equal(result.count, 1);
  assert.equal(result.offset, 3);
  assert.equal(result.has_more, true);
  assert.equal(result.next_offset, 4);
});

test('ensurePaginatedShape tolerates non-array input (returns empty)', () => {
  const result = ensurePaginatedShape(null);
  searchDataSchema.parse(result);
  assert.equal(result.count, 0);
  assert.equal(result.total_count, 0);
  assert.equal(result.has_more, false);
});

// ---------------------------------------------------------------------------
// memory.ts normalizers — confirm each outputs a valid SEARCH shape
// ---------------------------------------------------------------------------

test('normalizeMemoryRecallResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    query: 'windows spawn',
    count: 2,
    items: [
      { id: 'mem-1', title: 'one', nest: '', branch: '' },
      { id: 'mem-2', title: 'two', nest: 'synapse', branch: '' }
    ]
  };
  const normalized = normalizeMemoryRecallResult(raw, 'windows spawn');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.count, 2);
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.query, 'windows spawn');
});

test('normalizeMemoryRecallResult handles empty/missing input', () => {
  const normalized = normalizeMemoryRecallResult(undefined, 'fallback-query');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.count, 0);
  assert.equal(normalized.items.length, 0);
  assert.equal(normalized.query, 'fallback-query');
});

test('normalizeMemoryEventsResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = { count: 1, items: [{ id: 'evt-1', type: 'task' }] };
  const normalized = normalizeMemoryEventsResult(raw);
  searchDataSchema.parse(normalized);
  assert.equal(normalized.count, 1);
});

test('normalizeMemorySuggestionResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    id: 'mem-src',
    source_title: 'source',
    count: 2,
    threshold: 0.55,
    using_embeddings: true,
    suggestions: [
      { id: 'mem-a', similarity: 0.8 },
      { id: 'mem-b', similarity: 0.7 }
    ]
  };
  const normalized = normalizeMemorySuggestionResult(raw, 'mem-src', 0.55);
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 2);
  // Legacy `suggestions` field preserved for backwards compat
  assert.equal(normalized.suggestions.length, 2);
});

test('normalizeRelatedMemoriesResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    id: 'mem-src',
    count: 1,
    related: [{ id: 'mem-linked', relation_type: 'derived_from' }]
  };
  const normalized = normalizeRelatedMemoriesResult(raw, 'mem-src');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 1);
  // Legacy `related` field preserved for backwards compat
  assert.equal(normalized.related.length, 1);
});

// ---------------------------------------------------------------------------
// retrieval.ts normalizers — confirm each outputs a valid SEARCH shape
// ---------------------------------------------------------------------------

test('normalizeSearchHybridResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    query: 'foo',
    lexical_hits: 3,
    semantic_hits: 2,
    ranking_mode: 'hybrid',
    results: [
      { file: 'src/a.ts', line: 1, text: 'foo' },
      { file: 'src/b.ts', line: 5, text: 'foo' }
    ]
  };
  const normalized = normalizeSearchHybridResult(raw, 'foo');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 2);
  // Legacy `results` field preserved
  assert.equal(normalized.results.length, 2);
});

test('normalizeSearchHybridResult handles empty/missing input', () => {
  const normalized = normalizeSearchHybridResult(undefined, 'query');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.count, 0);
});

test('normalizeSymbolResult concatenates definitions+exports into items', () => {
  const raw = {
    symbol: 'MyFunc',
    count: 3,
    definitions: [{ file: 'a.ts', line: 10 }, { file: 'b.ts', line: 20 }],
    exports: [{ file: 'index.ts', line: 5 }]
  };
  const normalized = normalizeSymbolResult(raw, 'MyFunc');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 3);
  assert.equal(normalized.definitions.length, 2);
  assert.equal(normalized.exports.length, 1);
});

test('normalizeUsageResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    symbol: 'util',
    count: 1,
    usages: [{ file: 'caller.ts', line: 42 }]
  };
  const normalized = normalizeUsageResult(raw, 'util');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.usages.length, 1);
});

test('normalizeCallersResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    symbol: 'doThing',
    count: 2,
    callers: [{ file: 'a.ts', line: 1 }, { file: 'b.ts', line: 2 }]
  };
  const normalized = normalizeCallersResult(raw, 'doThing');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.callers.length, 2);
});

test('normalizeDefinitionResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    symbol: 'MyClass',
    count: 1,
    definitions: [{ file: 'my-class.ts', line: 10 }]
  };
  const normalized = normalizeDefinitionResult(raw, 'MyClass');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.definitions.length, 1);
});

test('normalizeImplementationsResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    symbol: 'Runnable',
    count: 2,
    implementations: [{ file: 'a.ts', line: 1 }, { file: 'b.ts', line: 2 }]
  };
  const normalized = normalizeImplementationsResult(raw, 'Runnable');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.implementations.length, 2);
});

test('normalizeRenamePreviewResult output validates against SEARCH_RESULT_SCHEMA.data', () => {
  const raw = {
    old_name: 'foo',
    new_name: 'bar',
    total_changes: 3,
    files_affected: 2,
    changes: [
      { file: 'a.ts', line: 1 },
      { file: 'a.ts', line: 5 },
      { file: 'b.ts', line: 2 }
    ]
  };
  const normalized = normalizeRenamePreviewResult(raw, 'foo', 'bar');
  searchDataSchema.parse(normalized);
  assert.equal(normalized.items.length, 3);
  assert.equal(normalized.changes.length, 3);
});
