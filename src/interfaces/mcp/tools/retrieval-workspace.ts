import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn, PaginatedResult } from '../common/tool-utils.js';
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
import type { RootEntry } from '../../../core/runtime/config.js';
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
  registerJsonTool(
    'synapse_list_roots',
    {
      title: 'List Roots',
      description: 'List configured local roots available to this MCP server.',
      inputSchema: {
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ limit, offset, item_format }: Record<string, unknown>) => McpResponseMapper.standardizeResponse(
      paginateItems(workspace.listRoots(), limit as number, offset as number),
      { item_format: item_format as string }
    )
  );

  registerJsonTool(
    'synapse_list_projects',
    {
      title: 'List Projects',
      description: 'List first-level project directories under a root.',
      inputSchema: {
        root_path: z.string().optional(),
        max_entries: z.number().int().min(1).max(1000).optional(),
        limit: z.number().int().min(1).max(1000).default(100),
        offset: z.number().int().min(0).default(0),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: SEARCH_RESULT_SCHEMA
    },
    async ({ root_path, max_entries, limit, offset, item_format }: Record<string, unknown>) => {
      const effectiveLimit = (max_entries || limit) as number;
      const projects = workspace.listProjects(root_path as string | undefined, 2000);
      const paged = paginateItems(projects, effectiveLimit, offset as number);
      return McpResponseMapper.standardizeResponse(
        {
          ...paged,
          truncated_total: projects.length === 2000
        },
        { item_format: item_format as string }
      );
    }
  );

  registerJsonTool(
    'synapse_project_tree',
    {
      title: 'Project Tree',
      description: 'Return a compact tree of files/directories for a project path.',
      inputSchema: {
        project_path: z.string(),
        max_depth: z.number().int().min(1).max(8).default(3),
        max_entries: z.number().int().min(1).max(10000).default(1500),
        compact: z.boolean().default(false),
        include_legacy_arrays: z.boolean().default(false),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ project_path, max_depth, max_entries, compact, include_legacy_arrays, item_format }: Record<string, unknown>) => McpResponseMapper.standardizeResponse(
      normalizeProjectTreeResult(
        workspace.projectTree(project_path as string, max_depth as number, max_entries as number, compact as boolean),
        project_path as string,
        { includeLegacyArrays: Boolean(include_legacy_arrays) }
      ),
      { item_format: item_format as string }
    )
  );

  registerJsonTool(
    'synapse_read_file',
    {
      title: 'Read File',
      description: 'Read a bounded chunk of a file with line numbers.',
      inputSchema: {
        path: z.string(),
        start_line: z.number().int().min(1).default(1),
        end_line: z.number().int().min(1).default(defaultMaxReadLines),
        mode: z.enum(['lines', 'signatures']).default('lines')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ path: filePath, start_line, end_line, mode }: Record<string, unknown>) => {
      const result = normalizeReadFileChunkResult(
        await workspace.readFileChunk(filePath as string, start_line as number, end_line as number, 800, mode as 'lines' | 'signatures'),
        filePath as string,
        start_line as number,
        end_line as number
      );
      // HOOK-07: Proactive memory hints for linked files
      if (memory) {
        try {
          const hintResult = await memory.getFileMemoryHints(filePath as string, false);
          if (hintResult.hints.length > 0) {
            (result as Record<string, unknown>)._memory_hints = hintResult.hints;
          }
        } catch {
          // HOOK-09: Non-blocking -- hint failure does not affect file read
        }
      }
      // RLINK-01..03: emit one resource_link for the chunk
      const rec = result as Record<string, unknown>;
      const absPath = typeof rec.path === 'string' ? rec.path : (filePath as string);
      const totalLines = typeof rec.total_lines === 'number' ? rec.total_lines : (typeof rec.end_line === 'number' ? rec.end_line : 0);
      const description = `chunk ${rec.start_line}-${rec.end_line} of ${totalLines} lines`;
      const resourceLinks: ResourceLink[] = absPath ? [buildResourceLink(absPath, description)] : [];
      return createToolResponse(McpResponseMapper.standardizeResponse(result), { resourceLinks });
    }
  );

  // HOOK-08: Report file changes and receive proactive memory hints
  registerJsonTool(
    'synapse_file_changed',
    {
      title: 'File Changed',
      description: 'Report that a file was edited and receive proactive hints about high-importance memories linked to it. Memories with importance >= 70 that reference the file are flagged with suggest_update=true, indicating the memory may need updating to reflect the file change.',
      inputSchema: {
        path: z.string()
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ path: filePath }: Record<string, unknown>) => {
      if (!memory) {
        return McpResponseMapper.standardizeResponse({ file_path: filePath, hints: [] });
      }
      try {
        const result = await memory.getFileMemoryHints(filePath as string, true);
        return McpResponseMapper.standardizeResponse(result);
      } catch (err) {
        // HOOK-09: Non-blocking -- return empty hints on failure
        return McpResponseMapper.standardizeResponse({
          file_path: filePath,
          hints: [],
          error: err instanceof Error ? err.message : 'hint lookup failed'
        });
      }
    }
  );

  registerJsonTool(
    'synapse_summarize_project',
    {
      title: 'Summarize Project',
      description: 'Return a high-level summary of a project directory.',
      inputSchema: {
        project_path: z.string(),
        max_files: z.number().int().min(100).max(20000).default(3000),
        item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ project_path, max_files, item_format }: Record<string, unknown>) => McpResponseMapper.standardizeResponse(
      normalizeProjectSummaryResult(
        workspace.summarizeProject(project_path as string, max_files as number),
        project_path as string
      ),
      { item_format: item_format as string }
    )
  );

}
