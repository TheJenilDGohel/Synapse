import { z } from 'zod';
import {
  normalizeUpdateSelfResult,
  normalizeUpdateStatus
} from '../common/response-normalizers.js';
import { READ_ONLY_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import type { ServerStatus } from '../common/status.js';
import { buildHelpGuide } from '../common/status.js';
import {
  STATUS_RESULT_SCHEMA,
  FREEFORM_RESULT_SCHEMA,
  ACK_RESULT_SCHEMA
} from '../common/schemas.js';

import { IUpdateService } from '../../../core/interfaces/services.js';

interface HealthReport {
  checked_at: string;
  issues: string[];
  warnings: string[];
  actions: string[];
  ok: boolean;
}

export interface RegisterCoreToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  buildServerStatus: () => Promise<ServerStatus>;
  buildUsageGuide: () => unknown;
  updates: IUpdateService;
  getLastHealthReport: (() => HealthReport | null) | null;
}

export function registerCoreTools({
  registerJsonTool,
  buildServerStatus,
  buildUsageGuide,
  updates,
  getLastHealthReport
}: RegisterCoreToolsOptions): void {
  registerJsonTool(
    'synapse_server_status',
    {
      title: 'Server Status',
      description: 'Return runtime status and active configuration summary for this MCP server.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA
    },
    async () => buildServerStatus()
  );

  registerJsonTool(
    'synapse_health',
    {
      title: 'Health',
      description: 'Return a compact runtime health summary for fast smoke checks.',
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: STATUS_RESULT_SCHEMA
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
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA
    },
    async () => buildUsageGuide()
  );

  registerJsonTool(
    'synapse_help',
    {
      title: 'Help',
      description: 'Get task-scoped tool guidance. Describe what you want to do and receive a tailored list of tools, workflow steps, and tips.',
      inputSchema: {
        task: z.string().max(500).default('')
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: FREEFORM_RESULT_SCHEMA
    },
    async ({ task }: Record<string, unknown>) => buildHelpGuide(task as string)
  );

  registerJsonTool(
    ['synapse_update_status'],
    {
      title: 'Update Status',
      description: 'Check npm for the latest synapse version on the selected channel (cached, default every 120 minutes).',
      inputSchema: {
        force_check: z.boolean().default(false),
        channel: z.enum(['stable', 'beta']).default('stable')
      },
      // EXCEPTION: update_status queries the npm registry (openWorldHint: true).
      // READ_ONLY_ANNOTATIONS sets openWorldHint: false, so this tool keeps an
      // inline block. It is a read-only exception alongside update_self.
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      outputSchema: STATUS_RESULT_SCHEMA
    },
    async ({ force_check, channel }: Record<string, unknown>) => normalizeUpdateStatus(
      await updates.getStatus({ force: force_check as boolean, channel: channel as string })
    )
  );

  registerJsonTool(
    ['synapse_update_self'],
    {
      title: 'Update Self',
      description: 'Update synapse globally via npm and sync bundled skill. Supports stable, beta, or explicit version targets. Requires explicit user approval.',
      inputSchema: {
        approved_by_user: z.boolean().default(false),
        dry_run: z.boolean().default(false),
        version: z.string().default('latest'),
        reinstall_skill: z.boolean().default(true)
      },
      // EXCEPTION: update_self is destructive AND hits the npm registry
      // (openWorldHint: true). DESTRUCTIVE_ANNOTATIONS sets openWorldHint: false,
      // so this tool keeps an inline block. It is the only destructive exception
      // in phase 39 (update_status is the sibling read-only exception).
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      outputSchema: ACK_RESULT_SCHEMA
    },
    async ({ approved_by_user, dry_run, version, reinstall_skill }: Record<string, unknown>) => normalizeUpdateSelfResult(
      await updates.selfUpdate({
        approvedByUser: approved_by_user as boolean,
        dryRun: dry_run as boolean,
        version: version as string,
        reinstallSkill: reinstall_skill as boolean
      })
    )
  );
}
