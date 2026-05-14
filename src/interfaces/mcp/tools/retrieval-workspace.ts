import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS, ToolLevel } from '../common/tool-utils.js';
import type { RegisterJsonToolFn, PaginatedResult, ToolResponsePayload } from '../common/tool-utils.js';
import { buildResourceLink } from '../common/mime.js';
import {
  normalizeProjectTreeResult,
  normalizeReadFileChunkResult,
  normalizeProjectSummaryResult
} from '../common/response-normalizers.js';
import {
  BUNDLE_RESULT_SCHEMA,
  SEARCH_RESULT_SCHEMA
} from '../common/schemas.js';
import type { ResourceLink } from '../common/mime.js';
import type {
  IWorkspaceService,
  IMemoryService
} from '../../../core/interfaces/services.js';
import { McpResponseMapper } from '../utils/response-mapper.js';

export interface RegisterWorkspaceToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  paginateItems: <T>(items: T[], limit: number | undefined, offset: number | undefined) => PaginatedResult<T>;
  workspace: IWorkspaceService;
  defaultMaxReadLines: number;
  memory?: IMemoryService | null;
}

export function registerWorkspaceTools({
  registerJsonTool,
  paginateItems,
  workspace,
  defaultMaxReadLines,
  memory
}: RegisterWorkspaceToolsOptions): void {

  // --- Workspace Management Controller (synapse_workspace_manage) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_workspace_manage'],
    {
      title: 'Workspace Management',
      description: 'Unified controller for file operations, project metadata, and workspace exploration. Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['list_roots', 'list_projects', 'tree', 'read', 'file_changed', 'summarize', 'backfill']).describe('The workspace action to perform'),
        root_path: z.string().optional().describe('Root path for project listing or backfill'),
        project_path: z.string().optional().describe('Path to the project directory'),
        path: z.string().optional().describe('Path to the specific file (action: read, file_changed)'),
        limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of results to return'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
        max_entries: z.number().int().min(1).max(10000).optional().describe('Maximum entries to return in lists or trees'),
        max_depth: z.number().int().min(1).max(8).optional().describe('Maximum depth for directory tree'),
        compact: z.boolean().default(false).describe('Return a compact tree representation'),
        include_legacy_arrays: z.boolean().default(false).describe('Include legacy result formats'),
        start_line: z.number().int().min(1).optional().describe('Starting line number (action: read)'),
        end_line: z.number().int().min(1).optional().describe('Ending line number (action: read)'),
        mode: z.enum(['lines', 'signatures']).optional().describe('Read mode: full lines or function signatures'),
        max_files: z.number().int().min(100).max(20000).optional().describe('Max files to include in project summary'),
        dry_run: z.boolean().default(false).describe('Perform a dry run without making changes (action: backfill)'),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose').describe('Output verbosity')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Workspace'
    },
    async (args: Record<string, unknown>) => {
      const { action, ...params } = args;

      switch (action) {
        case 'list_roots': {
          return McpResponseMapper.standardizeResponse(
            paginateItems(workspace.listRoots(), (params.limit ?? 100) as number, (params.offset ?? 0) as number),
            { item_format: params.item_format as string }
          );
        }
        case 'list_projects': {
          const effectiveLimit = (params.max_entries || params.limit || 100) as number;
          const projects = workspace.listProjects(params.root_path as string | undefined, 2000);
          const paged = paginateItems(projects, effectiveLimit, (params.offset ?? 0) as number);
          return McpResponseMapper.standardizeResponse(
            { ...paged, truncated_total: projects.length === 2000 },
            { item_format: params.item_format as string }
          );
        }
        case 'tree': {
          return McpResponseMapper.standardizeResponse(
            normalizeProjectTreeResult(
              workspace.projectTree((params.project_path as string) || '', (params.max_depth ?? 3) as number, (params.max_entries ?? 1500) as number, params.compact as boolean),
              (params.project_path as string) || '',
              { includeLegacyArrays: Boolean(params.include_legacy_arrays) }
            ),
            { item_format: params.item_format as string }
          );
        }
        case 'read': {
          const result = normalizeReadFileChunkResult(
            await workspace.readFileChunk(params.path as string, (params.start_line ?? 1) as number, (params.end_line ?? defaultMaxReadLines) as number, 800, (params.mode as 'lines' | 'signatures') || 'lines'),
            params.path as string,
            (params.start_line ?? 1) as number,
            (params.end_line ?? defaultMaxReadLines) as number
          );
          if (memory) {
            try {
              const hintResult = await memory.getFileMemoryHints(params.path as string, false);
              if (hintResult.hints.length > 0) (result as Record<string, unknown>)._memory_hints = hintResult.hints;
            } catch {}
          }
          const rec = result as Record<string, unknown>;
          const absPath = typeof rec.path === 'string' ? rec.path : (params.path as string);
          const totalLines = typeof rec.total_lines === 'number' ? rec.total_lines : (typeof rec.end_line === 'number' ? rec.end_line : 0);
          const description = `chunk ${rec.start_line}-${rec.end_line} of ${totalLines} lines`;
          const resourceLinks: ResourceLink[] = absPath ? [buildResourceLink(absPath, description)] : [];
          return createToolResponse(McpResponseMapper.standardizeResponse(result), { resourceLinks });
        }
        case 'file_changed': {
          if (!memory) return McpResponseMapper.standardizeResponse({ file_path: params.path, hints: [] });
          try {
            const result = await memory.getFileMemoryHints(params.path as string, true);
            return McpResponseMapper.standardizeResponse(result);
          } catch (err) {
            return McpResponseMapper.standardizeResponse({
              file_path: params.path, hints: [],
              error: err instanceof Error ? err.message : 'hint lookup failed'
            });
          }
        }
        case 'summarize': {
          return McpResponseMapper.standardizeResponse(
            normalizeProjectSummaryResult(
              workspace.summarizeProject(params.project_path as string, (params.max_files ?? 3000) as number),
              params.project_path as string
            ),
            { item_format: params.item_format as string }
          );
        }
        case 'backfill': {
          if (!memory) throw new Error('memory store not available');
          const result = await memory.scanAndBackfillProjects({ rootPath: params.root_path as string, dryRun: params.dry_run as boolean });
          return McpResponseMapper.standardizeResponse(result);
        }
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );
}
