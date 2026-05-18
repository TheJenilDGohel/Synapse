import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import {
  normalizeUpdateSelfResult,
  normalizeUpdateStatus,
  normalizeEmbedStatus,
  normalizeIndexStatus,
  normalizeIndexProjectResult
} from '../common/response-normalizers.js';
import { 
  READ_ONLY_ANNOTATIONS, 
  WRITE_ANNOTATIONS,
  IDEMPOTENT_WRITE_ANNOTATIONS,
  DESTRUCTIVE_ANNOTATIONS,
  ToolLevel, 
  toolRegistry, 
  type ToolRegistryEntry 
} from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import type { ServerStatus } from '../common/status.js';
import { buildHelpGuide } from '../common/status.js';
import {
  STATUS_RESULT_SCHEMA,
  FREEFORM_RESULT_SCHEMA,
  ACK_RESULT_SCHEMA,
  BUNDLE_RESULT_SCHEMA
} from '../common/schemas.js';

import { IUpdateService, IMemoryService, IVectorIndexService } from '../../../core/interfaces/services.js';
import { backupDatabase, restoreDatabase, type Adapter } from '../../../core/engine/index.js';

interface HealthReport {
  checked_at: string;
  issues: string[];
  warnings: string[];
  actions: string[];
  ok: boolean;
}

interface McpExtra {
  _meta?: { progressToken?: unknown };
  sendNotification?(notification: { method: string; params: Record<string, unknown> }): Promise<void>;
}

export interface RegisterCoreToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  buildServerStatus: () => Promise<ServerStatus>;
  buildUsageGuide: () => unknown;
  updates: IUpdateService;
  getLastHealthReport: (() => HealthReport | null) | null;
  memory: IMemoryService;
  vectorIndex: IVectorIndexService;
  getMemoryAdapter: () => Adapter | null;
  memoryDbPath: string;
}

