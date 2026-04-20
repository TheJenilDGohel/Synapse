import { z } from 'zod';
import {
  normalizeDeleteResult,
  normalizeMemoryEventsResult,
  normalizeMemoryEntryPayload,
  normalizeMemoryRecallResult,
  normalizeMemorySuggestionResult,
  normalizeRelatedMemoriesResult,
  normalizeRelationRemovalResult,
  normalizeRelationResult
} from '../common/response-normalizers.js';
import { applyReadFormatToItems, toMinimalWriteResponse } from '../common/terse-utils.js';
import type { ReadResponseFormat } from '../common/terse-utils.js';
import {
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS
} from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import type {
  MemoryKind,
  MemoryStatus as MemoryStatusType,
  MemoryScope,
  MemoryLink,
  MemoryEventType,
  MemoryEventStatus
} from '../common/schemas.js';

interface MemoryService {
  listEntries(opts: Record<string, unknown>): Promise<unknown>;
  getEntry(id: string): Promise<unknown>;
  storeEntry(args: Record<string, unknown>): Promise<{ memory?: unknown; created?: boolean; duplicate?: boolean } | null>;
  storeEntryBatch(args: { memories: Array<Record<string, unknown>>; response_format?: 'minimal' | 'verbose' }): Promise<{ created: number; duplicates: number; errors: Array<{ index: number; message: string }>; ids?: (string | null)[] }>;
  updateEntry(id: string, patch: Record<string, unknown>): Promise<unknown>;
  deleteEntry(id: string): Promise<unknown>;
  deleteEntryBatch(args: { ids: string[] }): Promise<{ deleted: number; errors: Array<{ index: number; message: string }> }>;
  captureEvent(args: Record<string, unknown>): Promise<unknown>;
  listEvents(opts: Record<string, unknown>): Promise<unknown>;
  suggestRelations(id: string, opts: { threshold: number; maxResults: number }): Promise<unknown>;
  addRelation(sourceId: string, targetId: string, relationType: string): Promise<unknown>;
  removeRelation(sourceId: string, targetId: string): Promise<unknown>;
  getRelated(id: string): Promise<unknown>;
}

type OutputArchetype = { data: z.ZodTypeAny; meta: z.ZodTypeAny };
interface SharedSchemas {
  MEMORY_KIND_SCHEMA: z.ZodType<MemoryKind>;
  MEMORY_STATUS_SCHEMA: z.ZodType<MemoryStatusType>;
  MEMORY_SCOPE_SCHEMA: z.ZodType<MemoryScope>;
  MEMORY_LINK_SCHEMA: z.ZodType<MemoryLink>;
  MEMORY_EVENT_TYPE_SCHEMA: z.ZodType<MemoryEventType>;
  MEMORY_EVENT_STATUS_SCHEMA: z.ZodType<MemoryEventStatus>;
  OUTPUT_SEARCH_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_TRIPLE_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_STATUS_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_BATCH_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_MEMORY_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_ACK_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_BUNDLE_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_FREEFORM_RESULT_SCHEMA: OutputArchetype;
}

export interface RegisterMemoryStoreToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  schemas: SharedSchemas;
  memory: MemoryService;
}

