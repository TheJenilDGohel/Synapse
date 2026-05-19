import { parseFlags } from '../parse-flags.js';
/**
 * MCP lifecycle CLI subcommands.
 *
 *   synapse mcp start     -- Start MCP server (stdio mode)
 *   synapse mcp status    -- Show MCP server status and health
 *   synapse mcp config    -- Output ready-to-paste MCP client config JSON
 *
 * @module src/cli/commands/mcp
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { printSubcommandHelp } from '../help.js';
import type { VerbDef } from '../help.js';
import { writeError as sharedWriteError } from '../output.js';
import { buildRuntimeConfig } from '../../../core/runtime/config.js';
import {
  resolveSynapseHome,
  buildSynapsePaths
} from '../../../core/runtime/home-layout.js';
import { SERVER_NAME, SERVER_VERSION } from '../../../core/runtime/version.js';
import type { GlobalOptions } from '../options.js';

const VERBS: VerbDef[] = [
  { name: 'start', desc: 'Start MCP server (stdio)' },
  { name: 'status', desc: 'Show MCP server status' },
  { name: 'config', desc: 'Output MCP client config JSON' },
];

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
/*  Subcommand: mcp start                                              */
/* ------------------------------------------------------------------ */

async function handleStart(args: string[], opts: GlobalOptions): Promise<void> {
  parseFlags(args, {
    foreground: { alias: 'f', type: 'boolean' },
  });

  const thisFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(thisFile), '..', '..', '..', '..');
  const serverEntry = path.join(projectRoot, 'src', 'interfaces', 'app', 'mcp-server.js');

  if (!fs.existsSync(serverEntry)) {
    writeError(`MCP server entry not found: ${serverEntry}`, opts.json);
    return;
  }

  if (opts.json) {
    writeJson({
      action: 'start',
      mode: 'stdio',
      server: serverEntry,
      message: 'Starting MCP server in stdio mode...',
    });
  } else {
    process.stdout.write(`Starting ${SERVER_NAME} MCP server v${SERVER_VERSION} (stdio mode)...\n`);
  }

  // Import and call main() directly -- this hands stdio to the MCP transport.
  // The process stays alive as long as the MCP client is connected.
  const { main } = await import(pathToFileURL(serverEntry).href);
  await main();
}

/* ------------------------------------------------------------------ */
/*  Subcommand: mcp status                                             */
/* ------------------------------------------------------------------ */

async function handleStatus(_args: string[], opts: GlobalOptions): Promise<void> {
  let runtime: any;
  try {
    runtime = buildRuntimeConfig();
  } catch (err: unknown) {
    writeError(`Failed to build runtime config: ${(err as Error).message}`, opts.json);
    return;
  }

  const synapseHome: string = runtime.synapseHome;
  const paths = buildSynapsePaths(synapseHome);

  // Check if config file exists
  const configExists = fs.existsSync(paths.configPath);
  const configPath = configExists ? paths.configPath : null;

  // Check snippet file
  const snippetExists = fs.existsSync(paths.snippetPath);

  // Check database files
  const sqliteDbExists = fs.existsSync(runtime.sqliteDbPath);
  const memoryDbExists = fs.existsSync(runtime.memoryDbPath);

  // Memory backend health
  const memoryStatus = runtime.memoryEnabled ? 'enabled' : 'disabled';

  const status = {
    server: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      mode: runtime.mcpMode,
    },
    config: {
      path: configPath || paths.configPath,
      exists: configExists,
    },
    snippet: {
      path: paths.snippetPath,
      exists: snippetExists,
    },
    index: {
      backend: runtime.indexBackend,
      dbPath: runtime.sqliteDbPath,
      dbExists: sqliteDbExists,
      vectorIndexPath: runtime.vectorIndexPath,
    },
    memory: {
      enabled: runtime.memoryEnabled,
      backend: runtime.memoryBackend,
      dbPath: runtime.memoryDbPath,
      dbExists: memoryDbExists,
    },
    embedding: {
      provider: runtime.embeddingProvider,
      model: runtime.embeddingModel,
      cacheDir: runtime.embeddingCacheDir,
    },
    ripgrep: runtime.hasRipgrep,
    synapseHome,
  };

  if (opts.json) {
    writeJson(status);
    return;
  }

  process.stdout.write(`${SERVER_NAME} MCP Server Status\n`);
  process.stdout.write(`${'='.repeat(50)}\n\n`);

  process.stdout.write(`  Server:          ${SERVER_NAME} v${SERVER_VERSION}\n`);
  process.stdout.write(`  Mode:            ${runtime.mcpMode}\n`);
  process.stdout.write(`  Home:            ${synapseHome}\n`);
  process.stdout.write('\n');

  process.stdout.write('  Config\n');
  process.stdout.write(`    Path:          ${configPath || paths.configPath}\n`);
  process.stdout.write(`    Exists:        ${configExists ? 'yes' : 'no'}\n`);
  process.stdout.write(`    Snippet:       ${snippetExists ? paths.snippetPath : '(not generated)'}\n`);
  process.stdout.write('\n');

  process.stdout.write('  Index\n');
  process.stdout.write(`    Backend:       ${runtime.indexBackend}\n`);
  process.stdout.write(`    DB:            ${runtime.sqliteDbPath} ${sqliteDbExists ? '(exists)' : '(not created)'}\n`);
  process.stdout.write('\n');

  process.stdout.write('  Memory\n');
  process.stdout.write(`    Status:        ${memoryStatus}\n`);
  process.stdout.write(`    Backend:       ${runtime.memoryBackend}\n`);
  process.stdout.write(`    DB:            ${runtime.memoryDbPath} ${memoryDbExists ? '(exists)' : '(not created)'}\n`);
  process.stdout.write('\n');

  process.stdout.write('  Embedding\n');
  process.stdout.write(`    Provider:      ${runtime.embeddingProvider}\n`);
  process.stdout.write(`    Model:         ${runtime.embeddingModel}\n`);
  process.stdout.write(`    Cache:         ${runtime.embeddingCacheDir}\n`);
  process.stdout.write('\n');

  process.stdout.write(`  Ripgrep:         ${runtime.hasRipgrep ? 'available' : 'not found (search will use JS fallback)'}\n`);
  process.stdout.write('\n');
}

