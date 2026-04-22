import { z } from 'zod';

export const RESPONSE_FORMAT_SCHEMA = z.enum(['json', 'markdown']).default('json');
export const MEMORY_KIND_SCHEMA = z.enum(['knowledge', 'preference', 'feedback']).default('knowledge');
export const MEMORY_STATUS_SCHEMA = z.enum(['active', 'stale', 'archived']).default('active');
export const MEMORY_SCOPE_SCHEMA = z.object({
  root_path: z.string().optional(),
  project_path: z.string().optional(),
  branch_name: z.string().optional(),
  topic: z.string().optional(),
  feature: z.string().optional()
}).default({});
export const MEMORY_LINK_SCHEMA = z.object({
  path: z.string(),
  line: z.number().int().min(1).optional(),
  label: z.string().optional()
});
export const MEMORY_EVENT_TYPE_SCHEMA = z.enum([
  'task',
  'bugfix',
  'decision',
  'review',
  'preference'
]).default('task');
export const MEMORY_EVENT_STATUS_SCHEMA = z.enum([
  'in_progress',
  'completed',
  'resolved',
  'ignored',
  'merged'
]).default('completed');

export type ResponseFormat = z.infer<typeof RESPONSE_FORMAT_SCHEMA>;
export type MemoryKind = z.infer<typeof MEMORY_KIND_SCHEMA>;
export type MemoryStatus = z.infer<typeof MEMORY_STATUS_SCHEMA>;
export type MemoryScope = z.infer<typeof MEMORY_SCOPE_SCHEMA>;
export type MemoryLink = z.infer<typeof MEMORY_LINK_SCHEMA>;
export type MemoryEventType = z.infer<typeof MEMORY_EVENT_TYPE_SCHEMA>;
export type MemoryEventStatus = z.infer<typeof MEMORY_EVENT_STATUS_SCHEMA>;

// ---- Phase 40: Output archetypes ----
//
// Shared output-schema archetype library for every MCP tool's structured
// response envelope. Each archetype is a plain `{ data, meta }` object whose
// `data` field is a zod schema tuned to a tool-response shape category and
// whose `meta` field is the shared META_SCHEMA.
//
// ENTITY_RESULT_SCHEMA is intentionally NOT shipped in v0.3.0 — Plan 02's
// per-tool audit found zero consumers (every KG-entity-shaped response flows
// through TRIPLE or BUNDLE). Phase 42 / 45 can add it when a real need
// emerges. See 40-01-PLAN.md <archetype_specification> for the authoritative
// rationale.

/**
 * PAGINATION_META_SCHEMA — optional pagination block embedded inside META_SCHEMA.
 * Matches the shape of `PaginatedResult<T>` in tool-utils.ts minus `items`.
 * `.passthrough()` because some normalizers attach extra pagination hints.
 */
export const PAGINATION_META_SCHEMA = z.object({
  total_count: z.number().int().optional(),
  count: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  has_more: z.boolean().optional(),
  next_offset: z.number().int().nullable().optional()
}).passthrough();

/**
 * META_SCHEMA — shape of the `meta` field on every structured tool response.
 * `toolResult()` in tool-utils.ts merges caller-provided meta on top of
 * `{ schema_version }`, so extra normalizer keys must pass through without
 * strict-mode rejection. Only `schema_version` is guaranteed present.
 */
export const META_SCHEMA = z.object({
  schema_version: z.string(),
  pagination: PAGINATION_META_SCHEMA.optional(),
  tool: z.string().optional(),
  query: z.string().optional(),
  count: z.number().int().optional(),
  scope: z.record(z.string(), z.any()).optional(),
  guidance: z.array(z.string()).optional(),
  recommended_next_action: z.string().optional()
}).passthrough();

/**
 * 1. SEARCH_RESULT_SCHEMA — paginated items + filter metadata.
 * Applies to every list/search/paginated tool (~28 tools). Accepts either
 * a full PaginatedResult envelope or a bare array fallback for normalizers
 * that return raw lists on success.
 */
export const SEARCH_RESULT_SCHEMA = {
  data: z.union([
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
  ]),
  meta: META_SCHEMA
} as const;

/**
 * 2. TRIPLE_RESULT_SCHEMA — single or list of KG triples with temporal fields.
 * Applies to kg_add_triple (single), kg_query (relationships), kg_as_of,
 * kg_timeline.
 */
