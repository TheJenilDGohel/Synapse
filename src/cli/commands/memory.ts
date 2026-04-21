import { parseFlags } from '../parse-flags.js';
/**
 * Memory CLI subcommands.
 *
 *   synapse memory add <content> [flags]
 *   synapse memory search <query> [flags]
 *   synapse memory list [flags]
 *   synapse memory show <id>
 *   synapse memory delete <id> [-f|--force]
 *
 * @module src/cli/commands/memory
 */

import { createInterface } from 'node:readline';
import { printSubcommandHelp } from '../help.js';
import type { VerbDef } from '../help.js';
import { writeError as sharedWriteError } from '../output.js';
import {
  MemoryService,
  MemoryWorkflowService
} from '../../engine/index.js';
import { c, B, symbol } from '../ansi.js';
import type { GlobalOptions } from '../options.js';

const VERBS: VerbDef[] = [
  { name: 'add', desc: 'Store a memory entry' },
  { name: 'search', desc: 'Search memories by query' },
  { name: 'list', desc: 'List stored memories' },
  { name: 'show', desc: 'Show a single memory by ID' },
  { name: 'delete', desc: 'Delete a memory by ID' },
  { name: 'prime', desc: 'Graph-aware context rehydration (Agent Prime)' },
  { name: 'context', desc: 'Synthesize task-relevant context for agents' },
  { name: 'outcome', desc: 'Capture task outcome as a persistent memory' },
];

/* ------------------------------------------------------------------ */
/*  Service bootstrap                                                  */
/* ------------------------------------------------------------------ */

async function createMemoryService(): Promise<MemoryService> {
  const { buildRuntimeConfig } = await import('../../runtime/config.js');
  const { EmbeddingService } = await import('../../engine/index.js');
  
  const runtime = buildRuntimeConfig();
  const embeddingService = new EmbeddingService({
    provider: runtime.embeddingProvider,
    model: runtime.embeddingModel,
    cacheDir: runtime.embeddingCacheDir,
  });
  return new MemoryService({
    synapseHome: runtime.synapseHome,
    enabled: runtime.memoryEnabled,
    backend: runtime.memoryBackend,
    dbPath: runtime.memoryDbPath,
    autoCapture: runtime.memoryAutoCapture,
    consentDone: runtime.memoryConsentDone,
    embeddingService: embeddingService as any,
  });
}

async function createWorkflowService(): Promise<MemoryWorkflowService> {
  const svc = await createMemoryService();
  return new MemoryWorkflowService({
    memory: svc,
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/* ------------------------------------------------------------------ */
/*  Interactive confirmation                                           */
/* ------------------------------------------------------------------ */

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Subcommand handlers                                                */
/* ------------------------------------------------------------------ */

async function handleAdd(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, {
    type: { alias: 't', type: 'string' },
    importance: { alias: 'i', type: 'number' },
    nest: { alias: 'n', type: 'string' },
    branch: { alias: 'b', type: 'string' },
    title: { type: 'string' },
  });

  const content = positionals.join(' ').trim();
  if (!content) {
    writeError('Content is required. Usage: synapse memory add "your content" [--type decision] [--importance 80]', opts.json);
    return;
  }

  const svc = await createMemoryService();
  const result: any = await svc.storeEntry({
    content,
    kind: (flags.type as string) || 'knowledge',
    importance: flags.importance !== undefined ? (flags.importance as number) : 50,
    nest: (flags.nest as string) || '',
    branch: (flags.branch as string) || '',
    title: (flags.title as string) || '',
  });

  if (opts.json) {
    writeJson(result);
    return;
  }

  if (result.duplicate) {
    process.stdout.write(`Duplicate detected. Existing memory: ${result.memory?.id || 'unknown'}\n`);
    return;
  }

  const mem = result.memory;
  process.stdout.write(`Created memory ${mem.id}\n`);
  process.stdout.write(`  Title: ${mem.title}\n`);
  process.stdout.write(`  Kind: ${mem.kind}\n`);
  process.stdout.write(`  Importance: ${mem.importance}\n`);
  if (mem.nest) process.stdout.write(`  Nest: ${mem.nest}\n`);
  if (mem.branch) process.stdout.write(`  Branch: ${mem.branch}\n`);
}

async function handleSearch(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, {
    limit: { alias: 'l', type: 'number' },
    nest: { alias: 'n', type: 'string' },
    branch: { alias: 'b', type: 'string' },
    kind: { alias: 'k', type: 'string' },
  });

  const query = positionals.join(' ').trim();
  if (!query) {
    writeError('Query is required. Usage: synapse memory search "your query" [--limit 10]', opts.json);
    return;
  }

  const svc = await createMemoryService();
  const result: any = await svc.recall({
    query,
    limit: (flags.limit as number) || 10,
    nest: (flags.nest as string) || undefined,
    branch: (flags.branch as string) || undefined,
    kind: (flags.kind as string) || undefined,
  });

  if (opts.json) {
    writeJson(result);
    return;
  }

  if (result.count === 0) {
    process.stdout.write(`No memories found for query: "${query}"\n`);
    return;
  }

  process.stdout.write(`Found ${result.count} result(s) for "${query}":\n\n`);
  for (const item of result.items) {
    const m = item.memory;
    process.stdout.write(`  ${m.id}  score=${item.score}  imp=${m.importance}\n`);
    process.stdout.write(`    ${truncate(m.title, 72)}\n`);
    if (m.summary) process.stdout.write(`    ${truncate(m.summary, 72)}\n`);
    process.stdout.write('\n');
  }
}

async function handleList(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags } = parseFlags(args, {
    limit: { alias: 'l', type: 'number' },
    kind: { alias: 'k', type: 'string' },
    status: { alias: 's', type: 'string' },
    json: { type: 'boolean' },
  });

  const useJson = opts.json || Boolean(flags.json);

  const svc = await createMemoryService();
  const result: any = await svc.listEntries({
    limit: (flags.limit as number) || 20,
    kind: (flags.kind as string) || undefined,
    status: (flags.status as string) || undefined,
  });

  if (useJson) {
    writeJson(result);
    return;
  }

  if (result.count === 0) {
    process.stdout.write('No memories stored yet.\n');
    return;
  }

  process.stdout.write(`Showing ${result.count} of ${result.total_count} memories:\n\n`);

  // Table header
  const idW = 12;
  const kindW = 14;
  const impW = 5;
  const titleW = 42;
  const dateW = 20;

  process.stdout.write(
    `  ${'ID'.padEnd(idW)}  ${'KIND'.padEnd(kindW)}  ${'IMP'.padStart(impW)}  ${'TITLE'.padEnd(titleW)}  ${'UPDATED'.padEnd(dateW)}\n`
  );
  process.stdout.write(`  ${'-'.repeat(idW)}  ${'-'.repeat(kindW)}  ${'-'.repeat(impW)}  ${'-'.repeat(titleW)}  ${'-'.repeat(dateW)}\n`);

  for (const m of result.items) {
    const id = truncate(m.id, idW).padEnd(idW);
    const kind = (m.kind || '').padEnd(kindW);
    const imp = String(m.importance ?? '').padStart(impW);
    const title = truncate(m.title || '', titleW).padEnd(titleW);
    const date = formatDate(m.updated_at).padEnd(dateW);
    process.stdout.write(`  ${id}  ${kind}  ${imp}  ${title}  ${date}\n`);
  }

  if (result.has_more) {
    process.stdout.write(`\n  ... ${result.total_count - result.count} more. Use --limit to see more.\n`);
  }
}

