import { z } from 'zod';
import {
  normalizeCaptureOutcomeResult,
  normalizeMemoryRecallResult,
  normalizeMemoryStatus,
  normalizeTaskContextResult,
  normalizeAgentPrimeResult
} from '../common/response-normalizers.js';
import {
  applyReadFormatToItems,
  applyReadFormatToBundle,
  toMinimalWriteResponse
} from '../common/terse-utils.js';
import type { ReadResponseFormat } from '../common/terse-utils.js';
import { READ_ONLY_ANNOTATIONS, WRITE_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import type {
  MemoryKind,
  MemoryLink,
  MemoryScope,
  MemoryEventType,
  MemoryEventStatus
} from '../common/schemas.js';

interface MemoryService {
  getStatus(): Promise<unknown>;
  recall(opts: Record<string, unknown>): Promise<unknown>;
  whatsNew(args: Record<string, unknown>): Promise<unknown>;
}

interface MemoryWorkflowService {
  getTaskContext(args: Record<string, unknown>): Promise<unknown>;
  captureOutcome(args: Record<string, unknown>): Promise<unknown>;
  agentPrime(args: Record<string, unknown>): Promise<unknown>;
  teach(args: Record<string, unknown>): Promise<unknown>;
}

type OutputArchetype = { data: z.ZodTypeAny; meta: z.ZodTypeAny };
interface SharedSchemas {
  MEMORY_KIND_SCHEMA: z.ZodType<MemoryKind>;
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

export interface RegisterMemoryWorkflowToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  schemas: SharedSchemas;
  memory: MemoryService;
  memoryWorkflow: MemoryWorkflowService;
}

export function registerMemoryWorkflowTools({
  registerJsonTool,
  schemas,
  memory,
  memoryWorkflow
}: RegisterMemoryWorkflowToolsOptions): void {
  const {
    MEMORY_KIND_SCHEMA,
    MEMORY_SCOPE_SCHEMA,
    MEMORY_LINK_SCHEMA,
    MEMORY_EVENT_TYPE_SCHEMA,
    MEMORY_EVENT_STATUS_SCHEMA
  } = schemas;

  registerJsonTool(
    ['synapse_task_context'],
    {
      title: 'Task Context',
      description: '[QUICK_REHYDRATION] Bundle runtime status, memory state, and relevant recall for a non-trivial task in one call.',
      inputSchema: {
        query: z.string().optional(),
        task: z.string().optional(),
        root_path: z.string().optional(),
        project_path: z.string().optional(),
        branch_name: z.string().optional(),
        topic: z.string().optional(),
        feature: z.string().optional(),
        kind: MEMORY_KIND_SCHEMA.optional(),
        limit: z.number().int().min(1).max(20).default(8),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async (args: Record<string, unknown>) => {
      const result = await memoryWorkflow.getTaskContext(args);
      return applyReadFormatToBundle(
        normalizeTaskContextResult(result, args),
        (args.item_format as ReadResponseFormat | undefined) ?? 'verbose'
      );
    }
  );

  registerJsonTool(
    ['synapse_memory_status'],
    {
      title: 'Memory Status',
      description: 'Return local memory feature status, consent state, and backend compatibility.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_STATUS_RESULT_SCHEMA
    },
    async () => normalizeMemoryStatus(await memory.getStatus())
  );

  registerJsonTool(
    ['synapse_memory_recall'],
    {
      title: 'Memory Recall',
      description: 'Recall the most relevant local memories for a task or query. Use item_format=compact to drop content/metadata (~50% fewer tokens) or lite to return only id+title (~85% fewer tokens).',
      inputSchema: {
        query: z.string().min(1),
        root_path: z.string().optional(),
        project_path: z.string().optional(),
        branch_name: z.string().optional(),
        topic: z.string().optional(),
        feature: z.string().optional(),
        kind: MEMORY_KIND_SCHEMA.optional(),
        actor_id: z.string().max(200).optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(50).default(10),
        // quick 260415-n69: opt-in token savings via item_format tiers.
        // Named `item_format` to avoid collision with createJsonToolRegistrar's
        // auto-injected `response_format: json|markdown` serialization param.
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_SEARCH_RESULT_SCHEMA
    },
    async ({ query, root_path, project_path, branch_name, topic, feature, kind, actor_id, tags, limit, item_format }: Record<string, unknown>) => applyReadFormatToItems(
      normalizeMemoryRecallResult(
        await memory.recall({
          query,
          rootPath: root_path,
          projectPath: project_path,
          branchName: branch_name,
          topic,
          feature,
          kind,
          actorId: actor_id as string | undefined,
          tags: tags as string[] | undefined,
          limit
        }),
        query as string
      ),
      (item_format as ReadResponseFormat | undefined) ?? 'verbose'
    )
  );

  registerJsonTool(
    ['synapse_capture_outcome'],
    {
      title: 'Capture Outcome',
      description: '[COMPLETE_MISSION] One-call mission summary capture. Use this after completing a task, fixing a bug, or making a major architectural decision to persist the "Winner" state for future agents.',
      inputSchema: {
        task: z.string().optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
        details: z.string().optional(),
        content: z.string().optional(),
        event_type: MEMORY_EVENT_TYPE_SCHEMA.optional(),
        status: MEMORY_EVENT_STATUS_SCHEMA.optional(),
        kind: MEMORY_KIND_SCHEMA.optional(),
        importance: z.number().int().min(0).max(100).optional(),
        confidence: z.number().min(0).max(1).optional(),
        files_changed: z.number().int().min(0).max(10000).default(0),
        has_tests: z.boolean().default(false),
        tags: z.array(z.string()).max(50).default([]),
        links: z.array(MEMORY_LINK_SCHEMA).max(50).default([]),
        root_path: z.string().optional(),
        project_path: z.string().optional(),
        branch_name: z.string().optional(),
        topic: z.string().optional(),
        feature: z.string().optional(),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        source_ref: z.string().max(1000).default(''),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ terse, ...args }: Record<string, unknown>) => toMinimalWriteResponse(normalizeCaptureOutcomeResult(await memoryWorkflow.captureOutcome(args)), terse as string)
  );

  registerJsonTool(
    ['synapse_agent_prime'],
    {
      title: 'Agent Prime',
      description: '[MANDATORY_START] The single most important tool for task initialization. Rehydrates project context, recalled memories, KG entities, relevant files, recent changes, and suggested actions in one call. Always call this BEFORE deeper research.',
      inputSchema: {
        task: z.string().min(1).max(500),
        project_path: z.string().optional(),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        max_memories: z.number().int().min(1).max(10).default(5),
        max_entities: z.number().int().min(1).max(20).default(10),
        max_files: z.number().int().min(1).max(10).default(5),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async (args: Record<string, unknown>) => {
      const result = await memoryWorkflow.agentPrime(args as any);
      return applyReadFormatToBundle(
        normalizeAgentPrimeResult(result),
        (args.item_format as ReadResponseFormat | undefined) ?? 'verbose'
      );
    }
  );

  registerJsonTool(
    ['synapse_whats_new'],
    {
      title: "What's New",
      description: 'Cross-session delta: new memories, KG triples, file changes, and commits since a given timestamp or last session.',
      inputSchema: {
        since: z.string().min(1),
        agent_id: z.string().optional(),
        project_path: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async ({ since, agent_id, project_path, limit }: Record<string, unknown>) => {
      const result = await memory.whatsNew({
        since: since as string,
        agentId: agent_id as string | undefined,
        projectPath: project_path as string | undefined,
        limit: limit as number | undefined
      });
      return result;
    }
  );

  registerJsonTool(
    ['synapse_teach'],
    {
      title: 'Teach',
      description: 'Teach the agent a durable behavior rule. Stores a high-importance feedback memory that auto-surfaces in agent_prime when future tasks match the instruction domain. Use this to set persistent preferences, coding standards, or workflow rules that should apply across sessions. Teach memories can be listed (kind=feedback), updated, or deleted via existing memory CRUD tools.',
      inputSchema: {
        instruction: z.string().min(1).max(4000),
        importance: z.number().int().min(70).max(100).default(95),
        tags: z.array(z.string()).max(50).default([]),
        nest: z.string().max(200).optional(),
        branch: z.string().max(200).optional(),
        scope: MEMORY_SCOPE_SCHEMA.optional(),
        terse: z.enum(['minimal', 'verbose']).default('verbose')
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_MEMORY_RESULT_SCHEMA
    },
    async ({ terse, ...args }: Record<string, unknown>) => {
      const result = await memoryWorkflow.teach(args as any);
      return toMinimalWriteResponse(result, terse as string);
    }
  );
}
