/**
 * Backup CLI subcommands.
 *
 *   loci backup create [dest]
 *   loci backup restore <src>
 *   loci backup list
 *
 * @module src/cli/commands/backup
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseFlags } from '../parse-flags.js';
import { printSubcommandHelp } from '../help.js';
import type { VerbDef } from '../help.js';
import { writeError as sharedWriteError } from '../output.js';
import { buildRuntimeConfig } from '../../../core/runtime/config.js';
import { MemoryStore } from '../../../core/engine/index.js';
import { backupDatabase, restoreDatabase } from '../../../core/engine/backup.js';
import type { GlobalOptions } from '../options.js';

const VERBS: VerbDef[] = [
  { name: 'create', desc: 'Create a point-in-time backup of the memory database' },
  { name: 'restore', desc: 'Restore memory database from a backup file (requires server restart)' },
  { name: 'list', desc: 'List available backups in the default backups directory' },
];

/* ------------------------------------------------------------------ */
/*  Store bootstrap                                                    */
/* ------------------------------------------------------------------ */

async function openStore(): Promise<MemoryStore> {
  const runtime = buildRuntimeConfig();
  const store = new MemoryStore({
    enabled: true,
    backend: runtime.memoryBackend,
    dbPath: runtime.memoryDbPath,
  });
  await store.init();
  return store;
}

/* ------------------------------------------------------------------ */
/*  Output helpers                                                     */
/* ------------------------------------------------------------------ */

function writeJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function writeError(msg: string, json: boolean): void {
  if (json) {
    writeJson({ error: msg });
  } else {
    sharedWriteError(msg);
  }
  process.exitCode = 1;
}

/* ------------------------------------------------------------------ */
/*  Subcommand: backup create                                          */
/* ------------------------------------------------------------------ */

async function handleCreate(args: string[], opts: GlobalOptions): Promise<void> {
  const { positionals } = parseFlags(args, {});

  const store = await openStore();
  if (!store.adapter) {
    writeError('Memory store not available — could not open database.', opts.json);
    return;
  }

  const dest = positionals[0]
    ? path.resolve(positionals[0])
    : path.join(path.dirname(store.dbPath), 'backups', new Date().toISOString().replace(/[:.]/g, '-') + '.db');

  const result = await backupDatabase(store.adapter, dest);

  if (opts.json) {
    writeJson(result);
  } else {
    process.stdout.write(`Backup created: ${result.path} (${result.size_bytes} bytes, integrity: ${result.integrity})\n`);
  }
}

/* ------------------------------------------------------------------ */
/*  Subcommand: backup restore                                         */
/* ------------------------------------------------------------------ */

async function handleRestore(args: string[], opts: GlobalOptions): Promise<void> {
  const { positionals } = parseFlags(args, {});

  if (!positionals[0]) {
    writeError('Usage: loci backup restore <source>', opts.json);
    return;
  }

  const resolvedSrc = path.resolve(positionals[0]);
  if (!fs.existsSync(resolvedSrc)) {
    writeError(`Backup file not found: ${resolvedSrc}`, opts.json);
    return;
  }

  const store = await openStore();
  const result = await restoreDatabase(resolvedSrc, store.dbPath);

  if (opts.json) {
    writeJson(result);
  } else {
    process.stdout.write(`Restored from ${result.restored_from}.\nRestart the MCP server to apply changes.\n`);
  }
}

/* ------------------------------------------------------------------ */
/*  Subcommand: backup list                                            */
/* ------------------------------------------------------------------ */

async function handleList(_args: string[], opts: GlobalOptions): Promise<void> {
  const store = await openStore();
  const backupsDir = path.join(path.dirname(store.dbPath), 'backups');

  if (!fs.existsSync(backupsDir)) {
    if (opts.json) {
      writeJson({ backups: [] });
    } else {
      process.stdout.write('No backups directory found.\n');
    }
    return;
  }

  const files = fs
    .readdirSync(backupsDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const full = path.join(backupsDir, f);
      const stat = fs.statSync(full);
      return { name: f, path: full, size_bytes: stat.size, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (opts.json) {
    writeJson({ backups: files.map(({ name, path: p, size_bytes }) => ({ name, path: p, size_bytes })) });
  } else if (files.length === 0) {
    process.stdout.write('No backups found.\n');
  } else {
    process.stdout.write(`Backups in ${backupsDir}:\n`);
    for (const f of files) {
      process.stdout.write(`  ${f.name}  (${f.size_bytes} bytes)\n`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

type Handler = (args: string[], opts: GlobalOptions) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  create: handleCreate,
  restore: handleRestore,
  list: handleList,
};

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const verb = args[0] || '';

  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') {
    printSubcommandHelp('backup', VERBS);
    return;
  }

  const handler = HANDLERS[verb];
  if (!handler) {
    sharedWriteError(`Unknown backup command: ${verb}`);
    printSubcommandHelp('backup', VERBS);
    process.exitCode = 1;
    return;
  }

  try {
    await handler(args.slice(1), opts);
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  }
}