async function handleShow(args: string[], opts: GlobalOptions): Promise<void> {
  const { positionals } = parseFlags(args, {});

  const id = positionals[0];
  if (!id) {
    writeError('Memory ID is required. Usage: synapse memory show <id>', opts.json);
    return;
  }

  const svc = await createMemoryService();
  const entry: any = await svc.getEntry(id);

  if (!entry) {
    writeError(`Memory not found: ${id}`, opts.json);
    return;
  }

  if (opts.json) {
    writeJson(entry);
    return;
  }

  process.stdout.write(`\nMemory: ${entry.id}\n`);
  process.stdout.write(`${'='.repeat(60)}\n`);
  process.stdout.write(`  Title:      ${entry.title}\n`);
  process.stdout.write(`  Kind:       ${entry.kind}\n`);
  process.stdout.write(`  Status:     ${entry.status}\n`);
  process.stdout.write(`  Importance: ${entry.importance}\n`);
  process.stdout.write(`  Confidence: ${entry.confidence}\n`);
  if (entry.nest) process.stdout.write(`  Nest:       ${entry.nest}\n`);
  if (entry.branch) process.stdout.write(`  Branch:     ${entry.branch}\n`);
  if (entry.tags && entry.tags.length > 0) {
    process.stdout.write(`  Tags:       ${entry.tags.join(', ')}\n`);
  }
  process.stdout.write(`  Created:    ${formatDate(entry.created_at)}\n`);
  process.stdout.write(`  Updated:    ${formatDate(entry.updated_at)}\n`);
  if (entry.last_recalled_at) {
    process.stdout.write(`  Recalled:   ${formatDate(entry.last_recalled_at)} (${entry.recall_count}x)\n`);
  }
  process.stdout.write(`\n  Summary:\n    ${entry.summary || '(none)'}\n`);
  process.stdout.write(`\n  Content:\n    ${(entry.content || '').replace(/\n/g, '\n    ')}\n`);

  if (entry.revisions && entry.revisions.length > 0) {
    process.stdout.write(`\n  Revisions (${entry.revisions.length}):\n`);
    for (const rev of entry.revisions) {
      process.stdout.write(`    rev ${rev.revision}  ${formatDate(rev.created_at)}  ${rev.change_note || ''}\n`);
    }
  }

  process.stdout.write('\n');
}

