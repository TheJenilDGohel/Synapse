import { parseFlags } from '../parse-flags.js';
import type { FlagSchema } from '../parse-flags.js';
/**
 * Ingest CLI subcommand.
 *
 *   loci ingest <file> [--format markdown|json] [--nest <n>] [--branch <b>] [--agent-id <id>]
 *
 * Ingests a conversation file into Loci memory with auto-format detection.
 *
 * @module src/cli/commands/ingest
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeError as sharedWriteError } from '../output.js';
import { buildRuntimeConfig } from '../../../core/runtime/config.js';
import { EmbeddingService, MemoryService } from '../../../core/engine/index.js';
import type { GlobalOptions } from '../options.js';

/* ------------------------------------------------------------------ */
/*  Arg parsing                                                        */
/* ------------------------------------------------------------------ */

const FLAG_SCHEMA: Record<string, FlagSchema> = {
  format: { alias: 'f', type: 'string' },
  nest: { alias: 'n', type: 'string' },
  branch: { alias: 'b', type: 'string' },
  'agent-id': { alias: 'a', type: 'string' },
};

/* ------------------------------------------------------------------ */
/*  Service bootstrap                                                  */
/* ------------------------------------------------------------------ */

function createMemoryService(): MemoryService {
  const runtime = buildRuntimeConfig();
  const embeddingService = new EmbeddingService({
    provider: runtime.embeddingProvider,
    model: runtime.embeddingModel,
    cacheDir: runtime.embeddingCacheDir,
  });
  return new MemoryService({
    lociHome: runtime.lociHome,
    enabled: runtime.memoryEnabled,
    backend: runtime.memoryBackend,
    dbPath: runtime.memoryDbPath,
    autoCapture: runtime.memoryAutoCapture,
    consentDone: runtime.memoryConsentDone,
    embeddingService: embeddingService as any,
  });
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
/*  Format detection                                                   */
/* ------------------------------------------------------------------ */

const MARKDOWN_EXTS: Set<string> = new Set(['.md', '.markdown', '.mdown', '.mkd']);
const JSON_EXTS: Set<string> = new Set(['.json']);

/**
 * Detect conversation format from file extension.
 */
function detectFormat(filePath: string): 'markdown' | 'json' | null {
  const ext = path.extname(filePath).toLowerCase();
  if (MARKDOWN_EXTS.has(ext)) return 'markdown';
  if (JSON_EXTS.has(ext)) return 'json';
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, FLAG_SCHEMA);
  const target = positionals[0] || '';

  if (!target || target === 'help' || target === '--help' || target === '-h') {
    const lines = [
      '',
      '  loci ingest <file> [options]',
      '',
      '  Ingest a conversation file into memory with auto-format detection.',
      '',
      '  Options:',
      '    --format, -f markdown|json   Override format auto-detection',
      '    --nest, -n <name>            Assign nest taxonomy',
      '    --branch, -b <name>          Assign branch taxonomy',
      '    --agent-id, -a <id>          Assign agent ID scope',
      '',
      '  Supported formats:',
      '    .md, .markdown               Markdown conversations (## Role / **Role:** / Role:)',
      '    .json                        JSON array of {role, content} objects',
      '',
    ];
    process.stdout.write(lines.join('\n') + '\n');
    return;
  }

  // Resolve file path
  const filePath = path.resolve(target);

  // Validate file exists and is readable
  if (!fs.existsSync(filePath)) {
    writeError(`File not found: ${target}`, opts.json);
    return;
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    writeError(`File not readable: ${target}`, opts.json);
    return;
  }

  // Determine format
  let format: string | null = (flags.format as string) || null;
  if (format) {
    format = format.toLowerCase();
    if (format !== 'markdown' && format !== 'json') {
      writeError(`Invalid format "${format}". Must be "markdown" or "json".`, opts.json);
      return;
    }
  } else {
    format = detectFormat(filePath);
    if (!format) {
      writeError(
        `Cannot detect format for "${path.basename(target)}". Use --format markdown|json to specify.`,
        opts.json
      );
      return;
    }
  }

  // Bootstrap memory service
  const svc = createMemoryService();

  const ingestOpts = {
    filePath,
    nest: (flags.nest as string) || '',
    branch: (flags.branch as string) || '',
    agentId: (flags['agent-id'] as string) || '',
  };

  try {
    const result: Record<string, unknown> = format === 'markdown'
      ? await (svc as any).ingestMarkdown(ingestOpts)
      : await (svc as any).ingestJson(ingestOpts);

    if (opts.json) {
      writeJson(result);
      return;
    }

    // Handle skipped (already ingested or no turns)
    if (result.skipped) {
      if (result.reason === 'already_ingested') {
        process.stdout.write(`Already ingested: ${path.basename(filePath)}\n`);
        process.stdout.write(`  Source ID: ${result.source_id}\n`);
        process.stdout.write(`  Ingested at: ${result.ingested_at}\n`);
        process.stdout.write(`  Turns: ${result.turn_count}\n`);
      } else if (result.reason === 'no_turns_found') {
        process.stdout.write(`No conversation turns found in ${path.basename(filePath)}\n`);
        process.stdout.write('  Check that the file contains role markers (## User, **Assistant:**, etc.)\n');
      }
      return;
    }

    // Success output
    process.stdout.write(`Ingested: ${path.basename(filePath)} (${format})\n`);
    process.stdout.write(`  Turns parsed:       ${result.turn_count}\n`);
    process.stdout.write(`  Entries created:    ${result.stored_count}\n`);
    process.stdout.write(`  Duplicates skipped: ${result.dedup_skipped}\n`);
    process.stdout.write(`  Entities extracted: ${result.entities_extracted}\n`);
    process.stdout.write(`  Triples created:    ${result.triples_created}\n`);

    if (ingestOpts.nest) process.stdout.write(`  Nest:               ${ingestOpts.nest}\n`);
    if (ingestOpts.branch) process.stdout.write(`  Branch:             ${ingestOpts.branch}\n`);
    if (ingestOpts.agentId) process.stdout.write(`  Agent ID:           ${ingestOpts.agentId}\n`);
    if (result.source_id) process.stdout.write(`  Source ID:          ${result.source_id}\n`);

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      process.stdout.write(`  Errors:             ${result.errors.length}\n`);
      for (const e of result.errors.slice(0, 5)) {
        process.stdout.write(`    Turn ${(e as any).turn_index}: ${(e as any).error}\n`);
      }
    }
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  }
}
