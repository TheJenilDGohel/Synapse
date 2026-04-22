import { z } from 'zod';
import { DESTRUCTIVE_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { BATCH_RESULT_SCHEMA, ACK_RESULT_SCHEMA } from '../common/schemas.js';

interface MemoryService {
  deleteEntity(entityId: string): Promise<unknown>;
  deleteEntityBatch(args: { entity_ids: string[] }): Promise<unknown>;
  deleteTripleBatch(args: { triple_ids: string[] }): Promise<unknown>;
}

export interface RegisterKgDeleteToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory: MemoryService;
}

export function registerKgDeleteTools({
  registerJsonTool,
  memory
}: RegisterKgDeleteToolsOptions): void {
  registerJsonTool(
    ['synapse_kg_delete_entity'],
    {
      title: 'KG Delete Entity',
      description: 'Delete a knowledge graph entity by ID. Cascades: also deletes all triples where the entity is subject or object.',
      inputSchema: {
        entity_id: z.string().min(1)
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: ACK_RESULT_SCHEMA
    },
    async ({ entity_id }: Record<string, unknown>) =>
      memory.deleteEntity(entity_id as string)
  );

  registerJsonTool(
    ['synapse_kg_delete_entities_batch'],
    {
      title: 'KG Delete Entities Batch',
      description: 'Delete up to 100 knowledge graph entities in one call. Cascades: also deletes all triples where each entity is subject or object. Returns count of deleted entities and removed triples.',
      inputSchema: {
        entity_ids: z.array(z.string().min(1)).min(1).max(100)
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: BATCH_RESULT_SCHEMA
    },
    async ({ entity_ids }: Record<string, unknown>) =>
      memory.deleteEntityBatch({ entity_ids: entity_ids as string[] })
  );

  registerJsonTool(
    ['synapse_kg_delete_triples_batch'],
    {
      title: 'KG Delete Triples Batch',
      description: 'Hard-delete up to 100 knowledge graph triples by ID. Unlike invalidate (which sets valid_to), this permanently removes the triples.',
      inputSchema: {
        triple_ids: z.array(z.string().min(1)).min(1).max(100)
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: BATCH_RESULT_SCHEMA
    },
    async ({ triple_ids }: Record<string, unknown>) =>
      memory.deleteTripleBatch({ triple_ids: triple_ids as string[] })
  );
}
