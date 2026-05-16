import { z } from 'zod';
import {
  normalizeAgentPrimeResult
} from '../common/response-normalizers.js';
import { McpResponseMapper } from '../utils/response-mapper.js';
import { READ_ONLY_ANNOTATIONS, ToolLevel } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import type {
  IMemoryWorkflowService
} from '../../../core/interfaces/services.js';

type OutputArchetype = { data: z.ZodTypeAny; meta: z.ZodTypeAny };
interface SharedSchemas {
  OUTPUT_BUNDLE_RESULT_SCHEMA: OutputArchetype;
}

export interface RegisterMemoryWorkflowToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  schemas: SharedSchemas;
  memoryWorkflow: IMemoryWorkflowService;
}

export function registerMemoryWorkflowTools({
  registerJsonTool,
  schemas,
  memoryWorkflow
}: RegisterMemoryWorkflowToolsOptions): void {
  // NOTE: This file now only hosts the CORE rehydration tool. 
  // Other workflow tools (task_context, capture_outcome, teach) have been 
  // consolidated into synapse_memory_manage and synapse_memory_query.

  registerJsonTool(
    ['synapse_agent_prime'],
    {
      title: 'Agent Prime',
      description: '[MANDATORY_START] The single most important tool for task initialization. Rehydrates project context, recalled memories, KG entities, relevant files, recent changes, and suggested actions in one call. Always call this BEFORE deeper research.',
      inputSchema: z.object({
        task: z.string().min(1).max(500).describe('The complete task description'),
        project_path: z.string().optional().describe('Scope to a specific project'),
        nest: z.string().max(200).optional().describe('Taxonomy nest'),
        branch: z.string().max(200).optional().describe('Taxonomy branch'),
        max_memories: z.number().int().min(1).max(10).default(5).describe('Max memories to recall'),
        max_entities: z.number().int().min(1).max(20).default(10).describe('Max KG entities to recall'),
        max_files: z.number().int().min(1).max(10).default(5).describe('Max files to include in context'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Agent Orchestration'
    },
    async (args: Record<string, unknown>) => {
      const result = await memoryWorkflow.agentPrime(args as any);
      return McpResponseMapper.standardizeResponse(
        normalizeAgentPrimeResult(result),
        { item_format: args.item_format as string }
      );
    }
  );
}
