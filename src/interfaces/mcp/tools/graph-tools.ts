import { z } from 'zod';
import { MemoryHooks } from '../../../core/engine/index.js';
import {
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS
} from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import {
  toMinimalWriteResponse,
  applyReadFormatToItems,
  applyReadFormatToBundle
} from '../common/terse-utils.js';
import type { ReadResponseFormat } from '../common/terse-utils.js';

type OutputArchetype = { data: z.ZodTypeAny; meta: z.ZodTypeAny };
interface SharedSchemas {
  OUTPUT_SEARCH_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_TRIPLE_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_STATUS_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_BATCH_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_MEMORY_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_ACK_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_BUNDLE_RESULT_SCHEMA: OutputArchetype;
  OUTPUT_FREEFORM_RESULT_SCHEMA: OutputArchetype;
}

interface MemoryService {
  addEntity(opts: Record<string, unknown>): Promise<unknown>;
  addTriple(opts: Record<string, unknown>): Promise<unknown>;
  addEntityBatch(opts: Record<string, unknown>): Promise<unknown>;
  addTripleBatch(opts: Record<string, unknown>): Promise<unknown>;
  listEntities(opts: Record<string, unknown>): Promise<unknown>;
  queryEntityRelationships(entityId: string, opts: Record<string, unknown>): Promise<unknown>;
  invalidateTriple(tripleId: string, validTo?: string | null): Promise<unknown>;
  queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction'): Promise<unknown>;
  getEntityTimeline(entityId: string): Promise<unknown>;
  getKgStats(): Promise<unknown>;
  listNests(): Promise<unknown>;
  listBranches(nest: string): Promise<unknown>;
  getTaxonomyTree(): Promise<unknown>;
  manageBranches(opts: Record<string, unknown>): Promise<unknown>;
  traverseGraph(opts: Record<string, unknown>): Promise<unknown>;
  discoverBridges(opts: Record<string, unknown>): Promise<unknown>;
  writeDiaryEntry(opts: Record<string, unknown>): Promise<unknown>;
  readDiaryEntries(opts: Record<string, unknown>): Promise<unknown>;
  ingestMarkdown(opts: Record<string, unknown>): Promise<unknown>;
  ingestJson(opts: Record<string, unknown>): Promise<unknown>;
  checkDuplicate(content: string, opts: Record<string, unknown>): Promise<unknown>;
  backfillMemoryKgLinks(opts: Record<string, unknown>): Promise<unknown>;
  store: {
    hooks: MemoryHooks;
  };
}

export interface RegisterGraphToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory: MemoryService;
  schemas: SharedSchemas;
}

