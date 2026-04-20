import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { IDEMPOTENT_WRITE_ANNOTATIONS, DESTRUCTIVE_ANNOTATIONS } from '../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../common/tool-utils.js';
import { ACK_RESULT_SCHEMA } from '../common/schemas.js';
import { backupDatabase, restoreDatabase } from '../../services/memory/backup.js';
import type { Adapter } from '../../services/memory/types.js';

export interface RegisterBackupToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  getMemoryAdapter: () => Adapter | null;
  memoryDbPath: string;
}

export function registerBackupTools({
  registerJsonTool,
  getMemoryAdapter,
  memoryDbPath,
}: RegisterBackupToolsOptions): void {
  registerJsonTool(
    ['synapse_backup'],
    {
      title: 'Backup Database',
      description:
        'Create a point-in-time backup of the Synapse memory database using SQLite VACUUM INTO. ' +
        'The backup is a clean, compacted SQLite file verified with PRAGMA integrity_check. ' +
        'If destination is omitted, the backup is written to {memoryDbDir}/backups/{timestamp}.db.',
      inputSchema: {
        destination: z.string().optional().describe('Absolute or relative path for the backup file. Defaults to {memoryDbDir}/backups/{timestamp}.db')
      },
      annotations: IDEMPOTENT_WRITE_ANNOTATIONS,
      outputSchema: ACK_RESULT_SCHEMA
    },
    async ({ destination }: Record<string, unknown>) => {
      const adapter = getMemoryAdapter();
      if (!adapter) {
        return { ok: false, message: 'Memory store not initialized. Call synapse_server_status to verify the store is running.' };
      }
      const resolvedDest = (destination as string | undefined)
        ? path.resolve(destination as string)
        : path.join(path.dirname(memoryDbPath), 'backups', new Date().toISOString().replace(/[:.]/g, '-') + '.db');
      try {
        const result = await backupDatabase(adapter, resolvedDest);
        return {
          ok: true,
          message: `Backup created at ${result.path}`,
          backup_path: result.path,
          size_bytes: result.size_bytes,
          created_at: result.created_at,
          integrity: result.integrity,
        };
      } catch (err: unknown) {
        return { ok: false, message: (err as Error).message || String(err) };
      }
    }
  );

  registerJsonTool(
    ['synapse_restore'],
    {
      title: 'Restore Database',
      description:
        'Restore the Synapse memory database from a backup file. ' +
        'Verifies backup integrity before replacing the live database. ' +
        'IMPORTANT: The MCP server must be restarted after restore for changes to take effect.',
      inputSchema: {
        source: z.string().describe('Path to the backup .db file to restore from')
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
      outputSchema: ACK_RESULT_SCHEMA
    },
    async ({ source }: Record<string, unknown>) => {
      const resolvedSrc = path.resolve(source as string);
      if (!fs.existsSync(resolvedSrc)) {
        return { ok: false, message: `Backup file not found: ${resolvedSrc}` };
      }
      try {
        const result = await restoreDatabase(resolvedSrc, memoryDbPath);
        return {
          ok: true,
          message: 'Backup restored. Restart the MCP server to apply changes.',
          restored_from: result.restored_from,
          db_path: result.db_path,
          restart_required: true,
          integrity: result.integrity,
        };
      } catch (err: unknown) {
        return { ok: false, message: (err as Error).message || String(err) };
      }
    }
  );
}
