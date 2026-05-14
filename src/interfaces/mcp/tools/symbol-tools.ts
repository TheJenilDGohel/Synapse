import { z } from 'zod';
import { READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import {
  normalizeCallersResult,
  normalizeDefinitionResult,
  normalizeImplementationsResult,
  normalizeRenamePreviewResult,
  normalizeSymbolResult,
  normalizeUsageResult
} from '../common/response-normalizers.js';
import { SEARCH_RESULT_SCHEMA } from '../common/schemas.js';
import type { ISymbolSearchService, ISearchService } from '../../../core/interfaces/services.ts';
import { McpResponseMapper } from '../utils/response-mapper.js';

export interface RegisterSymbolToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  search: ISymbolSearchService;
  coreSearch: ISearchService;
  defaultMaxResults: number;
}

export function registerSymbolTools({
  registerJsonTool,
  search,
  coreSearch,
  defaultMaxResults
}: RegisterSymbolToolsOptions): void {

  // --- Symbol Intelligence Controller (synapse_symbol_query) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_symbol_query'],
    {
      title: 'Symbol Query',
      description: 'Unified controller for static code intelligence (callers, definitions, usages, implementations). Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['callers', 'definition', 'implementations', 'usages', 'get', 'rename_preview']).describe('The symbol intelligence action to perform'),
        symbol: z.string().optional().describe('The symbol name to query (action: callers, definition, usages, get)'),
        interface_name: z.string().optional().describe('The interface or trait name to find implementations of (action: implementations)'),
        old_name: z.string().optional().describe('The current symbol name to rename (action: rename_preview)'),
        new_name: z.string().optional().describe('The desired new name (action: rename_preview)'),
        project_path: z.string().optional().describe('Scope search to a specific project'),
        all_roots: z.boolean().default(false).describe('Search across all configured roots'),
        language: z.string().optional().describe('Filter by language: typescript, javascript, python, go, rust'),
        max_results: z.number().int().min(1).max(2000).optional().describe('Maximum number of results to return'),
        glob: z.string().default('*').describe('Glob pattern to filter files'),
        case_sensitive: z.boolean().default(false).describe('Enable case-sensitive matching'),
        context_lines: z.number().int().min(0).max(10).default(0).describe('Lines of context around matches'),
        include_legacy_arrays: z.boolean().default(false).describe('Include legacy result formats'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA,
      category: 'Symbol Intelligence'
    },
    async (args: Record<string, unknown>) => {
      const { action, item_format = 'verbose', ...params } = args;

      switch (action) {
        case 'callers': {
          const results = search.findCallersSymbol({
            symbol: params.symbol as string, projectPath: params.project_path as any, language: params.language as any,
            maxResults: (params.max_results ?? 100) as number
          });
          return McpResponseMapper.standardizeResponse(normalizeCallersResult(results, params.symbol as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'definition': {
          const results = search.findDefinitionSymbol({
            symbol: params.symbol as string, projectPath: params.project_path as any, language: params.language as any
          });
          return McpResponseMapper.standardizeResponse(normalizeDefinitionResult(results, params.symbol as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'implementations': {
          const results = search.findImplementationsSymbol({
            interfaceName: params.interface_name as string, projectPath: params.project_path as any, language: params.language as any,
            maxResults: (params.max_results ?? 100) as number
          });
          return McpResponseMapper.standardizeResponse(normalizeImplementationsResult(results, params.interface_name as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'usages': {
          const results = coreSearch.findUsages({
            symbol: params.symbol as string, projectPath: params.project_path as any, allRoots: params.all_roots as any,
            glob: params.glob as any, maxResults: (params.max_results ?? defaultMaxResults) as any, caseSensitive: params.case_sensitive as any,
            contextLines: params.context_lines as any
          });
          return McpResponseMapper.standardizeResponse(normalizeUsageResult(results, params.symbol as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'get': {
          const results = coreSearch.getSymbol({
            symbol: params.symbol as string, projectPath: params.project_path as any, allRoots: params.all_roots as any,
            glob: params.glob as any, maxResults: (params.max_results ?? defaultMaxResults) as any, caseSensitive: params.case_sensitive as any
          });
          return McpResponseMapper.standardizeResponse(normalizeSymbolResult(results, params.symbol as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        case 'rename_preview': {
          const results = search.renamePreviewSymbol({
            oldName: params.old_name as string, newName: params.new_name as string, projectPath: params.project_path as any,
            maxResults: (params.max_results ?? 500) as number
          });
          return McpResponseMapper.standardizeResponse(normalizeRenamePreviewResult(results, params.old_name as string, params.new_name as string, { includeLegacyArrays: Boolean(params.include_legacy_arrays) }), { item_format: item_format as string });
        }
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );
}
