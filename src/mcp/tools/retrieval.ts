import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS, WRITE_ANNOTATIONS } from '../common/tool-utils.js';
import type { ToolResponsePayload, RegisterJsonToolFn, PaginatedResult } from '../common/tool-utils.js';
import { buildResourceLink } from '../common/mime.js';
import type { ResourceLink } from '../common/mime.js';
import {
  normalizeEmbedStatus,
  normalizeIndexStatus,
  normalizeIndexProjectResult,
  normalizeSearchHybridResult,
  normalizeSymbolResult,
  normalizeUsageResult
} from '../common/response-normalizers.js';
import {
  SEARCH_RESULT_SCHEMA,
  STATUS_RESULT_SCHEMA
} from '../common/schemas.js';
import type { RootEntry } from '../../runtime/config.js';
import { registerWorkspaceTools } from './retrieval-workspace.js';

interface WorkspaceService {
  listRoots(): RootEntry[];
  listProjects(rootPath: string | undefined, max: number): unknown[];
  projectTree(projectPath: string, maxDepth: number, maxEntries: number): unknown;
  readFileChunk(filePath: string, startLine: number, endLine: number, maxWidth: number): Promise<unknown>;
  summarizeProject(projectPath: string, maxFiles: number): unknown;
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
}

interface VectorIndexService {
  getStatus(): unknown;
  indexProject(opts: Record<string, unknown>): Promise<unknown>;
}

interface SearchService {
  searchFiles(opts: Record<string, unknown>): unknown[];
  searchCode(opts: Record<string, unknown>): unknown[];
  searchHybrid(opts: Record<string, unknown>): Promise<unknown>;
  getSymbol(opts: Record<string, unknown>): unknown;
  findUsages(opts: Record<string, unknown>): unknown;
}

interface McpExtra {
  _meta?: { progressToken?: unknown };
  sendNotification?(notification: { method: string; params: Record<string, unknown> }): Promise<void>;
}

interface MemoryServiceForHints {
  getFileMemoryHints(filePath: string, suggestUpdate?: boolean): Promise<{
    file_path: string;
    hints: Array<{
      memory_id: string;
      title: string;
      importance: number;
      kind: string;
      summary_excerpt: string;
      suggest_update: boolean;
    }>;
  }>;
}

export interface RegisterRetrievalToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  paginateItems: <T>(items: T[], limit: number | undefined, offset: number | undefined) => PaginatedResult<T>;
  workspace: WorkspaceService;
  vectorIndex: VectorIndexService;
  search: SearchService;
  defaultMaxReadLines: number;
  defaultMaxResults: number;
  memory?: MemoryServiceForHints | null;
}

