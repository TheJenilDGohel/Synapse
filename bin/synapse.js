#!/usr/bin/env -S node --import tsx/esm

/**
 * Synapse unified CLI entry point.
 *
 * Supports noun-verb subcommands (synapse memory add, synapse kg query, ...)
 * and legacy flat commands (synapse setup, synapse doctor, ...).
 *
 * Global flags: --json, --verbose, --quiet, --config <path>
 */

import { SERVER_VERSION } from '../src/runtime/version.js';
import { buildForwardArgv, hasVersionFlag, importRelative } from './_shared.js';
import { parseGlobalOptions } from '../src/cli/options.js';
import { printHelp } from '../src/cli/help.js';
import { routeCommand } from '../src/cli/router.js';

const rawArgs = process.argv.slice(2);
const globalOpts = parseGlobalOptions(rawArgs);
const args = globalOpts.args;
const command = args[0] || '';
const rest = args.slice(1);

async function main() {
  // --version / -v anywhere (even without a command)
  if (hasVersionFlag(rawArgs)) {
    if (globalOpts.json) {
      process.stdout.write(JSON.stringify({ version: SERVER_VERSION }) + '\n');
    } else {
      process.stdout.write(`${SERVER_VERSION}\n`);
    }
    process.exit(0);
  }

  // No command or explicit help
  if (command === '' || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  // `synapse version`
  if (command === 'version') {
    if (globalOpts.json) {
      process.stdout.write(JSON.stringify({ version: SERVER_VERSION }) + '\n');
    } else {
      process.stdout.write(`${SERVER_VERSION}\n`);
    }
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
    const { startMcpServer } = await importRelative('../src/app/index.js', import.meta.url);
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
