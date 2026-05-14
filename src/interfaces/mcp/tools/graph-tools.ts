import { z } from 'zod';
import { MemoryHooks } from '../../../core/engine/index.js';
import {
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS,
  ToolLevel
} from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { McpResponseMapper } from '../utils/response-mapper.js';

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

import { IMemoryService } from '../../../core/interfaces/services.js';

export interface RegisterGraphToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory: IMemoryService;
  schemas: SharedSchemas;
}

export function registerGraphTools({
  registerJsonTool,
  memory,
  schemas
}: RegisterGraphToolsOptions): void {
  // --- KG Manage Controller (synapse_kg_manage) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_kg_manage'],
    {
      title: 'KG Manage',
      description: 'Unified controller for all knowledge graph mutations (add, delete, ingest, branch management, diary write). Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['add_entity', 'add_triple', 'add_entities_batch', 'add_triples_batch', 'invalidate', 'delete_entity', 'delete_entities_batch', 'delete_triples_batch', 'manage_branches', 'ingest_markdown', 'ingest_json', 'backfill_links', 'write_diary']).describe('The KG mutation action to perform'),
        name: z.string().max(400).optional().describe('Entity name (action: add_entity)'),
        type: z.string().max(100).optional().describe('Entity type (action: add_entity)'),
        properties: z.record(z.string(), z.any()).optional().describe('Entity properties (action: add_entity)'),
        memory_id: z.string().optional().describe('Associated memory ID (action: add_entity)'),
        subject_name: z.string().max(400).optional().describe('Subject name (action: add_triple)'),
        predicate: z.string().max(400).optional().describe('Predicate (action: add_triple)'),
        object_name: z.string().max(400).optional().describe('Object name (action: add_triple)'),
        subject_id: z.string().max(400).optional().describe('Subject ID (action: add_triple)'),
        object_id: z.string().max(400).optional().describe('Object ID (action: add_triple)'),
        valid_from: z.string().nullable().optional().describe('Start of validity period'),
        valid_to: z.string().nullable().optional().describe('End of validity period'),
        confidence: z.number().min(0).max(1).optional().describe('Confidence score'),
        source_memory_id: z.string().nullable().optional().describe('Source memory ID'),
        source_type: z.string().max(100).optional().describe('Source type (manual, tool, etc)'),
        entities: z.array(z.any()).max(500).optional().describe('Batch of entity objects (action: add_entities_batch)'),
        triples: z.array(z.any()).max(500).optional().describe('Batch of triple objects (action: add_triples_batch)'),
        triple_id: z.string().optional().describe('ID of triple to invalidate'),
        entity_id: z.string().optional().describe('ID of entity to delete'),
        entity_ids: z.array(z.string()).max(100).optional().describe('IDs of entities to delete in batch'),
        triple_ids: z.array(z.string()).max(100).optional().describe('IDs of triples to delete in batch'),
        action_type: z.enum(['merge', 'rename', 'delete', 'list_stale']).optional().describe('Specific branch operation (action: manage_branches)'),
        nest: z.string().max(200).optional().describe('Taxonomy nest'),
        branch: z.string().max(200).optional().describe('Taxonomy branch'),
        from_branch: z.string().max(200).optional().describe('Source branch for merge/rename'),
        to_branch: z.string().max(200).optional().describe('Destination branch for merge/rename'),
        older_than_days: z.number().int().min(1).max(3650).optional().describe('Age threshold for listing stale branches'),
        content: z.string().max(500000).optional().describe('Content to ingest or diary entry'),
        source_label: z.string().max(1000).optional().describe('Label for ingested content'),
        agent_id: z.string().max(200).optional().describe('Agent identifier (action: ingest_*, write_diary)'),
        limit: z.number().int().min(1).max(500).optional().describe('Result limit'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
        topic: z.string().max(200).optional().describe('Diary topic'),
        terse: z.enum(['minimal', 'verbose']).default('verbose').describe('Output verbosity'),
        response_format: z.enum(['minimal', 'verbose']).optional().describe('Output format for batch operations')
      }),
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA,
      category: 'Knowledge Graph'
    },
    async (input: any) => {
      const { action, ...args } = input;
      switch (action) {
        case 'add_entity':
          return McpResponseMapper.standardizeResponse(
            await memory.addEntity({ name: args.name, type: args.type || 'concept', properties: args.properties || {}, memoryId: args.memory_id }), 
            { terse: args.terse || 'verbose' }
          );
        case 'add_triple':
          return McpResponseMapper.standardizeResponse(
            await memory.addTriple({
              subjectName: args.subject_name, subjectId: args.subject_id, predicate: args.predicate,
              objectName: args.object_name, objectId: args.object_id,
              validFrom: args.valid_from, validTo: args.valid_to, confidence: args.confidence ?? 1.0,
              sourceMemoryId: args.source_memory_id, sourceType: args.source_type || 'manual'
            }), 
            { terse: args.terse || 'verbose' }
          );
        case 'add_entities_batch':
          return McpResponseMapper.standardizeResponse(
            await memory.addEntityBatch({
              entities: (args.entities || []).map((e: any) => ({
                name: e.name, type: e.type || 'concept', properties: e.properties || {}, memoryId: e.memory_id
              })),
              response_format: args.response_format || 'minimal'
            }),
            { terse: args.response_format || 'minimal' }
          );
        case 'add_triples_batch':
          return McpResponseMapper.standardizeResponse(
            await memory.addTripleBatch({
              triples: (args.triples || []).map((t: any) => ({
                subjectName: t.subject_name, subjectId: t.subject_id, predicate: t.predicate,
                objectName: t.object_name, objectId: t.object_id, validFrom: t.valid_from,
                validTo: t.valid_to, confidence: t.confidence ?? 1.0,
                sourceMemoryId: t.source_memory_id, sourceType: t.source_type || 'manual'
              })),
              response_format: args.response_format || 'minimal'
            }),
            { terse: args.response_format || 'minimal' }
          );
        case 'invalidate':
          return McpResponseMapper.standardizeResponse(
            await memory.invalidateTriple(args.triple_id, args.valid_to), 
            { terse: args.terse || 'verbose' }
          );
        case 'delete_entity':
          return McpResponseMapper.standardizeResponse(
            await memory.deleteEntity(args.entity_id),
            { terse: 'verbose' } 
          );
        case 'delete_entities_batch':
          return McpResponseMapper.standardizeResponse(
            await memory.deleteEntityBatch({ entity_ids: args.entity_ids }),
            { terse: 'verbose' }
          );
        case 'delete_triples_batch':
          return McpResponseMapper.standardizeResponse(
            await memory.deleteTripleBatch({ triple_ids: args.triple_ids }),
            { terse: 'verbose' }
          );
        case 'manage_branches':
          return McpResponseMapper.standardizeResponse(
            await memory.manageBranches({
              action: args.action_type,
              nest: args.nest,
              fromBranch: args.from_branch,
              toBranch: args.to_branch,
              branch: args.branch,
              olderThanDays: args.older_than_days ?? 30
            }),
            { terse: 'verbose' }
          );
        case 'ingest_markdown':
          return McpResponseMapper.standardizeResponse(
            await memory.ingestMarkdown({ content: args.content, filePath: args.source_label || '', nest: args.nest || '', branch: args.branch || '', agentId: args.agent_id || '' }), 
            { terse: args.terse || 'verbose' }
          );
        case 'ingest_json':
          return McpResponseMapper.standardizeResponse(
            await memory.ingestJson({ content: args.content, filePath: args.source_label || '', nest: args.nest || '', branch: args.branch || '', agentId: args.agent_id || '' }), 
            { terse: args.terse || 'verbose' }
          );
        case 'backfill_links':
          return McpResponseMapper.standardizeResponse(
            await memory.backfillMemoryKgLinks({ limit: args.limit ?? 200, offset: args.offset ?? 0, nest: args.nest, branch: args.branch }),
            { terse: 'verbose' }
          );
        case 'write_diary':
          return McpResponseMapper.standardizeResponse(
            await memory.writeDiaryEntry({ agentId: args.agent_id, content: args.content, topic: args.topic }), 
            { terse: args.terse || 'verbose' }
          );
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );

  // --- KG Query Controller (synapse_kg_query) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_kg_query'],
    {
      title: 'KG Query',
      description: 'Unified controller for all knowledge graph queries and state introspection. Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['list_entities', 'query_relationships', 'as_of', 'timeline', 'stats', 'nest_list', 'nest_branches', 'nest_tree', 'traverse', 'bridges', 'diary_read', 'check_duplicate', 'hooks_stats', 'hooks_list_events']).describe('The KG read action to perform'),
        type: z.string().max(100).optional().describe('Filter by entity type (action: list_entities)'),
        name_contains: z.string().max(200).optional().describe('Filter by name substring (action: list_entities)'),
        limit: z.number().int().min(1).max(200).optional().describe('Result limit'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
        entity_id: z.string().max(400).optional().describe('Target entity ID'),
        direction: z.enum(['outgoing', 'incoming', 'both']).optional().describe('Relation direction'),
        include_invalid: z.boolean().default(false).describe('Include invalidated triples'),
        as_of_date: z.string().optional().describe('ISO timestamp for temporal query'),
        mode: z.enum(['event', 'transaction', 'cross-nest', 'cross-branch']).optional().describe('Temporal or Bridge mode'),
        nest: z.string().max(200).optional().describe('Taxonomy nest'),
        start_entity_id: z.string().max(400).optional().describe('Start entity for graph traversal'),
        max_hops: z.number().int().min(1).max(5).optional().describe('Max traversal depth'),
        entity_type: z.string().max(100).optional().describe('Filter traversal by entity type'),
        predicates: z.array(z.string().max(200)).max(20).optional().describe('Filter traversal by predicates'),
        max_per_depth: z.number().int().min(1).max(100).optional().describe('Limit results per depth level'),
        agent_id: z.string().max(200).optional().describe('Agent ID for diary read'),
        topic: z.string().max(200).optional().describe('Topic for diary read'),
        content: z.string().max(20000).optional().describe('Content to check for duplicate'),
        threshold: z.number().min(0).max(1).optional().describe('Similarity threshold'),
        project_path: z.string().max(1000).optional().describe('Project path for duplicate check'),
        branch: z.string().max(200).optional().describe('Branch for duplicate check'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Knowledge Graph'
    },
    async (input: any) => {
      const { action, ...args } = input;
      switch (action) {
        case 'list_entities':
          return McpResponseMapper.standardizeResponse(
            await memory.listEntities({ type: args.type, nameContains: args.name_contains, limit: args.limit ?? 20, offset: args.offset ?? 0 }),
            { item_format: args.item_format as string }
          );
        case 'query_relationships':
          return McpResponseMapper.standardizeResponse(
            await memory.queryEntityRelationships(args.entity_id, {
              direction: args.direction || 'both',
              includeInvalid: args.include_invalid
            }),
            { item_format: args.item_format as string }
          );
        case 'as_of':
          return McpResponseMapper.standardizeResponse(
            await memory.queryTriplesAsOf(args.entity_id, args.as_of_date, args.mode || 'event')
          );
        case 'timeline':
          return McpResponseMapper.standardizeResponse(
            await memory.getEntityTimeline(args.entity_id)
          );
        case 'stats':
          return McpResponseMapper.standardizeResponse(
            await memory.getKgStats()
          );
        case 'nest_list':
          return McpResponseMapper.standardizeResponse(
            await memory.listNests()
          );
        case 'nest_branches':
          return McpResponseMapper.standardizeResponse(
            await memory.listBranches(args.nest)
          );
        case 'nest_tree':
          return McpResponseMapper.standardizeResponse(
            await memory.getTaxonomyTree()
          );
        case 'traverse':
          return McpResponseMapper.standardizeResponse(
            await memory.traverseGraph({
              startEntityId: args.start_entity_id,
              maxHops: args.max_hops ?? 2,
              direction: args.direction || 'both',
              limit: args.limit ?? 20,
              entityType: args.entity_type,
              predicates: args.predicates,
              maxPerDepth: args.max_per_depth
            }),
            { item_format: args.item_format as string }
          );
        case 'bridges':
          return McpResponseMapper.standardizeResponse(
            await memory.discoverBridges({ nest: args.nest, mode: args.mode || 'cross-nest' })
          );
        case 'diary_read':
          return McpResponseMapper.standardizeResponse(
            await memory.readDiaryEntries({ agentId: args.agent_id, topic: args.topic, limit: args.limit ?? 20, offset: args.offset ?? 0 }),
            { item_format: args.item_format as string }
          );
        case 'check_duplicate':
          return McpResponseMapper.standardizeResponse(
            await memory.checkDuplicate(args.content, { threshold: args.threshold ?? 0.92, nest: args.nest, branch: args.branch, projectPath: args.project_path })
          );
        case 'hooks_stats':
          return McpResponseMapper.standardizeResponse(
            await memory.store.hooks.getStats()
          );
        case 'hooks_list_events':
          return McpResponseMapper.standardizeResponse(
            { events: MemoryHooks.validEvents() }
          );
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
