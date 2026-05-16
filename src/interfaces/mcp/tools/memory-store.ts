import { z } from 'zod';
import {
  normalizeMemoryEventsResult,
  normalizeMemoryEntryPayload,
  normalizeMemoryRecallResult,
  normalizeMemorySuggestionResult,
  normalizeRelatedMemoriesResult,
  normalizeRelationRemovalResult,
  normalizeRelationResult,
  normalizeDeleteResult,
  normalizeCaptureOutcomeResult,
  normalizeMemoryStatus,
  normalizeTaskContextResult
} from '../common/response-normalizers.js';
import { McpResponseMapper } from '../utils/response-mapper.js';
import {
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS,
  ToolLevel
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

import { IMemoryService, IMemoryWorkflowService } from '../../../core/interfaces/services.js';

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

export interface RegisterMemoryToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  schemas: SharedSchemas;
  memory: IMemoryService;
  memoryWorkflow: IMemoryWorkflowService;
}

export function registerMemoryTools({
  registerJsonTool,
  schemas,
  memory,
  memoryWorkflow
}: RegisterMemoryToolsOptions): void {
  const {
    MEMORY_KIND_SCHEMA,
    MEMORY_STATUS_SCHEMA,
    MEMORY_SCOPE_SCHEMA,
    MEMORY_LINK_SCHEMA,
    MEMORY_EVENT_TYPE_SCHEMA,
    MEMORY_EVENT_STATUS_SCHEMA
  } = schemas;

  // --- Memory Manage Controller (synapse_memory_manage) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_memory_manage'],
    {
      title: 'Memory Manage',
      description: 'Unified controller for all memory mutations (store, update, delete, relations, ingestion).',
      inputSchema: z.object({
        action: z.enum(['store', 'update', 'delete', 'capture_event', 'add_relation', 'remove_relation', 'store_batch', 'teach', 'capture_outcome']).describe('The memory mutation action to perform'),
        id: z.string().optional().describe('Memory ID (action: update, delete, get, suggest, related)'),
        ids: z.array(z.string()).max(100).optional().describe('Batch of Memory IDs (action: delete)'),
        title: z.string().min(1).max(400).optional().describe('Memory title (action: store, update, capture_event, capture_outcome)'),
        content: z.string().min(1).max(20000).optional().describe('Memory content (action: store, update, capture_event, capture_outcome, store_batch)'),
        kind: MEMORY_KIND_SCHEMA.optional().describe('Memory kind (action: store, update, capture_event, capture_outcome, store_batch)'),
        summary: z.string().max(4000).optional().describe('Memory summary (action: store, update, capture_event, capture_outcome)'),
        status: MEMORY_STATUS_SCHEMA.optional().describe('Memory status (action: store, update, capture_event, capture_outcome)'),
        importance: z.number().int().min(0).max(100).optional().describe('Importance score (0-100)'),
        confidence: z.number().min(0).max(1).optional().describe('Confidence score (0-1)'),
        tags: z.array(z.string()).max(50).optional().describe('Tags to associate with the memory'),
        links: z.array(MEMORY_LINK_SCHEMA).max(50).optional().describe('Internal/External links'),
        scope: MEMORY_SCOPE_SCHEMA.optional().describe('Memory scope (root, project, branch, topic, feature)'),
        nest: z.string().max(200).optional().describe('Taxonomy nest name'),
        branch: z.string().max(200).optional().describe('Taxonomy branch name'),
        actor_id: z.string().max(200).optional().describe('ID of the actor who created the memory'),
        source_type: z.string().max(60).optional().describe('Type of the source (action: store, update, capture_event)'),
        source_ref: z.string().max(1000).optional().describe('Reference to the source material'),
        change_note: z.string().max(400).optional().describe('Note describing the change (action: store, update)'),
        event_type: MEMORY_EVENT_TYPE_SCHEMA.optional().describe('Type of event (action: capture_event, capture_outcome)'),
        event_status: MEMORY_EVENT_STATUS_SCHEMA.optional().describe('Status of the event (action: capture_event, capture_outcome)'),
        files_changed: z.number().int().min(0).max(10000).optional().describe('Number of files changed (action: capture_event, capture_outcome)'),
        has_tests: z.boolean().optional().describe('Whether tests were included (action: capture_event, capture_outcome)'),
        source_id: z.string().optional().describe('Source ID for relation (action: add_relation, remove_relation)'),
        target_id: z.string().optional().describe('Target ID for relation (action: add_relation, remove_relation)'),
        relation_type: z.string().max(60).optional().describe('Type of relation (action: add_relation)'),
        memories: z.array(z.any()).max(100).optional().describe('Batch of memory objects (action: store_batch)'),
        instruction: z.string().max(4000).optional().describe('Durable behavior rule (action: teach)'),
        task: z.string().optional().describe('Task identifier (action: capture_outcome)'),
        details: z.string().optional().describe('Outcome details (action: capture_outcome)'),
        root_path: z.string().optional().describe('Root path for context/outcome'),
        project_path: z.string().optional().describe('Project path for context/outcome'),
        branch_name: z.string().optional().describe('Branch name for context/outcome'),
        topic: z.string().optional().describe('Topic for context/outcome'),
        feature: z.string().optional().describe('Feature for context/outcome'),
        terse: z.enum(['minimal', 'verbose']).default('verbose').describe('Output verbosity')
      }),
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_FREEFORM_RESULT_SCHEMA,
      category: 'Memory Management'
    },
    async (args: Record<string, unknown>) => {
      const { action, terse = 'verbose', ...params } = args;

      switch (action) {
        case 'store': {
          const result = await memory.storeEntry(params);
          const r = result as Record<string, unknown>;
          const normalized = normalizeMemoryEntryPayload(r?.memory || null, { created: Boolean(r?.created), duplicate: Boolean(r?.duplicate) });
          const response = McpResponseMapper.standardizeResponse(normalized, { terse: terse as string });
          if (r?.auto_linked_entities) (response as any).auto_linked_entities = r.auto_linked_entities;
          if (r?.auto_triples) (response as any).auto_triples = r.auto_triples;
          return response;
        }
        case 'update': {
          const result = await memory.updateEntry(params.id as string, params);
          return McpResponseMapper.standardizeResponse(normalizeMemoryEntryPayload(result, { updated: true }), { terse: terse as string });
        }
        case 'delete': {
          if (params.ids) {
            const result = await memory.deleteEntryBatch({ ids: params.ids as string[] });
            return McpResponseMapper.standardizeResponse(result, { terse: terse as string });
          }
          const result = await memory.deleteEntry(params.id as string);
          return McpResponseMapper.standardizeResponse(normalizeDeleteResult(result, { id: params.id as string }), { terse: terse as string });
        }
        case 'capture_event': {
          const result = await memory.captureEvent({ ...params, status: params.event_status as any });
          return McpResponseMapper.standardizeResponse(result, { terse: terse as string });
        }
        case 'add_relation': {
          const result = await memory.addRelation(params.source_id as string, params.target_id as string, (params.relation_type as string) || 'related');
          return McpResponseMapper.standardizeResponse(normalizeRelationResult(result, { source_id: params.source_id as string, target_id: params.target_id as string, relation_type: (params.relation_type as string) || 'related' }), { terse: terse as string });
        }
        case 'remove_relation': {
          const result = await memory.removeRelation(params.source_id as string, params.target_id as string);
          return McpResponseMapper.standardizeResponse(normalizeRelationRemovalResult(result, { source_id: params.source_id as string, target_id: params.target_id as string }), { terse: terse as string });
        }
        case 'store_batch': {
          const result = await memory.storeEntryBatch({ memories: params.memories as any[], response_format: terse as any });
          return McpResponseMapper.standardizeResponse(result, { terse: terse as string });
        }
        case 'teach': {
          const result = await memoryWorkflow.teach(params as any);
          return McpResponseMapper.standardizeResponse(result, { terse: terse as string });
        }
        case 'capture_outcome': {
          const result = await memoryWorkflow.captureOutcome({ ...params, status: params.event_status as any });
          return McpResponseMapper.standardizeResponse(normalizeCaptureOutcomeResult(result), { terse: terse as string });
        }
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );

  // --- Memory Query Controller (synapse_memory_query) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_memory_query'],
    {
      title: 'Memory Query',
      description: 'Unified controller for all memory read operations (list, get, recall, context, events, taxonomy).',
      inputSchema: z.object({
        action: z.enum(['list', 'get', 'recall', 'task_context', 'events', 'suggest', 'related', 'status', 'whats_new', 'nest_list', 'nest_branches', 'taxonomy_tree']).describe('The memory read action to perform'),
        id: z.string().optional().describe('Memory ID (action: get, suggest, related)'),
        query: z.string().optional().describe('Search query string (action: recall, task_context)'),
        kind: MEMORY_KIND_SCHEMA.optional().describe('Filter by memory kind'),
        status: MEMORY_STATUS_SCHEMA.optional().describe('Filter by memory status'),
        project_path: z.string().optional().describe('Filter by project path'),
        topic: z.string().optional().describe('Filter by topic'),
        nest: z.string().optional().describe('Filter by taxonomy nest'),
        branch: z.string().optional().describe('Filter by taxonomy branch'),
        actor_id: z.string().max(200).optional().describe('Filter by actor ID'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        limit: z.number().int().min(1).max(200).optional().describe('Maximum number of results to return'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity'),
        root_path: z.string().optional().describe('Scope recall/context to root'),
        branch_name: z.string().optional().describe('Scope recall/context to branch name'),
        feature: z.string().optional().describe('Scope recall/context to feature'),
        task: z.string().optional().describe('Current task identifier (action: task_context)'),
        threshold: z.number().min(0).max(1).optional().describe('Similarity threshold (action: suggest)'),
        max_results: z.number().int().min(1).max(50).optional().describe('Max results (action: suggest)'),
        include_legacy_arrays: z.boolean().default(false).describe('Include legacy result formats'),
        since: z.string().optional().describe('ISO timestamp for delta query (action: whats_new)'),
        agent_id: z.string().optional().describe('Agent ID filter (action: whats_new)')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_FREEFORM_RESULT_SCHEMA,
      category: 'Memory Management'
    },
    async (args: Record<string, unknown>) => {
      const { action, item_format = 'verbose', ...params } = args;

      switch (action) {
        case 'list': {
          const result = await memory.listEntries({
            kind: params.kind as any,
            status: params.status as any,
            projectPath: params.project_path as any,
            topic: params.topic as any,
            nest: params.nest as any,
            branch: params.branch as any,
            actorId: params.actor_id as any,
            tags: params.tags as any,
            limit: (params.limit ?? 20) as any,
            offset: (params.offset ?? 0) as any
          });
          return McpResponseMapper.standardizeResponse(normalizeMemoryRecallResult(result), { item_format: item_format as string });
        }
        case 'get': {
          const item = await memory.getEntry(params.id as string);
          if (!item) throw new Error(`memory not found: ${params.id}`);
          return McpResponseMapper.standardizeResponse(normalizeMemoryEntryPayload(item));
        }
        case 'recall': {
          const result = await memory.recall({
            query: params.query as string,
            rootPath: params.root_path as any,
            projectPath: params.project_path as any,
            branchName: params.branch_name as any,
            topic: params.topic as any,
            feature: params.feature as any,
            kind: params.kind as any,
            actorId: params.actor_id as any,
            tags: params.tags as any,
            limit: (params.limit ?? 10) as any
          });
          return McpResponseMapper.standardizeResponse(normalizeMemoryRecallResult(result, params.query as string), { item_format: item_format as string });
        }
        case 'task_context': {
          const result = await memoryWorkflow.getTaskContext({ ...params, limit: params.limit ?? 8 } as any);
          return McpResponseMapper.standardizeResponse(normalizeTaskContextResult(result, { ...params, limit: params.limit ?? 8 } as any), { item_format: item_format as string });
        }
        case 'events': {
          const result = await memory.listEvents({ projectPath: params.project_path as any, limit: (params.limit ?? 20) as any, offset: (params.offset ?? 0) as any });
          return McpResponseMapper.standardizeResponse(normalizeMemoryEventsResult(result), { item_format: item_format as string });
        }
        case 'suggest': {
          const result = await memory.suggestRelations(params.id as string, { threshold: (params.threshold ?? 0.55) as number, maxResults: (params.max_results ?? 10) as number });
          return McpResponseMapper.standardizeResponse(normalizeMemorySuggestionResult(result, params.id as string, (params.threshold ?? 0.55) as number, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'related': {
          const result = await memory.getRelated(params.id as string);
          return McpResponseMapper.standardizeResponse(normalizeRelatedMemoriesResult(result, params.id as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'status': {
          return McpResponseMapper.standardizeResponse(normalizeMemoryStatus(await memory.getStatus()));
        }
        case 'whats_new': {
          const result = await memory.whatsNew({ since: params.since as string, agentId: params.agent_id as string, projectPath: params.project_path as string, limit: (params.limit ?? 10) as number });
          return McpResponseMapper.standardizeResponse(result, { item_format: item_format as string });
        }
        case 'nest_list': {
          const result = await memory.listNests();
          return McpResponseMapper.standardizeResponse(result);
        }
        case 'nest_branches': {
          const result = await memory.listBranches(params.nest as string);
          return McpResponseMapper.standardizeResponse(result);
        }
        case 'taxonomy_tree': {
          const result = await memory.getTaxonomyTree();
          return McpResponseMapper.standardizeResponse(result);
        }
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );
}
