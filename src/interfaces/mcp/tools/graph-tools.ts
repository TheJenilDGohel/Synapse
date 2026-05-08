import { z } from 'zod';
import { MemoryHooks } from '../../../core/engine/index.js';
import {
  READ_ONLY_ANNOTATIONS,
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS
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
  registerJsonTool(
    ['synapse_kg_manage'],
    {
      title: 'KG Manage',
      description: 'Unified controller for all knowledge graph mutations (add, delete, ingest, branch management, diary write).',
      inputSchema: z.discriminatedUnion('action', [
        z.object({
          action: z.literal('add_entity'),
          name: z.string().min(1).max(400),
          type: z.string().max(100).default('concept'),
          properties: z.record(z.string(), z.any()).default({}),
          memory_id: z.string().optional(),
          terse: z.enum(['minimal', 'verbose']).default('verbose')
        }),
        z.object({
          action: z.literal('add_triple'),
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
        }),
        z.object({
          action: z.literal('add_entities_batch'),
          entities: z.array(z.object({
            name: z.string().min(1).max(400), type: z.string().max(100).default('concept'),
            properties: z.record(z.string(), z.any()).default({}), memory_id: z.string().optional()
          })).min(1).max(500),
          response_format: z.enum(['minimal', 'verbose']).default('minimal')
        }),
        z.object({
          action: z.literal('add_triples_batch'),
          triples: z.array(z.object({
            subject_name: z.string().min(1).max(400), predicate: z.string().min(1).max(400),
            object_name: z.string().min(1).max(400), subject_id: z.string().max(400).optional(),
            object_id: z.string().max(400).optional(), valid_from: z.string().nullable().optional(),
            valid_to: z.string().nullable().optional(), confidence: z.number().min(0).max(1).default(1.0),
            source_memory_id: z.string().nullable().optional(), source_type: z.string().max(100).default('manual')
          })).min(1).max(500),
          response_format: z.enum(['minimal', 'verbose']).default('minimal')
        }),
        z.object({
          action: z.literal('invalidate'),
          triple_id: z.string().min(1),
          valid_to: z.string().nullable().optional(),
          terse: z.enum(['minimal', 'verbose']).default('verbose')
        }),
        z.object({
          action: z.literal('delete_entity'),
          entity_id: z.string().min(1)
        }),
        z.object({
          action: z.literal('delete_entities_batch'),
          entity_ids: z.array(z.string().min(1)).min(1).max(100)
        }),
        z.object({
          action: z.literal('delete_triples_batch'),
          triple_ids: z.array(z.string().min(1)).min(1).max(100)
        }),
        z.object({
          action: z.literal('manage_branches'),
          action_type: z.enum(['merge', 'rename', 'delete', 'list_stale']),
          nest: z.string().min(1).max(200),
          from_branch: z.string().max(200).optional(),
          to_branch: z.string().max(200).optional(),
          branch: z.string().max(200).optional(),
          older_than_days: z.number().int().min(1).max(3650).default(30)
        }),
        z.object({
          action: z.literal('ingest_markdown'),
          content: z.string().min(1).max(500000),
          source_label: z.string().max(1000).optional(),
          nest: z.string().max(200).default(''),
          branch: z.string().max(200).default(''),
          agent_id: z.string().max(200).default(''),
          terse: z.enum(['minimal', 'verbose']).default('verbose')
        }),
        z.object({
          action: z.literal('ingest_json'),
          content: z.string().min(1).max(500000),
          source_label: z.string().max(1000).optional(),
          nest: z.string().max(200).default(''),
          branch: z.string().max(200).default(''),
          agent_id: z.string().max(200).default(''),
          terse: z.enum(['minimal', 'verbose']).default('verbose')
        }),
        z.object({
          action: z.literal('backfill_links'),
          limit: z.number().int().min(1).max(500).default(200),
          offset: z.number().int().min(0).default(0),
          nest: z.string().max(200).optional(),
          branch: z.string().max(200).optional()
        }),
        z.object({
          action: z.literal('write_diary'),
          agent_id: z.string().min(1).max(200),
          content: z.string().min(1).max(20000),
          topic: z.string().max(200).optional(),
          terse: z.enum(['minimal', 'verbose']).default('verbose')
        })
      ]),
      annotations: WRITE_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BATCH_RESULT_SCHEMA
    },
    async (input: any) => {
      const { action, ...args } = input;
      switch (action) {
        case 'add_entity':
          return toMinimalWriteResponse(await memory.addEntity({ name: args.name, type: args.type, properties: args.properties, memoryId: args.memory_id }), args.terse);
        case 'add_triple':
          return toMinimalWriteResponse(await memory.addTriple({
            subjectName: args.subject_name, subjectId: args.subject_id, predicate: args.predicate,
            objectName: args.object_name, objectId: args.object_id,
            validFrom: args.valid_from, validTo: args.valid_to, confidence: args.confidence,
            sourceMemoryId: args.source_memory_id, sourceType: args.source_type
          }), args.terse);
        case 'add_entities_batch':
          return memory.addEntityBatch({
            entities: args.entities.map((e: any) => ({
              name: e.name, type: e.type, properties: e.properties, memoryId: e.memory_id
            })),
            response_format: args.response_format
          });
        case 'add_triples_batch':
          return memory.addTripleBatch({
            triples: args.triples.map((t: any) => ({
              subjectName: t.subject_name, subjectId: t.subject_id, predicate: t.predicate,
              objectName: t.object_name, objectId: t.object_id, validFrom: t.valid_from,
              validTo: t.valid_to, confidence: t.confidence,
              sourceMemoryId: t.source_memory_id, sourceType: t.source_type
            })),
            response_format: args.response_format
          });
        case 'invalidate':
          return toMinimalWriteResponse(await memory.invalidateTriple(args.triple_id, args.valid_to), args.terse);
        case 'delete_entity':
          return memory.deleteEntity(args.entity_id);
        case 'delete_entities_batch':
          return memory.deleteEntityBatch({ entity_ids: args.entity_ids });
        case 'delete_triples_batch':
          return memory.deleteTripleBatch({ triple_ids: args.triple_ids });
        case 'manage_branches':
          return memory.manageBranches({
            action: args.action_type,
            nest: args.nest,
            fromBranch: args.from_branch,
            toBranch: args.to_branch,
            branch: args.branch,
            olderThanDays: args.older_than_days
          });
        case 'ingest_markdown':
          return toMinimalWriteResponse(await memory.ingestMarkdown({ content: args.content, filePath: args.source_label || '', nest: args.nest, branch: args.branch, agentId: args.agent_id }), args.terse);
        case 'ingest_json':
          return toMinimalWriteResponse(await memory.ingestJson({ content: args.content, filePath: args.source_label || '', nest: args.nest, branch: args.branch, agentId: args.agent_id }), args.terse);
        case 'backfill_links':
          return memory.backfillMemoryKgLinks({ limit: args.limit, offset: args.offset, nest: args.nest, branch: args.branch });
        case 'write_diary':
          return toMinimalWriteResponse(await memory.writeDiaryEntry({ agentId: args.agent_id, content: args.content, topic: args.topic }), args.terse);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );

  // --- KG Query Controller (synapse_kg_query) ---
  registerJsonTool(
    ['synapse_kg_query'],
    {
      title: 'KG Query',
      description: 'Unified controller for all knowledge graph queries and state introspection.',
      inputSchema: z.discriminatedUnion('action', [
        z.object({
          action: z.literal('list_entities'),
          type: z.string().max(100).optional(),
          name_contains: z.string().max(200).optional(),
          limit: z.number().int().min(1).max(200).default(20),
          offset: z.number().int().min(0).default(0),
          item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
        }),
        z.object({
          action: z.literal('query_relationships'),
          entity_id: z.string().min(1).max(400),
          direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
          include_invalid: z.boolean().default(false),
          item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
        }),
        z.object({
          action: z.literal('as_of'),
          entity_id: z.string().min(1).max(400),
          as_of_date: z.string().min(1),
          mode: z.enum(['event', 'transaction']).default('event')
        }),
        z.object({
          action: z.literal('timeline'),
          entity_id: z.string().min(1).max(400)
        }),
        z.object({
          action: z.literal('stats')
        }),
        z.object({
          action: z.literal('nest_list')
        }),
        z.object({
          action: z.literal('nest_branches'),
          nest: z.string().min(1).max(200)
        }),
        z.object({
          action: z.literal('nest_tree')
        }),
        z.object({
          action: z.literal('traverse'),
          start_entity_id: z.string().min(1).max(400),
          max_hops: z.number().int().min(1).max(5).default(2),
          direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
          limit: z.number().int().min(1).max(200).default(20),
          entity_type: z.string().max(100).optional(),
          predicates: z.array(z.string().max(200)).max(20).optional(),
          max_per_depth: z.number().int().min(1).max(100).optional()
        }),
        z.object({
          action: z.literal('bridges'),
          nest: z.string().max(200).optional(),
          mode: z.enum(['cross-nest', 'cross-branch']).default('cross-nest')
        }),
        z.object({
          action: z.literal('diary_read'),
          agent_id: z.string().min(1).max(200),
          topic: z.string().max(200).optional(),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0)
        }),
        z.object({
          action: z.literal('check_duplicate'),
          content: z.string().min(1).max(20000),
          threshold: z.number().min(0).max(1).default(0.92),
          nest: z.string().max(200).optional(),
          branch: z.string().max(200).optional(),
          project_path: z.string().max(1000).optional()
        }),
        z.object({
          action: z.literal('hooks_stats')
        }),
        z.object({
          action: z.literal('hooks_list_events')
        })
      ]),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: schemas.OUTPUT_BUNDLE_RESULT_SCHEMA
    },
    async (input: any) => {
      const { action, ...args } = input;
      switch (action) {
        case 'list_entities':
          return applyReadFormatToItems(
            await memory.listEntities({ type: args.type, nameContains: args.name_contains, limit: args.limit, offset: args.offset }),
            (args.item_format as ReadResponseFormat | undefined) ?? 'verbose'
          );
        case 'query_relationships':
          return applyReadFormatToBundle(
            await memory.queryEntityRelationships(args.entity_id, {
              direction: args.direction,
              includeInvalid: args.include_invalid
            }),
            (args.item_format as ReadResponseFormat | undefined) ?? 'verbose'
          );
        case 'as_of':
          return memory.queryTriplesAsOf(args.entity_id, args.as_of_date, args.mode);
        case 'timeline':
          return memory.getEntityTimeline(args.entity_id);
        case 'stats':
          return memory.getKgStats();
        case 'nest_list':
          return memory.listNests();
        case 'nest_branches':
          return memory.listBranches(args.nest);
        case 'nest_tree':
          return memory.getTaxonomyTree();
        case 'traverse':
          return memory.traverseGraph({
            startEntityId: args.start_entity_id,
            maxHops: args.max_hops,
            direction: args.direction,
            limit: args.limit,
            entityType: args.entity_type,
            predicates: args.predicates,
            maxPerDepth: args.max_per_depth
          });
        case 'bridges':
          return memory.discoverBridges({ nest: args.nest, mode: args.mode });
        case 'diary_read':
          return memory.readDiaryEntries({ agentId: args.agent_id, topic: args.topic, limit: args.limit, offset: args.offset });
        case 'check_duplicate':
          return memory.checkDuplicate(args.content, { threshold: args.threshold, nest: args.nest, branch: args.branch, projectPath: args.project_path });
        case 'hooks_stats':
          return memory.store.hooks.getStats();
        case 'hooks_list_events':
          return { events: MemoryHooks.validEvents() };
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }
  );
}
