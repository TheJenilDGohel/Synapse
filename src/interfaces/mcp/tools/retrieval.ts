import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS, ToolLevel } from '../common/tool-utils.js';
import type { ToolResponsePayload, RegisterJsonToolFn, PaginatedResult } from '../common/tool-utils.js';
import { buildResourceLink } from '../common/mime.js';
import type { ResourceLink } from '../common/mime.js';
import {
  normalizeSearchHybridResult,
  normalizeSearchFileResult,
  normalizeSearchCodeResult
} from '../common/response-normalizers.js';
import {
  SEARCH_RESULT_SCHEMA
} from '../common/schemas.js';
import { registerWorkspaceTools } from './retrieval-workspace.js';
import { McpResponseMapper } from '../utils/response-mapper.js';
import { unifiedFind } from '../../../core/engine/index.js';
import { applyReadFormat } from '../common/terse-utils.js';
import type { ReadResponseFormat } from '../common/terse-utils.js';
import type {
  IWorkspaceService,
  IVectorIndexService,
  ISearchService,
  IMemoryService
} from '../../../core/interfaces/services.js';

export interface RegisterRetrievalToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  paginateItems: <T>(items: T[], limit: number | undefined, offset: number | undefined) => PaginatedResult<T>;
  workspace: IWorkspaceService;
  search: ISearchService;
  defaultMaxReadLines: number;
  defaultMaxResults: number;
  memory?: IMemoryService | null;
}