export function registerMemoryStoreTools({
  registerJsonTool,
  schemas,
  memory
}: RegisterMemoryStoreToolsOptions): void {
  const {
    MEMORY_KIND_SCHEMA,
    MEMORY_STATUS_SCHEMA,
    MEMORY_SCOPE_SCHEMA,
    MEMORY_LINK_SCHEMA,
    MEMORY_EVENT_TYPE_SCHEMA,
    MEMORY_EVENT_STATUS_SCHEMA
  } = schemas;

  registerJsonTool(
    ['synapse_memory_list'],
    {
      title: 'Memory List',
      description: 'List stored memories with optional scope, kind, nest, branch, and tag filters. Use item_format=compact to drop content/metadata (~50% fewer tokens) or lite to return only id+title (~85% fewer tokens).',
      inputSchema: {
        kind: MEMORY_KIND_SCHEMA.optional(),
        status: MEMORY_STATUS_SCHEMA.optional(),
        project_path: z.string().optional(),
        topic: z.string().optional(),
        nest: z.string().optional(),
        branch: z.string().optional(),
        actor_id: z.string().max(200).optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(200).default(20),
        offset: z.number().int().min(0).default(0),
        // quick 260415-n69: opt-in token savings via item_format tiers.
        // `verbose` (default) preserves backwards compat; `compact` keeps
        // id/title/summary/tags/kind/importance (~50% smaller); `lite`
        // keeps id/title only (~85% smaller). Named `item_format` to avoid
        // collision with createJsonToolRegistrar's auto-injected
        // `response_format: json|markdown` serialization parameter.
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ kind, status, project_path, topic, nest, branch, actor_id, tags, limit, offset, item_format }: Record<string, unknown>) => applyReadFormatToItems(
      normalizeMemoryRecallResult(
        await memory.listEntries({
          kind,
          status,
          projectPath: project_path,
          topic,
          nest,
          branch,
          actorId: actor_id as string | undefined,
          tags,
          limit,
          offset
        })
      ),
      (item_format as ReadResponseFormat | undefined) ?? 'verbose'
    )
  );

  registerJsonTool(
    ['synapse_memory_get'],
    {
      title: 'Memory Get',
      description: 'Fetch one stored memory with revision history.',
      inputSchema: {
        id: z.string().min(1)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ id }: Record<string, unknown>) => {
      const item = await memory.getEntry(id as string);
      if (!item) {
        throw new Error(`memory not found: ${id}`);
      }
      return normalizeMemoryEntryPayload(item);
    }
  );

  registerJsonTool(
    ['synapse_memory_store'],
    {
      title: 'Memory Store',
      description: 'Store a durable local memory entry.',
      inputSchema: {
        title: z.string().min(1).max(400),
        content: z.string().min(1).max(20000),
        kind: MEMORY_KIND_SCHEMA.optional(),
        summary: z.string().max(4000).optional(),
        status: MEMORY_STATUS_SCHEMA.optional(),
        importance: z.number().int().min(0).max(100).optional(),
        confidence: z.number().min(0).max(1).optional(),
        tags: z.array(z.string()).max(50).optional(),
        links: z.array(MEMORY_LINK_SCHEMA).max(50).optional(),
        scope: MEMORY_SCOPE_SCHEMA.optional(),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        actor_id: z.string().max(200).optional(),
        source_type: z.string().max(60).optional(),
        source_ref: z.string().max(1000).optional(),
        change_note: z.string().max(400).optional(),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ terse, ...args }: Record<string, unknown>) => {
      const result = await memory.storeEntry(args);
      const r = result as Record<string, unknown>;
      const normalized = normalizeMemoryEntryPayload(
        r?.memory || null,
        {
          created: Boolean(r?.created),
          duplicate: Boolean(r?.duplicate)
        }
      );
      const response = toMinimalWriteResponse(normalized, terse as string);
      // FUSE-03: Attach auto-link results when present
      if (r?.auto_linked_entities) {
        (response as Record<string, unknown>).auto_linked_entities = r.auto_linked_entities;
      }
      if (r?.auto_triples) {
        (response as Record<string, unknown>).auto_triples = r.auto_triples;
      }
      return response;
    }
  );

  registerJsonTool(
    ['synapse_memory_update'],
    {
      title: 'Memory Update',
      description: 'Update a stored memory entry and append a revision.',
      inputSchema: {
        id: z.string().min(1),
        kind: MEMORY_KIND_SCHEMA.optional(),
        title: z.string().min(1).max(400).optional(),
        summary: z.string().max(4000).optional(),
        content: z.string().min(1).max(20000).optional(),
        status: MEMORY_STATUS_SCHEMA.optional(),
        importance: z.number().int().min(0).max(100).optional(),
        confidence: z.number().min(0).max(1).optional(),
        tags: z.array(z.string()).max(50).optional(),
        links: z.array(MEMORY_LINK_SCHEMA).max(50).optional(),
        scope: MEMORY_SCOPE_SCHEMA.optional(),
        source_type: z.string().max(60).optional(),
        source_ref: z.string().max(1000).optional(),
        change_note: z.string().max(400).default('Memory updated'),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ id, terse, ...patch }: Record<string, unknown>) => {
      const result = await memory.updateEntry(id as string, patch);
      return toMinimalWriteResponse(normalizeMemoryEntryPayload(result, { updated: true }), terse as string);
    }
  );

  registerJsonTool(
    ['synapse_memory_delete'],
    {
      title: 'Memory Delete',
      description: 'Delete a stored memory entry and all of its revisions.',
      inputSchema: {
        id: z.string().min(1),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ id, terse }: Record<string, unknown>) => toMinimalWriteResponse(normalizeDeleteResult(await memory.deleteEntry(id as string), { id: id as string }), terse as string)
  );

  registerJsonTool(
    ['synapse_memory_delete_batch'],
    {
      title: 'Memory Delete Batch',
      description: 'Delete up to 100 memory entries in a single call. Returns the count of deleted entries and per-row errors for IDs that were not found or failed.',
      inputSchema: {
        ids: z.array(z.string().min(1)).min(1).max(100)
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ ids }: Record<string, unknown>) => {
      return memory.deleteEntryBatch({ ids: ids as string[] });
    }
  );

  registerJsonTool(
    ['synapse_memory_capture_event'],
    {
      title: 'Memory Capture Event',
      description: 'Ingest a background work event and auto-promote meaningful events into durable memory.',
      inputSchema: {
        event_type: MEMORY_EVENT_TYPE_SCHEMA,
        status: MEMORY_EVENT_STATUS_SCHEMA,
        title: z.string().min(1).max(400),
        summary: z.string().max(4000).default(''),
        content: z.string().max(20000).default(''),
        kind: MEMORY_KIND_SCHEMA.optional(),
        importance: z.number().int().min(0).max(100).optional(),
        confidence: z.number().min(0).max(1).optional(),
        files_changed: z.number().int().min(0).max(10000).default(0),
        has_tests: z.boolean().default(false),
        tags: z.array(z.string()).max(50).default([]),
        links: z.array(MEMORY_LINK_SCHEMA).max(50).default([]),
        scope: MEMORY_SCOPE_SCHEMA,
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        source_ref: z.string().max(1000).default(''),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ terse, ...args }: Record<string, unknown>) => toMinimalWriteResponse(await memory.captureEvent(args), terse as string)
  );

  registerJsonTool(
    ['synapse_memory_events'],
    {
      title: 'Memory Events',
      description: 'List recently captured memory events and whether they were promoted into durable memory.',
      inputSchema: {
        project_path: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(20),
        offset: z.number().int().min(0).default(0)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ project_path, limit, offset }: Record<string, unknown>) => normalizeMemoryEventsResult(
      await memory.listEvents({
        projectPath: project_path,
        limit,
        offset
      })
    )
  );

  registerJsonTool(
    ['synapse_memory_suggest_relations'],
    {
      title: 'Memory Suggest Relations',
      description: 'Find semantically similar memory entries that could be linked to a given memory. Uses dense embeddings (all-MiniLM-L6-v2) when available, falls back to token overlap. Returns candidates ranked by similarity without creating any relations — use synapse_memory_add_relation to confirm.',
      inputSchema: {
        id: z.string().min(1),
        threshold: z.number().min(0).max(1).default(0.55),
        max_results: z.number().int().min(1).max(50).default(10)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ id, threshold, max_results }: Record<string, unknown>) => normalizeMemorySuggestionResult(
      await memory.suggestRelations(id as string, { threshold: threshold as number, maxResults: max_results as number }),
      id as string,
      threshold as number
    )
  );

  registerJsonTool(
    ['synapse_memory_add_relation'],
    {
      title: 'Memory Add Relation',
      description: 'Link two memory entries with a named relation. Use to build a traversable knowledge graph (e.g. "depends_on", "contradicts", "supersedes", "related").',
      inputSchema: {
        source_id: z.string().min(1),
        target_id: z.string().min(1),
        relation_type: z.string().min(1).max(60).default('related'),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ source_id, target_id, relation_type, terse }: Record<string, unknown>) => {
      const result = await memory.addRelation(source_id as string, target_id as string, relation_type as string);
      return toMinimalWriteResponse(normalizeRelationResult(result, { source_id: source_id as string, target_id: target_id as string, relation_type: relation_type as string }), terse as string);
    }
  );

  registerJsonTool(
    ['synapse_memory_remove_relation'],
    {
      title: 'Memory Remove Relation',
      description: 'Remove a relation between two memory entries.',
      inputSchema: {
        source_id: z.string().min(1),
        target_id: z.string().min(1),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ source_id, target_id, terse }: Record<string, unknown>) => {
      const result = await memory.removeRelation(source_id as string, target_id as string);
      return toMinimalWriteResponse(normalizeRelationRemovalResult(result, { source_id: source_id as string, target_id: target_id as string }), terse as string);
    }
  );

  registerJsonTool(
    ['synapse_memory_related'],
    {
      title: 'Memory Related',
      description: 'Return all memory entries linked to a given memory ID, traversing the knowledge graph one hop in both directions.',
      inputSchema: {
        id: z.string().min(1)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ id }: Record<string, unknown>) => normalizeRelatedMemoriesResult(await memory.getRelated(id as string), id as string)
  );

  registerJsonTool(
    ['synapse_memory_store_batch'],
    {
      title: 'Memory Store Batch',
      description: 'Store up to 100 memory entries in a single atomic transaction. Deduplicates via fingerprint and optional semantic similarity. Returns created/duplicate counts and per-row validation errors.',
      inputSchema: {
        memories: z.array(z.object({
          kind: MEMORY_KIND_SCHEMA.optional(),
          title: z.string().max(400).optional(),
          summary: z.string().max(4000).optional(),
          content: z.string().min(1).max(20000),
          status: MEMORY_STATUS_SCHEMA.optional(),
          importance: z.number().int().min(0).max(100).optional(),
          confidence: z.number().min(0).max(1).optional(),
          tags: z.array(z.string()).max(50).optional(),
          links: z.array(MEMORY_LINK_SCHEMA).max(50).optional(),
          scope: MEMORY_SCOPE_SCHEMA.optional(),
          nest: z.string().max(200).optional(),
          branch: z.string().max(200).optional(),
          agent_id: z.string().max(200).optional(),
          actor_id: z.string().max(200).optional(),
          source_type: z.string().max(60).optional(),
          source_ref: z.string().max(1000).optional(),
          change_note: z.string().max(400).optional(),
          dedup_threshold: z.number().min(0).max(1).optional()
        })).min(1).max(100),
        response_format: z.enum(['minimal', 'verbose']).default('minimal')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ memories, response_format }: Record<string, unknown>) => {
      return memory.storeEntryBatch({
        memories: memories as Array<Record<string, unknown>>,
        response_format: response_format as 'minimal' | 'verbose'
      });
    }
  );
}
