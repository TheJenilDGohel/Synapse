/**
 * Subcommand router for Synapse CLI.
 *
 * Routes noun-verb pairs to handler modules and falls back to the
 * legacy flat-command map for backward compatibility.
 *
 * @module src/cli/router
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — bin/_shared.js is outside rootDir but required for CLI routing
import { buildForwardArgv, importRelative } from '../../bin/_shared.js';
import type { GlobalOptions } from './options.js';

/* ------------------------------------------------------------------ */
/*  Noun -> handler module map                                         */
/* ------------------------------------------------------------------ */

/** noun -> module path (relative to bin/) */
const NOUN_MODULES: Map<string, string> = new Map([
  ['memory', '../src/cli/commands/memory.js'],
  ['kg', '../src/cli/commands/kg.js'],
  ['skill', '../src/cli/commands/skill.js'],
  ['mcp', '../src/cli/commands/mcp.js'],
  ['ingest', '../src/cli/commands/ingest.js'],
  ['completion', '../src/cli/commands/completion.js'],
  ['hooks', '../src/cli/commands/hooks.js'],
  ['selftest', '../src/cli/commands/selftest.js'],
  ['onboard', '../src/cli/commands/onboard.js'],
  ['dashboard', '../src/cli/commands/dashboard.js'],
  ['backup', '../src/cli/commands/backup.js'],
]);

/** flat command -> script path (relative to bin/) */
const LEGACY_MODULES: Map<string, string> = new Map([
  ['setup', '../scripts/runtime/setup-synapse.mjs'],
  ['doctor', '../scripts/runtime/doctor-synapse.mjs'],
  ['upgrade', '../scripts/runtime/upgrade-synapse.mjs'],
  ['task-context', '../scripts/memory/task-context-synapse.mjs'],
  ['capture-outcome', '../scripts/memory/capture-outcome-synapse.mjs'],
]);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Route a command to the appropriate handler.
 */
export async function routeCommand(
  command: string,
  rest: string[],
  globalOpts: GlobalOptions,
  binMetaUrl: string,
): Promise<boolean> {
  // 1. Noun-verb subcommands
  const nounModule = NOUN_MODULES.get(command);
  if (nounModule) {
    const mod = await importRelative(nounModule, binMetaUrl) as { run: (args: string[], opts: GlobalOptions) => Promise<void> };
    await mod.run(rest, globalOpts);
    return true;
  }

  // 2. Legacy flat commands
  const legacyModule = LEGACY_MODULES.get(command);
  if (legacyModule) {
    process.argv = buildForwardArgv(rest, process.argv);
    await importRelative(legacyModule, binMetaUrl);
    return true;
  }

  return false;
}

/**
 * Check if a command name is a known noun (has subcommands).
 */
export function isNounCommand(name: string): boolean {
  return NOUN_MODULES.has(name);
}