export function registerGraphTools({
  registerJsonTool,
  memory,
  schemas
}: RegisterGraphToolsOptions): void {
  // --- KG Tools (synapse_kg_*) ---

  registerJsonTool(
    ['synapse_kg_add_entity'],
    {
      title: 'KG Add Entity',
      description: 'Create or update a KG entity. IDs are auto-generated as normalized slugs.',
      inputSchema: {
        name: z.string().min(1).max(400),
        type: z.string().max(100).default('concept'),
        properties: z.record(z.string(), z.any()).default({}),
        memory_id: z.string().optional(),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ name, type, properties, memory_id, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.addEntity({ name, type, properties, memoryId: memory_id }), terse as string)
  );

  registerJsonTool(
    ['synapse_kg_add_triple'],
    {
      title: 'KG Add Triple',
      description: 'Add a subject-predicate-object triple. Entities are auto-created. Detects contradictions.',
      inputSchema: {
        subject_name: z.string().min(1).max(400),
        predicate: z.string().min(1).max(400),
        object_name: z.string().min(1).max(400),
        subject_id: z.string().max(400).optional(),
        object_id: z.string().max(400).optional(),
        valid_from: z.string().nullable().optional(),
        valid_to: z.string().nullable().optional(),
        confidence: z.number().min(0).max(1).default(1.0),
        source_memory_id: z.string().nullable().optional(),
        source_type: z.string().max(100).default('manual'),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_TRIPLE_RESULT_SCHEMA
    },
    async ({ subject_name, predicate, object_name, subject_id, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.addTriple({
        subjectName: subject_name, subjectId: subject_id, predicate,
        objectName: object_name, objectId: object_id,
        validFrom: valid_from, validTo: valid_to, confidence,
        sourceMemoryId: source_memory_id, sourceType: source_type
      }), terse as string)
  );

  registerJsonTool(
    ['synapse_kg_add_entities_batch'],
    {
      title: 'KG Add Entities Batch',
      description: 'Create up to 500 entities in a single transactional batch. Returns created/duplicate counts and per-row errors. Use response_format "verbose" to get back an ids[] array.',
      inputSchema: {
        entities: z.array(z.object({
          name: z.string().min(1).max(400), type: z.string().max(100).default('concept'),
          properties: z.record(z.string(), z.any()).default({}), memory_id: z.string().optional()
        })).min(1).max(500),
        response_format: z.enum(['minimal', 'verbose']).default('minimal')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ entities, response_format }: Record<string, unknown>) =>
      memory.addEntityBatch({
        entities: (entities as Array<Record<string, unknown>>).map(e => ({
          name: e.name, type: e.type, properties: e.properties, memoryId: e.memory_id
        })),
        response_format
      })
  );

  registerJsonTool(
    ['synapse_kg_add_triples_batch'],
    {
      title: 'KG Add Triples Batch',
      description: 'Transactional batch add of triples (up to 500). Entities auto-created.',
      inputSchema: {
        triples: z.array(z.object({
          subject_name: z.string().min(1).max(400), predicate: z.string().min(1).max(400),
          object_name: z.string().min(1).max(400), subject_id: z.string().max(400).optional(),
          object_id: z.string().max(400).optional(), valid_from: z.string().nullable().optional(),
          valid_to: z.string().nullable().optional(), confidence: z.number().min(0).max(1).default(1.0),
          source_memory_id: z.string().nullable().optional(), source_type: z.string().max(100).default('manual')
        })).min(1).max(500),
        response_format: z.enum(['minimal', 'verbose']).default('minimal')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ triples, response_format }: Record<string, unknown>) =>
      memory.addTripleBatch({
        triples: (triples as Array<Record<string, unknown>>).map(t => ({
          subjectName: t.subject_name, subjectId: t.subject_id, predicate: t.predicate,
          objectName: t.object_name, objectId: t.object_id, validFrom: t.valid_from,
          validTo: t.valid_to, confidence: t.confidence,
          sourceMemoryId: t.source_memory_id, sourceType: t.source_type
        })),
        response_format
      })
  );

  registerJsonTool(
    ['synapse_kg_list_entities'],
    {
      title: 'KG List Entities',
      description: 'List knowledge-graph entities with optional type and fuzzy-name filters so callers can discover valid entity IDs before querying relationships.',
      inputSchema: {
        type: z.string().max(100).optional(),
        name_contains: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(200).default(20),
        offset: z.number().int().min(0).default(0),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ type, name_contains, limit, offset, item_format }: Record<string, unknown>) =>
      applyReadFormatToItems(
        await memory.listEntities({ type, nameContains: name_contains, limit, offset }),
        (item_format as ReadResponseFormat | undefined) ?? 'verbose'
      )
  );

  registerJsonTool(
    ['synapse_kg_query'],
    {
      title: 'KG Query Entity',
      description: 'Query all relationships for an entity in the knowledge graph with optional direction filtering (outgoing, incoming, or both).',
      inputSchema: {
        entity_id: z.string().min(1).max(400),
        direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
        include_invalid: z.boolean().default(false),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async (args: Record<string, unknown>) =>
      applyReadFormatToBundle(
        await memory.queryEntityRelationships(args.entity_id as string, {
          direction: args.direction as any,
          includeInvalid: args.include_invalid as boolean
        }),
        (args.item_format as ReadResponseFormat | undefined) ?? 'verbose'
      )
  );

  registerJsonTool(
    ['synapse_kg_invalidate'],
    {
      title: 'KG Invalidate Triple',
      description: 'Set valid_to on a triple to mark it as no longer current. The triple remains in history but is excluded from current-state queries.',
      inputSchema: {
        triple_id: z.string().min(1),
        valid_to: z.string().nullable().optional(),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ triple_id, valid_to, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.invalidateTriple(triple_id as string, valid_to as string | null | undefined), terse as string)
  );

  registerJsonTool(
    ['synapse_kg_as_of'],
    {
      title: 'KG As-Of Query',
      description: 'Query triples for an entity at a specific point in time. mode="event" (default) returns facts whose valid_from/valid_to bracket the date (event-time axis). mode="transaction" returns every triple Synapse knew at that time via recorded_at, regardless of valid_to (transaction-time axis).',
      inputSchema: {
        entity_id: z.string().min(1).max(400),
        as_of_date: z.string().min(1),
        mode: z.enum(['event', 'transaction']).default('event')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ entity_id, as_of_date, mode }: Record<string, unknown>) =>
      memory.queryTriplesAsOf(entity_id as string, as_of_date as string, mode as 'event' | 'transaction' | undefined)
  );

  registerJsonTool(
    ['synapse_kg_timeline'],
    {
      title: 'KG Entity Timeline',
      description: 'Get a chronological timeline of all triples for an entity, including invalidated facts. Ordered by valid_from date ascending.',
      inputSchema: {
        entity_id: z.string().min(1).max(400)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ entity_id }: Record<string, unknown>) =>
      memory.getEntityTimeline(entity_id as string)
  );

  registerJsonTool(
    ['synapse_kg_stats'],
    {
      title: 'KG Statistics',
      description: 'Get knowledge graph statistics: total entity count, total triple count, active triple count, and breakdown by predicate type.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_STATUS_RESULT_SCHEMA
    },
    async () => memory.getKgStats()
  );

  registerJsonTool(
    ['synapse_kg_backfill_links'],
    {
      title: 'KG Backfill Memory Links',
      description: 'Retroactively scan existing memories and create KG triples linking them to matching entities. Processes memories in batches. Use limit/offset for pagination.',
      inputSchema: {
        limit: z.number().int().min(1).max(500).default(200),
        offset: z.number().int().min(0).default(0),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional()
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ limit, offset, nest, branch }: Record<string, unknown>) =>
      memory.backfillMemoryKgLinks({ limit, offset, nest, branch })
  );

  // --- Nest/Branch Tools (synapse_nest_*) ---

  registerJsonTool(
    ['synapse_nest_list'],
    {
      title: 'Nest List',
      description: 'List all nests (top-level memory domains) with their memory entry counts.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async () => memory.listNests()
  );

  registerJsonTool(
    ['synapse_nest_branches'],
    {
      title: 'Nest Branches',
      description: 'List all branches (topics) within a specific nest with their memory entry counts.',
      inputSchema: {
        nest: z.string().min(1).max(200)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ nest }: Record<string, unknown>) => memory.listBranches(nest as string)
  );

  registerJsonTool(
    ['synapse_nest_tree'],
    {
      title: 'Nest Taxonomy Tree',
      description: 'Get the full taxonomy tree: all nests, their branches, and memory counts at each level.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async () => memory.getTaxonomyTree()
  );

  registerJsonTool(
    ['synapse_nest_manage'],
    {
      title: 'Nest Branch Cleanup',
      description: 'Manage branch sprawl within a nest. `merge` moves all memories from from_branch into to_branch. `rename` renames a branch in place. `delete` clears the branch from matching memories without deleting those memories. `list_stale` lists branches whose latest activity is older than older_than_days.',
      inputSchema: {
        action: z.enum(['merge', 'rename', 'delete', 'list_stale']),
        nest: z.string().min(1).max(200),
        from_branch: z.string().max(200).optional(),
        to_branch: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        older_than_days: z.number().int().min(1).max(3650).default(30)
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ action, nest, from_branch, to_branch, branch, older_than_days }: Record<string, unknown>) =>
      memory.manageBranches({
        action,
        nest,
        fromBranch: from_branch,
        toBranch: to_branch,
        branch,
        olderThanDays: older_than_days
      })
  );

  // --- Graph Traversal Tools (synapse_graph_*) ---

  registerJsonTool(
    ['synapse_graph_traverse'],
    {
      title: 'Graph Traverse',
      description: 'Traverse the knowledge graph from a starting entity with configurable max hops (default 2). Uses recursive CTEs with cycle prevention. Returns discovered entities with path information.',
      inputSchema: {
        start_entity_id: z.string().min(1).max(400),
        max_hops: z.number().int().min(1).max(5).default(2),
        direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
        limit: z.number().int().min(1).max(200).default(20),
        entity_type: z.string().max(100).optional(),
        predicates: z.array(z.string().max(200)).max(20).optional(),
        max_per_depth: z.number().int().min(1).max(100).optional()
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ start_entity_id, max_hops, direction, limit, entity_type, predicates, max_per_depth }: Record<string, unknown>) =>
      memory.traverseGraph({
        startEntityId: start_entity_id,
        maxHops: max_hops,
        direction,
        limit,
        entityType: entity_type,
        predicates: predicates as string[] | undefined,
        maxPerDepth: max_per_depth
      })
  );

  registerJsonTool(
    ['synapse_graph_bridges'],
    {
      title: 'Graph Bridges',
      description: 'Discover cross-nest bridges (default) or cross-branch bridges within a nest. Use mode="cross-branch" with a nest to find entities that span different branches within that nest.',
      inputSchema: {
        nest: z.string().max(200).optional(),
        mode: z.enum(['cross-nest', 'cross-branch']).default('cross-nest')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ nest, mode }: Record<string, unknown>) => memory.discoverBridges({ nest, mode: mode as 'cross-nest' | 'cross-branch' | undefined })
  );

  // --- Diary Tools (synapse_diary_*) ---

  registerJsonTool(
    ['synapse_diary_write'],
    {
      title: 'Diary Write',
      description: 'Write a private diary entry for an agent. Diary entries are isolated and only visible to the owning agent.',
      inputSchema: {
        agent_id: z.string().min(1).max(200),
        content: z.string().min(1).max(20000),
        topic: z.string().max(200).optional(),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_ACK_RESULT_SCHEMA
    },
    async ({ agent_id, content, topic, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.writeDiaryEntry({ agentId: agent_id, content, topic }), terse as string)
  );

  registerJsonTool(
    ['synapse_diary_read'],
    {
      title: 'Diary Read',
      description: 'Read recent diary entries for a specific agent. Only returns entries belonging to the requesting agent.',
      inputSchema: {
        agent_id: z.string().min(1).max(200),
        topic: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_FREEFORM_RESULT_SCHEMA
    },
    async ({ agent_id, topic, limit, offset }: Record<string, unknown>) =>
      memory.readDiaryEntries({ agentId: agent_id, topic, limit, offset })
  );

  // --- Ingest Tools (synapse_ingest_*) ---

  registerJsonTool(
    ['synapse_ingest_markdown'],
    {
      title: 'Ingest Markdown Conversation',
      description: 'Ingest a Markdown conversation export into memory entries and knowledge graph triples. Pass the full text content directly — file reading is handled by the CLI, not MCP tools.',
      inputSchema: {
        content: z.string().min(1).max(500000).describe('Full markdown text content to ingest'),
        source_label: z.string().max(1000).optional().describe('Optional label for re-ingestion tracking (e.g. filename)'),
        nest: z.string().max(200).default(''),
        branch: z.string().max(200).default(''),
        agent_id: z.string().max(200).default(''),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ content, source_label, nest, branch, agent_id, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.ingestMarkdown({ content, filePath: source_label || '', nest, branch, agentId: agent_id }), terse as string)
  );

  registerJsonTool(
    ['synapse_ingest_json'],
    {
      title: 'Ingest JSON Conversation',
      description: 'Ingest a JSON conversation export (array of {role, content, timestamp?} objects) into memory entries and knowledge graph triples. Pass the full JSON text directly.',
      inputSchema: {
        content: z.string().min(1).max(500000).describe('Full JSON text content to ingest'),
        source_label: z.string().max(1000).optional().describe('Optional label for re-ingestion tracking'),
        nest: z.string().max(200).default(''),
        branch: z.string().max(200).default(''),
        agent_id: z.string().max(200).default(''),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async ({ content, source_label, nest, branch, agent_id, terse }: Record<string, unknown>) =>
      toMinimalWriteResponse(await memory.ingestJson({ content, filePath: source_label || '', nest, branch, agentId: agent_id }), terse as string)
  );

  // --- Dedup Tool (synapse_memory_check_duplicate) ---

  registerJsonTool(
    ['synapse_memory_check_duplicate'],
    {
      title: 'Memory Check Duplicate',
      description: 'Check whether content is a semantic duplicate of an existing memory entry. Uses embedding cosine similarity with configurable threshold (default 0.92). Returns the matching entry when a duplicate is found.',
      inputSchema: {
        content: z.string().min(1).max(20000),
        threshold: z.number().min(0).max(1).default(0.92),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        project_path: z.string().max(1000).optional()
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ content, threshold, nest, branch, project_path }: Record<string, unknown>) =>
      memory.checkDuplicate(content as string, { threshold, nest, branch, projectPath: project_path })
  );

  // --- Hook Introspection Tools (synapse_hooks_*) ---

  registerJsonTool(
    ['synapse_hooks_stats'],
    {
      title: 'Hooks Stats',
      description: 'Returns hook system statistics: whether hooks are enabled, total registered listener count, and a breakdown of listener counts per event type.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_STATUS_RESULT_SCHEMA
    },
    async () => memory.store.hooks.getStats()
  );

  registerJsonTool(
    ['synapse_hooks_list_events'],
    {
      title: 'Hooks List Events',
      description: 'Returns all valid hook event names that listeners can subscribe to. Covers memory lifecycle (store, update, delete, recall), knowledge graph operations (addEntity, addTriple, invalidate), graph traversal, diary, ingestion, dedup, taxonomy, and catch-all wildcards.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_STATUS_RESULT_SCHEMA
    },
    async () => ({ events: MemoryHooks.validEvents() })
  );
}