export function registerRetrievalTools({
  registerJsonTool,
  paginateItems,
  workspace,
  defaultMaxReadLines,
  memory,
  search,
  defaultMaxResults
}: RegisterRetrievalToolsOptions): void {
  // Workspace tools (list, tree, read, file-changed, summarize, backfill)
  registerWorkspaceTools({ registerJsonTool, paginateItems, workspace, defaultMaxReadLines, memory });

  function buildSearchMeta({ tool, query, project_path, all_roots, glob = '*', max_results, case_sensitive, context_lines = 0, use_regex = false }: {
    tool: string; query: string; project_path?: unknown; all_roots?: unknown; glob?: string;
    max_results?: unknown; case_sensitive?: unknown; context_lines?: number; use_regex?: boolean;
  }): Record<string, unknown> {
    const searched_bases = workspace.resolveSearchBases(project_path as string | undefined, all_roots as boolean | undefined);
    return {
      tool, query, count: 0,
      scope: {
        project_path: project_path || '', all_roots: Boolean(all_roots), glob,
        max_results, case_sensitive: Boolean(case_sensitive), context_lines,
        use_regex: Boolean(use_regex), searched_bases
      }
    };
  }

  function withSearchMissResponse(
    data: unknown, meta: Record<string, unknown>, note: string,
    guidance: string[], recommendedNextAction: string
  ): ToolResponsePayload {
    return createToolResponse(data, {
      meta: { ...meta, guidance, recommended_next_action: recommendedNextAction },
      note: `${note} ${guidance.join(' ')} Next: ${recommendedNextAction}`
    });
  }

  // --- Search Controller (synapse_search) ---
  // Refactored to flat z.object for Gemini compatibility (avoids discriminatedUnion/oneOf)
  registerJsonTool(
    ['synapse_search'],
    {
      title: 'Search',
      description: 'Unified controller for file discovery, code search, and semantic retrieval. Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['files', 'code', 'hybrid', 'find']).describe('The search action to perform'),
        query: z.string().min(1).describe('Search query string'),
        project_path: z.string().optional().describe('Scope search to a specific project directory'),
        all_roots: z.boolean().default(false).describe('Search across all configured roots'),
        max_results: z.number().int().min(1).max(1000).optional().describe('Maximum number of results to return'),
        case_sensitive: z.boolean().default(false).describe('Enable case-sensitive matching'),
        glob: z.string().optional().describe('Glob pattern to filter files (action: code, hybrid)'),
        context_lines: z.number().int().min(0).max(10).optional().describe('Lines of context around matches (action: code)'),
        use_regex: z.boolean().default(false).describe('Enable regex search (action: code)'),
        min_semantic_score: z.number().min(0).max(1).optional().describe('Minimum score for semantic matches (action: hybrid)'),
        auto_index: z.boolean().default(true).describe('Automatically index project if needed (action: hybrid)'),
        use_reranker: z.boolean().default(false).describe('Enable reranking (action: hybrid)'),
        include_legacy_arrays: z.boolean().default(false).describe('Include legacy result formats'),
        limit: z.number().int().min(1).max(50).optional().describe('Result limit (action: find)'),
        sources: z.array(z.enum(['memory', 'code', 'triple'])).optional().describe('Sources to query (action: find)'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Search & Intelligence'
    },
    async (args: Record<string, unknown>) => {
      const { action, item_format = 'verbose', ...params } = args;

      switch (action) {
        case 'files': {
          const results = search.searchFiles({
            query: params.query as string, projectPath: params.project_path as any, allRoots: params.all_roots as any,
            maxResults: (params.max_results ?? defaultMaxResults) as any, caseSensitive: params.case_sensitive as any
          });
          const normalized = normalizeSearchFileResult(results, params.query as string);
          const response = McpResponseMapper.standardizeResponse(normalized, { item_format: item_format as string });
          if (normalized.items.length > 0) {
            const seen = new Set<string>();
            const resourceLinks: ResourceLink[] = [];
            for (const item of normalized.items as any[]) {
              const absPath = item?.file || '';
              if (!absPath || seen.has(absPath)) continue;
              seen.add(absPath);
              resourceLinks.push(buildResourceLink(absPath, `path match: ${item.relative_path || item.name || absPath}`));
            }
            return createToolResponse(response, { resourceLinks });
          }
          return withSearchMissResponse(response, buildSearchMeta({ tool: 'synapse_search files', query: params.query as string, ...params, max_results: params.max_results ?? defaultMaxResults }), 'No file-path matches found.', ['Verify project_path or broaden the query.'], 'Retry with a broader path fragment.');
        }
        case 'code': {
          const results = search.searchCode({
            query: params.query as string, projectPath: params.project_path as any, allRoots: params.all_roots as any, glob: (params.glob || '*') as any,
            maxResults: (params.max_results ?? defaultMaxResults) as any, caseSensitive: params.case_sensitive as any,
            contextLines: (params.context_lines ?? 0) as any, useRegex: params.use_regex as any
          });
          const normalized = normalizeSearchCodeResult(results, params.query as string);
          const response = McpResponseMapper.standardizeResponse(normalized, { item_format: item_format as string });
          if (normalized.items.length > 0) {
            const counts = new Map<string, number>();
            for (const item of normalized.items as any[]) {
              const absPath = item?.file || '';
              if (absPath) counts.set(absPath, (counts.get(absPath) || 0) + 1);
            }
            const resourceLinks = Array.from(counts.entries()).map(([p, c]) => buildResourceLink(p, `${c} match${c === 1 ? '' : 'es'} for ${params.query}`));
            return createToolResponse(response, { resourceLinks });
          }
          return withSearchMissResponse(response, buildSearchMeta({ tool: 'synapse_search code', query: params.query as string, ...params, max_results: params.max_results ?? defaultMaxResults, glob: (params.glob || '*') as string, context_lines: params.context_lines as number }), 'No code matches found.', ['Verify the scope and try a broader query.'], 'Retry with use_regex=true or switch to hybrid search.');
        }
        case 'hybrid': {
          const results = await search.searchHybrid({
            query: params.query as string, projectPath: params.project_path as any, allRoots: params.all_roots as any, glob: (params.glob || '*') as any,
            maxResults: (params.max_results ?? defaultMaxResults) as any, caseSensitive: params.case_sensitive as any,
            minSemanticScore: (params.min_semantic_score ?? 0.05) as any, autoIndex: params.auto_index as any, useReranker: params.use_reranker as any
          });
          const normalized = normalizeSearchHybridResult(results, params.query as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) });
          return McpResponseMapper.standardizeResponse(normalized, { item_format: item_format as string });
        }
        case 'find': {
          const findResult = await unifiedFind({
            query: params.query as string, limit: (params.limit ?? 10) as any, projectPath: params.project_path as any, allRoots: params.all_roots as any, sources: (params.sources ?? ['memory', 'code', 'triple']) as any
          }, { memory: memory as any, search: search as any });
          const format = (item_format as ReadResponseFormat | undefined) ?? 'verbose';
          const items = format === 'verbose' ? (findResult.items ?? []) : (findResult.items ?? []).map((it) => applyReadFormat(it, format));
          const data = { total_count: items.length, count: items.length, limit: params.limit ?? 10, offset: 0, has_more: false, next_offset: null, items };
          return createToolResponse(data, { meta: { tool: 'synapse_search find', query: findResult.query, count: findResult.count, sources: findResult.sources } });
        }
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );
}