export function registerCoreTools({
  registerJsonTool,
  buildServerStatus,
  buildUsageGuide,
  updates,
  getLastHealthReport,
  memory,
  vectorIndex,
  getMemoryAdapter,
  memoryDbPath
}: RegisterCoreToolsOptions): void {
  registerJsonTool(
    'synapse_server_status',
    {
      title: 'Server Status',
      description: 'Return runtime status and active configuration summary for this MCP server.',
      inputSchema: z.object({}), // Explicit object for Gemini
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Core'
    },
    async () => buildServerStatus()
  );

  registerJsonTool(
    'synapse_health',
    {
      title: 'Health',
      description: 'Return a compact runtime health summary for fast smoke checks.',
      inputSchema: z.object({}), // Explicit object for Gemini
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Core'
    },
    async () => {
      const status = await buildServerStatus();
      return {
        name: status.name,
        version: status.version,
        mode: status.mode,
        health: status.health,
        roots_count: Array.isArray(status.roots) ? status.roots.length : 0,
        update_recommendation: (status.updates as Record<string, unknown>)?.recommendation || 'up_to_date',
        background_health: getLastHealthReport?.() ?? null
      };
    }
  );

  registerJsonTool(
    'synapse_usage_guide',
    {
      title: 'Usage Guide',
      description: 'Return concise best-practice guidance for users and AI agents using this MCP.',
      inputSchema: z.object({}), // Explicit object for Gemini
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Core'
    },
    async () => buildUsageGuide()
  );

  registerJsonTool(
    'synapse_help',
    {
      title: 'Help',
      description: 'Get task-scoped tool guidance. Describe what you want to do and receive a tailored list of tools, workflow steps, and tips.',
      inputSchema: z.object({
        task: z.string().max(500).default('').describe('The task or problem you need help with')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Core'
    },
    async ({ task }: Record<string, unknown>) => buildHelpGuide(task as string)
  );

  registerJsonTool(
    'synapse_discovery',
    {
      title: 'Discovery',
      description: 'Discover and activate specialized Loci tools. Use this when the core toolset is insufficient for your task.',
      inputSchema: z.object({
        activate_category: z.string().optional().describe('Activate all tools in a category (e.g., "Memory Management")'),
        activate_tool: z.string().optional().describe('Activate a specific tool by name')
      }),
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA,
      level: ToolLevel.CORE,
      category: 'Core'
    },
    async ({ activate_category, activate_tool }: Record<string, unknown>) => {
      const activate = (registerJsonTool as any).activate;
      const results: string[] = [];

      if (activate_tool) {
        const entry = toolRegistry.getEntry(activate_tool as string);
        if (entry) {
          activate(entry.name);
          results.push(`Activated tool: ${entry.name}`);
        } else {
          results.push(`Tool not found: ${activate_tool}`);        
        }
      }

      if (activate_category) {
        const toActivate = toolRegistry.getAllEntries().filter((e: ToolRegistryEntry) => e.category === activate_category);
        for (const e of toActivate) {
          activate(e.name);
        }
        results.push(`Activated category "${activate_category}" (${toActivate.length} tools)`);
      }

      const all = toolRegistry.getAllEntries();
      const active = all.filter((e: ToolRegistryEntry) => toolRegistry.isActive(e.name));
      const inactive = all.filter((e: ToolRegistryEntry) => !toolRegistry.isActive(e.name));
      const categories = [...new Set(inactive.map((e: ToolRegistryEntry) => e.category))];

      return {
        message: results.join('\n') || 'Use this tool to activate specialized capabilities.',
        active_tools_count: active.length,
        available_categories: categories.map(cat => ({
          name: cat,
          tools: inactive.filter((e: ToolRegistryEntry) => e.category === cat).map((e: ToolRegistryEntry) => e.name)
        })),
        tip: 'Activating specialized tools increases token overhead. Only activate what you need for the current task.'
      };
    }
  );

  async function emitProgress(extra: unknown, progress: number, total: number, message: string): Promise<void> {
    const mcpExtra = extra as McpExtra | undefined;
    const token = mcpExtra?._meta?.progressToken;
    if (token === undefined || typeof mcpExtra?.sendNotification !== 'function') return;
    await mcpExtra.sendNotification({
      method: 'notifications/progress',
      params: { progressToken: token, progress, total, message }
    });
  }

  // --- System Management Controller (synapse_system_manage) ---
  // Refactored to flat z.object for Gemini compatibility
  registerJsonTool(
    ['synapse_system_manage'],
    {
      title: 'System Management',
      description: 'Unified controller for system lifecycle, index management, audits, and maintenance. Use "action" to select mode.',
      inputSchema: z.object({
        action: z.enum(['index_status', 'embed_status', 'index_project', 'audit', 'backup', 'restore', 'update_status', 'update_self']).describe('The system action to perform'),
        project_path: z.string().optional().describe('Project path for indexing'),
        all_roots: z.boolean().default(false).describe('Index all configured roots'),
        force: z.boolean().default(false).describe('Force re-indexing or re-checking'),
        force_check: z.boolean().default(false).describe('Alias for force (action: update_status)'),
        max_files: z.number().int().min(1).max(200000).optional().describe('Max files to index'),
        destination: z.string().optional().describe('Backup destination path'),
        source: z.string().optional().describe('Restore source path'),
        channel: z.enum(['stable', 'beta']).default('stable').describe('Update channel'),
        approved_by_user: z.boolean().default(false).describe('User approval for update (action: update_self)'),
        dry_run: z.boolean().default(false).describe('Dry run for update (action: update_self)'),
        version: z.string().default('latest').describe('Version to update to'),
        reinstall_skill: z.boolean().default(true).describe('Reinstall skill after update')
      }),
      annotations: WRITE_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA,
      category: 'System'
    },
    async (args: Record<string, unknown>, extra: unknown) => {
      const { action, ...params } = args;

      switch (action) {
        case 'index_status':
          return normalizeIndexStatus(vectorIndex.getStatus());
        case 'embed_status':
          return normalizeEmbedStatus(vectorIndex.getStatus());
        case 'index_project': {
          const maxFilesNum = (params.max_files ?? 20000) as number;
          await emitProgress(extra, 0, maxFilesNum, 'index_project started');
          const out = await vectorIndex.indexProject({
            projectPath: params.project_path as any, allRoots: params.all_roots as any, force: params.force as any, maxFiles: maxFilesNum,
            onProgress: async ({ scanned = 0, total = maxFilesNum, phase = 'indexing' }: { scanned?: number; total?: number; phase?: string }) => {
              await emitProgress(extra, scanned, total, phase);
            }
          }) as Record<string, unknown>;
          await emitProgress(extra, (out.scanned_files || out.total_files || maxFilesNum) as number, (out.scanned_files || out.total_files || maxFilesNum) as number, 'index_project completed');
          return normalizeIndexProjectResult(out, maxFilesNum);
        }
        case 'audit':
          return memory.audit();
        case 'backup': {
          const adapter = getMemoryAdapter();
          if (!adapter) throw new Error('Memory store not initialized.');
          const resolvedDest = (params.destination as string | undefined)
            ? path.resolve(params.destination as string)
            : path.join(path.dirname(memoryDbPath), 'backups', new Date().toISOString().replace(/[:.]/g, '-') + '.db');
          const result = await backupDatabase(adapter, resolvedDest);
          return { ok: true, message: `Backup created at ${result.path}`, backup_path: result.path, size_bytes: result.size_bytes, created_at: result.created_at, integrity: result.integrity };
        }
        case 'restore': {
          const resolvedSrc = path.resolve((params.source as string) || '');
          if (!fs.existsSync(resolvedSrc)) throw new Error(`Backup file not found: ${resolvedSrc}`);
          const result = await restoreDatabase(resolvedSrc, memoryDbPath);
          return { ok: true, message: 'Backup restored. Restart the MCP server to apply changes.', restored_from: result.restored_from, db_path: result.db_path, restart_required: true, integrity: result.integrity };
        }
        case 'update_status':
          return normalizeUpdateStatus(await updates.getStatus({ force: (params.force_check ?? params.force) as boolean, channel: (params.channel as string) || 'stable' }));
        case 'update_self':
          return normalizeUpdateSelfResult(await updates.selfUpdate({ approvedByUser: params.approved_by_user as boolean, dryRun: params.dry_run as boolean, version: params.version as string, reinstallSkill: params.reinstall_skill as boolean }));
        default:
          throw new Error(`unknown action: ${action}`);
      }
    }
  );
}
