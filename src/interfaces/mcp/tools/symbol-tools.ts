import { z } from 'zod';
import { READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import {
  normalizeCallersResult,
  normalizeDefinitionResult,
  normalizeImplementationsResult,
  normalizeRenamePreviewResult
} from '../common/response-normalizers.js';
import { SEARCH_RESULT_SCHEMA } from '../common/schemas.js';
import type { ISymbolSearchService } from '../../../core/interfaces/services.ts';

export interface RegisterSymbolToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  search: ISymbolSearchService;
}

export function registerSymbolTools({
  registerJsonTool,
  search
}: RegisterSymbolToolsOptions): void {

  registerJsonTool(
    'synapse_find_callers',
    {
      title: 'Find Callers',
      description:
        'Find every call site of a function or method across indexed files. ' +
        'Returns file path, line number, and surrounding context for each call. ' +
        'Requires the project to be indexed first via synapse_index_project.',
      inputSchema: {
        symbol: z.string().min(1).describe('The function or method name to find callers of'),
        project_path: z.string().optional().describe('Scope search to a specific project'),
        language: z.string().optional().describe('Filter by language: typescript, javascript, python, go, rust'),
        max_results: z.number().int().min(1).max(1000).default(100),
        include_legacy_arrays: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ symbol, project_path, language, max_results, include_legacy_arrays }: Record<string, unknown>) =>
      normalizeCallersResult(
        search.findCallersSymbol({
          symbol: symbol as string,
          projectPath: project_path as string | undefined,
          language: language as string | undefined,
          maxResults: max_results as number
        }),
        symbol as string,
        { includeLegacyArrays: Boolean(include_legacy_arrays) }
      )
  );

  registerJsonTool(
    'synapse_find_definition',
    {
      title: 'Find Definition',
      description:
        'Jump to the declaration location(s) of a symbol across TypeScript, JavaScript, ' +
        'Python, Go, and Rust files. Returns file path, line range, and declaration text. ' +
        'Requires the project to be indexed first via synapse_index_project.',
      inputSchema: {
        symbol: z.string().min(1).describe('The symbol name to find the definition of'),
        project_path: z.string().optional().describe('Scope search to a specific project'),
        language: z.string().optional().describe('Filter by language: typescript, javascript, python, go, rust'),
        include_legacy_arrays: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ symbol, project_path, language, include_legacy_arrays }: Record<string, unknown>) =>
      normalizeDefinitionResult(
        search.findDefinitionSymbol({
          symbol: symbol as string,
          projectPath: project_path as string | undefined,
          language: language as string | undefined
        }),
        symbol as string,
        { includeLegacyArrays: Boolean(include_legacy_arrays) }
      )
  );

  registerJsonTool(
    'synapse_find_implementations',
    {
      title: 'Find Implementations',
      description:
        'Find every class, struct, or object that implements a given interface or trait. ' +
        'Supports TypeScript implements, Python class inheritance, Rust impl-for, and Go struct patterns. ' +
        'Requires the project to be indexed first via synapse_index_project.',
      inputSchema: {
        interface_name: z.string().min(1).describe('The interface or trait name to find implementations of'),
        project_path: z.string().optional().describe('Scope search to a specific project'),
        language: z.string().optional().describe('Filter by language: typescript, javascript, python, go, rust'),
        max_results: z.number().int().min(1).max(1000).default(100),
        include_legacy_arrays: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ interface_name, project_path, language, max_results, include_legacy_arrays }: Record<string, unknown>) =>
      normalizeImplementationsResult(
        search.findImplementationsSymbol({
          interfaceName: interface_name as string,
          projectPath: project_path as string | undefined,
          language: language as string | undefined,
          maxResults: max_results as number
        }),
        interface_name as string,
        { includeLegacyArrays: Boolean(include_legacy_arrays) }
      )
  );

  registerJsonTool(
    'synapse_rename_preview',
    {
      title: 'Rename Preview',
      description:
        'Preview every location that would change when renaming a symbol. ' +
        'Does NOT modify any files -- returns a dry-run list of changes grouped by file. ' +
        'Requires the project to be indexed first via synapse_index_project.',
      inputSchema: {
        old_name: z.string().min(1).describe('The current symbol name to rename'),
        new_name: z.string().min(1).describe('The desired new name'),
        project_path: z.string().optional().describe('Scope search to a specific project'),
        max_results: z.number().int().min(1).max(2000).default(500),
        include_legacy_arrays: z.boolean().default(false)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ old_name, new_name, project_path, max_results, include_legacy_arrays }: Record<string, unknown>) =>
      normalizeRenamePreviewResult(
        search.renamePreviewSymbol({
          oldName: old_name as string,
          newName: new_name as string,
          projectPath: project_path as string | undefined,
          maxResults: max_results as number
        }),
        old_name as string,
        new_name as string,
        { includeLegacyArrays: Boolean(include_legacy_arrays) }
      )
  );
}
