import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { unifiedFind } from '../../engine/index.js';
import { SEARCH_RESULT_SCHEMA } from '../common/schemas.js';
import { applyReadFormat } from '../common/terse-utils.js';
import type { ReadResponseFormat } from '../common/terse-utils.js';

interface MemoryServiceForFind {
  recall(args: Record<string, unknown>): Promise<unknown>;
  searchTriples(args: Record<string, unknown>): Promise<unknown>;
}

interface SearchServiceForFind {
  searchHybrid(opts: Record<string, unknown>): Promise<unknown>;
}

export interface RegisterFindToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  memory?: MemoryServiceForFind | null;
  search?: SearchServiceForFind | null;
}

export function registerFindTools({
  registerJsonTool,
  memory,
  search
}: RegisterFindToolsOptions): void {
  registerJsonTool(
    'synapse_find',
    {
      title: 'Unified Find',
      description:
        'Search across memory entries, code chunks, and knowledge graph triples in a single call. ' +
        'Results are re-ranked across all sources using normalized scores. Each item includes a ' +
        'source field ("memory", "code", or "triple"). Use the sources parameter to limit which ' +
        'backends are queried.',
      inputSchema: {
        query: z.string().min(1).max(2000),
        limit: z.number().int().min(1).max(50).default(10),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        sources: z
          .array(z.enum(['memory', 'code', 'triple']))
          .min(1)
          .default(['memory', 'code', 'triple']),
        // quick 260415-n69: opt-in token savings via item_format tiers.
        // Named `item_format` to avoid collision with the serialization-level
        // `response_format: json|markdown` that createJsonToolRegistrar injects
        // into every tool automatically.
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({
      query,
      limit,
      project_path,
      all_roots,
      sources,
      item_format
    }: Record<string, unknown>) => {
      const requestedLimit = (typeof limit === 'number' && Number.isFinite(limit)) ? limit : 10;
      const findResult = await unifiedFind(
        {
          query: query as string,
          limit: requestedLimit,
          projectPath: project_path as string | undefined,
          allRoots: all_roots as boolean | undefined,
          sources: sources as Array<'memory' | 'code' | 'triple'> | undefined
        },
        {
          memory: memory as any,
          search: search as any
        }
      );

      // Shape `data` to match SEARCH_RESULT_SCHEMA (PaginatedResult). Find is
      // single-shot — no real pagination — so offset is 0 and has_more is false.
      // Per-source counts and the echoed query live in meta.
      const format = (item_format as ReadResponseFormat | undefined) ?? 'verbose';
      const rawItems = findResult.items ?? [];
      const items = format === 'verbose' ? rawItems : rawItems.map((it) => applyReadFormat(it, format));
      const data = {
        total_count: items.length,
        count: items.length,
        limit: requestedLimit,
        offset: 0,
        has_more: false,
        next_offset: null,
        items
      };

      return createToolResponse(data, {
        meta: {
          tool: 'synapse_find',
          query: findResult.query,
          count: findResult.count,
          sources: findResult.sources
        }
      });
    }
  );
}
