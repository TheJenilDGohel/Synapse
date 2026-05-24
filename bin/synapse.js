#!/usr/bin/env -S node --import tsx/esm

/**
 * Synapse unified CLI entry point.
 *
 * Supports noun-verb subcommands (synapse memory add, synapse kg query, ...)
 * and legacy flat commands (synapse setup, synapse doctor, ...).
 *
 * Global flags: --json, --verbose, --quiet, --config <path>
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildForwardArgv, hasVersionFlag, importRelative, relaunchWithTsx } from './_shared.js';

const rawArgs = process.argv.slice(2);
const isJson = rawArgs.includes('--json');

// 1. Absolute top-level check for version/help to ensure they work even if dependencies are missing
if (hasVersionFlag(rawArgs) || rawArgs[0] === 'version') {
  try {
    const req = createRequire(import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(req.resolve('../package.json'), 'utf8'));
    const version = pkg.version || 'unknown';
    if (isJson) {
      process.stdout.write(JSON.stringify({ version }) + '\n');
    } else {
      process.stdout.write(`${version}\n`);
    }
  } catch {
    process.stdout.write('unknown\n');
  }
  process.exit(0);
}

// 2. Try to relaunch with tsx for any other command
const isRelaunched = process.env.__SYNAPSE_TSX_RELAUNCHED === '1';
const tsxFound = relaunchWithTsx();

async function main() {
  // 3. If we reach here and tsx is NOT active, we cannot proceed with other commands
  if (!tsxFound && !isRelaunched) {
    process.stderr.write('[synapse] fatal: "tsx" loader not found. This usually means dependencies are not installed.\n');
    process.stderr.write('Run "npm install" in the project root to fix this.\n');
    process.exit(1);
  }

  // 0. Auto-start MCP server if spawned in stdio/sse mode by a client
  if (process.env.MCP_MODE === 'stdio' || process.env.MCP_MODE === 'sse') {
    const { startMcpServer } = await importRelative('../src/interfaces/app/index.js', import.meta.url);
    await startMcpServer();
    return;
  }

  // Load modules that need tsx resolution
  const { parseGlobalOptions } = await importRelative('../src/interfaces/cli/options.js', import.meta.url);
  const { printHelp } = await importRelative('../src/interfaces/cli/help.js', import.meta.url);
  const { routeCommand } = await importRelative('../src/interfaces/cli/router.js', import.meta.url);

  const globalOpts = parseGlobalOptions(rawArgs);
  const args = globalOpts.args;
  const command = args[0] || '';
  const rest = args.slice(1);

  // No command or explicit help
  if (command === '' || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  // `synapse start` / `synapse serve`
  if (command === 'start' || command === 'serve') {
    if (rest.includes('--help') || rest.includes('-h')) {
      process.stdout.write('Synapse MCP server\n\n');
      process.stdout.write('Usage:\n');
      process.stdout.write('  synapse start\n');
      process.stdout.write('  synapse serve\n');
      process.stdout.write('Options:\n');
      process.stdout.write('  --help,-h   show this help\n');
      return;
    }
    const { startMcpServer } = await importRelative('../src/interfaces/app/index.js', import.meta.url);
    await startMcpServer();
    return;
  }

  // `synapse install skills` (backward compat alias)
  if (command === 'install' && rest[0] === 'skills') {
    process.argv = buildForwardArgv(rest.slice(1), process.argv);
    const mod = await importRelative('../scripts/runtime/install-synapse-skill.mjs', import.meta.url);
    await mod.main();
    return;
  }

  // Route through noun-verb or legacy command router
  const routed = await routeCommand(command, rest, globalOpts, import.meta.url);
  if (routed) return;

  // Unknown command
  process.stderr.write(`Unknown command: ${command}\n\n`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`[synapse-cli] fatal: ${error?.message || error}\n`);
  process.exit(1);
});