export const TRIPLE_RESULT_SCHEMA = {
  data: z.union([
    z.object({
      id: z.string(),
      subject_id: z.string().optional(),
      predicate: z.string().optional(),
      object_id: z.string().optional(),
      valid_from: z.string().nullable().optional(),
      valid_to: z.string().nullable().optional()
    }).passthrough(),
    z.array(z.object({ id: z.string() }).passthrough()),
    z.object({ items: z.array(z.any()) }).passthrough()
  ]),
  meta: META_SCHEMA
} as const;

/**
 * 3. STATUS_RESULT_SCHEMA — runtime / index / embed / hooks status.
 * Heterogeneous status payloads — always an object, keys vary by tool.
 */
export const STATUS_RESULT_SCHEMA = {
  data: z.record(z.string(), z.any()),
  meta: META_SCHEMA
} as const;

/**
 * 4. BATCH_RESULT_SCHEMA — transactional write summary.
 * Applies to every batch write + delete tool (kg_add_entities_batch,
 * kg_add_triples_batch, memory_store_batch, memory_delete_batch, etc.).
 */
export const BATCH_RESULT_SCHEMA = {
  data: z.object({
    created: z.number().int().optional(),
    duplicates: z.number().int().optional(),
    deleted: z.number().int().optional(),
    errors: z.array(z.object({
      index: z.number().int().optional(),
      message: z.string()
    }).passthrough()).optional(),
    ids: z.array(z.string().nullable()).optional()
  }).passthrough(),
  meta: META_SCHEMA
} as const;

/**
 * 5. MEMORY_RESULT_SCHEMA — single memory entry + optional linkage metadata.
 * Applies to memory_get, memory_store (verbose), memory_update,
 * memory_capture_event, capture_outcome, teach.
 */
export const MEMORY_RESULT_SCHEMA = {
  data: z.object({
    id: z.string().optional(),
    memory_id: z.string().optional(),
    kind: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
    importance: z.number().optional(),
    confidence: z.number().optional(),
    created: z.boolean().optional(),
    duplicate: z.boolean().optional(),
    updated: z.boolean().optional(),
    auto_linked_entities: z.array(z.any()).optional(),
    auto_triples: z.array(z.any()).optional()
  }).passthrough(),
  meta: META_SCHEMA
} as const;

/**
 * 6. ACK_RESULT_SCHEMA — minimal `{id, ok}` write acknowledgements.
 * Applies to kg_add_entity, kg_invalidate, memory_add_relation,
 * memory_remove_relation, memory_delete (single), diary_write, update_self,
 * and any `terse: minimal` single-write response.
 */
export const ACK_RESULT_SCHEMA = {
  data: z.object({
    id: z.string().optional(),
    ok: z.boolean().optional(),
    source_id: z.string().optional(),
    target_id: z.string().optional(),
    relation_type: z.string().optional()
  }).passthrough(),
  meta: META_SCHEMA
} as const;

/**
 * 7. BUNDLE_RESULT_SCHEMA — structured multi-key bundle (object, not list).
 * Applies to task_context, agent_prime, whats_new, audit, nest_list,
 * nest_branches, nest_tree, project_tree, summarize_project, read_file,
 * file_changed, memory_check_duplicate, graph_traverse, graph_bridges,
 * memory_suggest_relations, memory_related, memory_events (bundle-shaped
 * returns). "Typed-enough" to say it's an object with arbitrary keys.
 */
export const BUNDLE_RESULT_SCHEMA = {
  data: z.record(z.string(), z.any()),
  meta: META_SCHEMA
} as const;

/**
 * 8. FREEFORM_RESULT_SCHEMA — escape hatch. Budget: <=5 tools.
 * Applies to usage_guide, help, diary_read (raw service output, no stable
 * shape guarantees). Also the fallback used by createJsonToolRegistrar when
 * a tool does not declare an outputSchema, so Plan 02's per-tool test can
 * assert identity equality against this exact object.
 */
export const FREEFORM_RESULT_SCHEMA = {
  data: z.any(),
  meta: z.any().optional()
} as const;

export type SearchResult = z.infer<typeof SEARCH_RESULT_SCHEMA.data>;
export type TripleResult = z.infer<typeof TRIPLE_RESULT_SCHEMA.data>;
export type StatusResult = z.infer<typeof STATUS_RESULT_SCHEMA.data>;
export type BatchResult = z.infer<typeof BATCH_RESULT_SCHEMA.data>;
export type MemoryResult = z.infer<typeof MEMORY_RESULT_SCHEMA.data>;
export type AckResult = z.infer<typeof ACK_RESULT_SCHEMA.data>;
export type BundleResult = z.infer<typeof BUNDLE_RESULT_SCHEMA.data>;
export type FreeformResult = z.infer<typeof FREEFORM_RESULT_SCHEMA.data>;