export function registerRetrievalTools({
  registerJsonTool,
  paginateItems,
  workspace,
  vectorIndex,
  search,
  defaultMaxReadLines,
  defaultMaxResults,
  memory
}: RegisterRetrievalToolsOptions): void {
  // Workspace tools (list, tree, read, file-changed, summarize)
  registerWorkspaceTools({ registerJsonTool, paginateItems, workspace, defaultMaxReadLines, memory });

  async function emitProgress(extra: unknown, progress: number, total: number, message: string): Promise<void> {
    const mcpExtra = extra as McpExtra | undefined;
    const token = mcpExtra?._meta?.progressToken;
    if (token === undefined || typeof mcpExtra?.sendNotification !== 'function') return;
    await mcpExtra.sendNotification({
      method: 'notifications/progress',
      params: { progressToken: token, progress, total, message }
    });
  }

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

  registerJsonTool(
    'synapse_index_status',
    {
      title: 'Index Status',
      description: 'Return local semantic index status and metadata.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA
    },
    async () => normalizeIndexStatus(vectorIndex.getStatus())
  );

  registerJsonTool(
    'synapse_embed_status',
    {
      title: 'Embedding Status',
      description: 'Return active embedding backend/model status and vector-search readiness.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA
    },
    async () => normalizeEmbedStatus(vectorIndex.getStatus())
  );

  registerJsonTool(
    'synapse_index_project',
    {
      title: 'Index Project',
      description: 'Build or refresh semantic index for a project or across all roots.',
      inputSchema: {
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        force: z.boolean().default(false),
        max_files: z.number().int().min(1).max(200000).default(20000)
      },
      annotations: WRITE_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA
    },
    async ({ project_path, all_roots, force, max_files }: Record<string, unknown>, extra: unknown) => {
      const maxFilesNum = max_files as number;
      await emitProgress(extra, 0, maxFilesNum, 'index_project started');
      const out = await vectorIndex.indexProject({
        projectPath: project_path, allRoots: all_roots, force, maxFiles: maxFilesNum,
        onProgress: async ({ scanned = 0, total = maxFilesNum, phase = 'indexing' }: { scanned?: number; total?: number; phase?: string }) => {
          await emitProgress(extra, scanned, total, phase);
        }
      }) as Record<string, unknown>;
      await emitProgress(
        extra,
        (out.scanned_files || out.total_files || maxFilesNum) as number,
        (out.scanned_files || out.total_files || maxFilesNum) as number,
        'index_project completed'
      );
      return normalizeIndexProjectResult(out, maxFilesNum);
    }
  );

  registerJsonTool(
    'synapse_search_files',
    {
      title: 'Search Files',
      description: '[FAST_DISCOVERY] Search file paths and names matching a query. Use this first when looking for a module, feature, or component by name (e.g. "sso", "payment", "auth").',
      inputSchema: {
        query: z.string().min(1),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        max_results: z.number().int().min(1).max(1000).default(defaultMaxResults),
        case_sensitive: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ query, project_path, all_roots, max_results, case_sensitive }: Record<string, unknown>) => {
      const results = search.searchFiles({
        query, projectPath: project_path, allRoots: all_roots,
        maxResults: max_results, caseSensitive: case_sensitive
      });
      if (results.length > 0) {
        const seen = new Set<string>();
        const resourceLinks: ResourceLink[] = [];
        for (const item of results as Array<{ file?: string; relative_path?: string; name?: string }>) {
          const absPath = typeof item?.file === 'string' ? item.file : '';
          if (!absPath || seen.has(absPath)) continue;
          seen.add(absPath);
          const fragment = item.relative_path || item.name || absPath;
          resourceLinks.push(buildResourceLink(absPath, `path match: ${fragment}`));
        }
        return createToolResponse(results, { resourceLinks });
      }

      return withSearchMissResponse(
        results,
        buildSearchMeta({ tool: 'synapse_search_files', query: query as string, project_path, all_roots, max_results: max_results as number, case_sensitive }),
        'No file-path matches found.',
        ['Verify project_path or broaden the query to a path fragment.', 'Try synonyms or module names instead of full phrases.'],
        'Retry synapse_search_files with a broader path fragment or switch to synapse_search_code for an exact symbol.'
      );
    }
  );

  registerJsonTool(
    'synapse_search_code',
    {
      title: 'Search Code',
      description: '[EXACT_MATCH] Search text across files under a project/root and return matching lines. Best for exact symbol names, imports, or known identifiers.',
      inputSchema: {
        query: z.string().min(1),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        glob: z.string().default('*'),
        max_results: z.number().int().min(1).max(1000).default(defaultMaxResults),
        case_sensitive: z.boolean().default(false),
        context_lines: z.number().int().min(0).max(10).default(0),
        use_regex: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ query, project_path, all_roots, glob, max_results, case_sensitive, context_lines, use_regex }: Record<string, unknown>) => {
      const results = search.searchCode({
        query, projectPath: project_path, allRoots: all_roots, glob,
        maxResults: max_results, caseSensitive: case_sensitive,
        contextLines: context_lines, useRegex: use_regex
      });
      if (results.length > 0) {
        const counts = new Map<string, number>();
        for (const item of results as Array<{ file?: string }>) {
          const absPath = typeof item?.file === 'string' ? item.file : '';
          if (!absPath) continue;
          counts.set(absPath, (counts.get(absPath) || 0) + 1);
        }
        const resourceLinks: ResourceLink[] = [];
        for (const [absPath, count] of counts) {
          const noun = count === 1 ? 'match' : 'matches';
          resourceLinks.push(buildResourceLink(absPath, `${count} ${noun} for ${query as string}`));
        }
        return createToolResponse(results, { resourceLinks });
      }

      return withSearchMissResponse(
        results,
        buildSearchMeta({ tool: 'synapse_search_code', query: query as string, project_path, all_roots, glob: glob as string, max_results: max_results as number, case_sensitive, context_lines: context_lines as number, use_regex: use_regex as boolean }),
        'No code matches found in the current scope.',
        ['Verify the scope and try a broader query or synonyms.', 'If you need pattern matching, retry with use_regex=true.'],
        'Retry synapse_search_code with a broader query or use_regex=true, or switch to synapse_search_hybrid for concept lookup.'
      );
    }
  );

  registerJsonTool(
    'synapse_search_hybrid',
    {
      title: 'Search Hybrid',
      description: '[DEEP_ANALYSIS] Run lexical + semantic retrieval and return RRF-ranked results. Best for queries where concepts and context matter as much as exact keywords.',
      inputSchema: {
        query: z.string().min(1),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        glob: z.string().default('*'),
        max_results: z.number().int().min(1).max(1000).default(defaultMaxResults),
        case_sensitive: z.boolean().default(false),
        min_semantic_score: z.number().min(0).max(1).default(0.05),
        auto_index: z.boolean().default(true),
        use_reranker: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ query, project_path, all_roots, glob, max_results, case_sensitive, min_semantic_score, auto_index, use_reranker }: Record<string, unknown>) => normalizeSearchHybridResult(
      await search.searchHybrid({
        query, projectPath: project_path, allRoots: all_roots, glob,
        maxResults: max_results, caseSensitive: case_sensitive,
        minSemanticScore: min_semantic_score, autoIndex: auto_index, useReranker: use_reranker
      }),
      query as string
    )
  );

  registerJsonTool(
    'synapse_get_symbol',
    {
      title: 'Get Symbol',
      description: '[SYMBOL_INDEX] Look up symbol definitions/exports by name using fast regex search.',
      inputSchema: {
        symbol: z.string().min(1),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        glob: z.string().default('*'),
        max_results: z.number().int().min(1).max(1000).default(defaultMaxResults),
        case_sensitive: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ symbol, project_path, all_roots, glob, max_results, case_sensitive }: Record<string, unknown>) => normalizeSymbolResult(
      search.getSymbol({ symbol, projectPath: project_path, allRoots: all_roots, glob, maxResults: max_results, caseSensitive: case_sensitive }),
      symbol as string
    )
  );

  registerJsonTool(
    'synapse_find_usages',
    {
      title: 'Find Usages',
      description: '[USAGE_ANALYSIS] Find call sites and import usages of a symbol by name.',
      inputSchema: {
        symbol: z.string().min(1),
        project_path: z.string().optional(),
        all_roots: z.boolean().default(false),
        glob: z.string().default('*'),
        max_results: z.number().int().min(1).max(1000).default(defaultMaxResults),
        case_sensitive: z.boolean().default(false),
        context_lines: z.number().int().min(0).max(10).default(0)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ symbol, project_path, all_roots, glob, max_results, case_sensitive, context_lines }: Record<string, unknown>) => normalizeUsageResult(
      search.findUsages({ symbol, projectPath: project_path, allRoots: all_roots, glob, maxResults: max_results, caseSensitive: case_sensitive, contextLines: context_lines }),
      symbol as string
    )
  );
}