/* ------------------------------------------------------------------ */
/*  Subcommand: mcp config                                             */
/* ------------------------------------------------------------------ */

async function handleConfig(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags } = parseFlags(args, {
    client: { alias: 'c', type: 'string' },
    raw: { alias: 'r', type: 'boolean' },
  });

  const synapseHome = resolveSynapseHome();
  const paths = buildSynapsePaths(synapseHome);

  // If a snippet file already exists on disk, read and output it
  if (fs.existsSync(paths.snippetPath) && !flags.raw) {
    let snippetData: unknown = null;
    try {
      snippetData = JSON.parse(fs.readFileSync(paths.snippetPath, 'utf8'));
    } catch {
      // Fall through to generated config
      snippetData = null;
    }
    if (snippetData) {
      if (opts.json) {
        writeJson(snippetData);
      } else {
        process.stdout.write('MCP client config (from saved snippet):\n\n');
        process.stdout.write(JSON.stringify(snippetData, null, 2) + '\n');
        process.stdout.write(`\nSource: ${paths.snippetPath}\n`);
        process.stdout.write('Paste this into your AI client\'s MCP server configuration.\n');
      }
      return;
    }
  }

  // Generate the config -- same shape as client-installer.js uses
  const serverConfig = {
    command: 'npx',
    args: ['-y', 'synapse@latest'],
    startup_timeout_sec: 30,
    env: {},
  };

  const client = ((flags.client as string) || '').toLowerCase();

  if (client === 'claude') {
    // Claude Code uses `claude mcp add` -- show the command
    if (opts.json) {
      writeJson({
        method: 'cli',
        command: 'claude mcp add synapse -- npx -y synapse@latest',
        note: 'Run this command in your terminal to add Synapse to Claude Code.',
      });
    } else {
      process.stdout.write('Claude Code uses the `claude mcp add` command:\n\n');
      process.stdout.write('  claude mcp add synapse -- npx -y synapse@latest\n\n');
      process.stdout.write('Run this in your terminal. No JSON config needed.\n');
    }
    return;
  }

  // Default: generic mcpServers JSON block
  const output = {
    mcpServers: {
      synapse: serverConfig,
    },
  };

  if (opts.json) {
    writeJson(output);
  } else {
    process.stdout.write('MCP client config (ready to paste):\n\n');
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    process.stdout.write('\nPaste this into your AI client\'s MCP server configuration.\n');
    process.stdout.write('Supported clients: Cursor, Windsurf, Gemini CLI, Kiro, and others.\n');
    process.stdout.write('\nFor Claude Code, use: synapse mcp config --client claude\n');
  }
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

type Handler = (args: string[], opts: GlobalOptions) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  start: handleStart,
  status: handleStatus,
  config: handleConfig,
};

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const verb = args[0] || '';

  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') {
    printSubcommandHelp('mcp', VERBS);
    return;
  }

  const handler = HANDLERS[verb];
  if (!handler) {
    sharedWriteError(`Unknown mcp command: ${verb}`);
    printSubcommandHelp('mcp', VERBS);
    process.exitCode = 1;
    return;
  }

  try {
    await handler(args.slice(1), opts);
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  }
}