async function handleDelete(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, {
    force: { alias: 'f', type: 'boolean' },
  });

  const id = positionals[0];
  if (!id) {
    writeError('Memory ID is required. Usage: synapse memory delete <id> [-f|--force]', opts.json);
    return;
  }

  const svc = await createMemoryService();
  const result: any = await svc.deleteEntry(id);

  if (opts.json) {
    writeJson(result);
    return;
  }

  if (result.deleted) {
    process.stdout.write(`Deleted memory ${id}\n`);
  } else {
    writeError(`Failed to delete memory ${id}`, opts.json);
  }
}

async function handlePrime(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, {
    task: { alias: 't', type: 'string' },
    project: { alias: 'p', type: 'string' },
  });

  const task = (flags.task as string) || positionals.join(' ').trim();
  if (!task) {
    writeError('Task is required. Usage: synapse memory prime "your task"', opts.json);
    return;
  }

  const workflow = await createWorkflowService();
  const result = await workflow.agentPrime({
    task,
    project_path: (flags.project as string) || process.cwd(),
  });

  if (opts.json) {
    writeJson(result);
  } else {
    process.stdout.write(`\n${c.bold('Synapse Agent Prime')}\n`);
    process.stdout.write(`${'='.repeat(60)}\n`);
    process.stdout.write(`Task: ${result.task}\n\n`);

    if (result.memories.length > 0) {
      process.stdout.write(`${c.bold('Relevant Memories:')}\n`);
      for (const m of result.memories) {
        process.stdout.write(`  - ${m.title} (${m.kind}, score: ${m.score.toFixed(3)})\n`);
        if (m.summary) process.stdout.write(`    ${c.dim(truncate(m.summary, 100))}\n`);
      }
      process.stdout.write('\n');
    }

    if (result.entities.length > 0) {
      process.stdout.write(`${c.bold('Graph Entities:')}\n`);
      for (const e of result.entities) {
        process.stdout.write(`  - ${e.name} (${e.type})\n`);
        if (e.predicates.length > 0) {
          process.stdout.write(`    Relations: ${e.predicates.join(', ')}\n`);
        }
      }
      process.stdout.write('\n');
    }

    if (result.suggested_actions.length > 0) {
      process.stdout.write(`${c.bold('Suggested Actions:')}\n`);
      for (const a of result.suggested_actions) {
        process.stdout.write(`  ${c.B.arrow} ${a}\n`);
      }
      process.stdout.write('\n');
    }
  }
}

async function handleContext(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags } = parseFlags(args, {
    task: { alias: 't', type: 'string' },
    query: { alias: 'q', type: 'string' },
    projectPath: { alias: 'p', type: 'string' },
    rootPath: { alias: 'r', type: 'string' },
    limit: { alias: 'l', type: 'number' },
    topic: { type: 'string' },
    feature: { type: 'string' },
    kind: { type: 'string' },
  });

  const workflow = await createWorkflowService();
  const result = await workflow.getTaskContext({
    task: (flags.task as string),
    query: (flags.query as string),
    project_path: (flags.projectPath as string),
    root_path: (flags.rootPath as string),
    limit: (flags.limit as number),
    topic: (flags.topic as string),
    feature: (flags.feature as string),
    kind: (flags.kind as string),
  });

  if (opts.json) {
    writeJson(result);
  } else {
    process.stdout.write(`Available context for: ${flags.task || flags.query || 'unspecified task'}\n`);
    process.stdout.write(`${'='.repeat(60)}\n`);
    process.stdout.write(result.context + '\n');
  }
}

async function handleOutcome(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags } = parseFlags(args, {
    task: { alias: 't', type: 'string' },
    summary: { alias: 's', type: 'string' },
    status: { type: 'string' },
    projectPath: { alias: 'p', type: 'string' },
  });

  if (!flags.task || !flags.summary) {
    writeError('Task and summary are required.', opts.json);
    return;
  }

  const workflow = await createWorkflowService();
  const result = await workflow.captureOutcome({
    task: (flags.task as string),
    summary: (flags.summary as string),
    status: (flags.status as string) || 'completed',
    project_path: (flags.projectPath as string) || process.cwd(),
  });

  if (opts.json) {
    writeJson(result);
  } else {
    const res = result as any;
    const id = res.result?.promoted_memory_id || res.result?.event_id || 'unknown';
    process.stdout.write(`${symbol.ok()} Outcome captured: ${id}\n`);
  }
}

type Handler = (args: string[], opts: GlobalOptions) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  add: handleAdd,
  search: handleSearch,
  list: handleList,
  show: handleShow,
  delete: handleDelete,
  prime: handlePrime,
  context: handleContext,
  outcome: handleOutcome,
};

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const verb = args[0] || '';

  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') {
    printSubcommandHelp('memory', VERBS);
    return;
  }

  const handler = HANDLERS[verb];
  if (!handler) {
    sharedWriteError(`Unknown memory command: ${verb}`);
    printSubcommandHelp('memory', VERBS);
    process.exitCode = 1;
    return;
  }

  try {
    await handler(args.slice(1), opts);
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  }
}
