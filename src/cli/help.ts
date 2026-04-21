/**
 * Premium CLI help renderer for Synapse.
 *
 * Uses raw ANSI escape codes — no chalk dependency.
 * Respects NO_COLOR and FORCE_COLOR environment variables.
 * Inspired by Vercel, Railway, and Supabase CLI aesthetics.
 *
 * @module src/cli/help
 */

import { SERVER_VERSION } from '../runtime/version.js';
import { c, B as BOX, boxTop, boxBottom, boxLine, separator } from './ansi.js';
import { TOOL_COUNT } from './tool-count.js';

/* ------------------------------------------------------------------ */
/*  Command definitions by category                                    */
/* ------------------------------------------------------------------ */

interface CommandDef {
  name: string;
  alias?: string;
  desc: string;
}

interface CategoryDef {
  name: string;
  icon: string;
  color: (s: string) => string;
  commands: CommandDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: 'Core',
    icon: BOX.dot,
    color: c.green,
    commands: [
      { name: 'start', alias: 'serve', desc: 'Start MCP server (stdio)' },
      { name: 'setup', desc: 'Run interactive setup wizard' },
      { name: 'onboard', desc: 'Guided first-run experience' },
      { name: 'upgrade', desc: 'Upgrade package and sync config' },
      { name: 'doctor', desc: 'Run health diagnostics' },
      { name: 'selftest', desc: 'End-to-end pipeline validation' },
      { name: 'dashboard', desc: 'Show memory & KG overview' },
      { name: 'version', desc: 'Print version' },
    ],
  },
  {
    name: 'Memory',
    icon: '◆',
    color: c.cyan,
    commands: [
      { name: 'memory add', desc: 'Store a memory entry' },
      { name: 'memory search', desc: 'Search memories by query' },
      { name: 'memory list', desc: 'List stored memories' },
      { name: 'memory show', desc: 'View one memory with revisions' },
      { name: 'memory delete', desc: 'Remove a memory entry' },
      { name: 'memory context', desc: 'Synthesize task-relevant context' },
      { name: 'memory outcome', desc: 'Capture task outcome' },
    ],
  },
  {
    name: 'Knowledge Graph',
    icon: '◇',
    color: c.magenta,
    commands: [
      { name: 'kg add', desc: 'Create a subject→predicate→object triple' },
      { name: 'kg query', desc: 'Query entity relationships' },
      { name: 'kg timeline', desc: 'Show fact evolution over time' },
      { name: 'kg stats', desc: 'Entity/triple/predicate breakdown' },
    ],
  },
  {
    name: 'Organization',
    icon: '▸',
    color: c.yellow,
    commands: [
      { name: 'skill install', alias: 'install skills', desc: 'Install skills to AI clients' },
      { name: 'skill list', desc: 'Show installed skills' },
      { name: 'skill remove', desc: 'Uninstall a skill' },
      { name: 'hooks install', desc: 'Wire memory hooks into Claude Code' },
      { name: 'hooks status', desc: 'Check installed hook status' },
    ],
  },
  {
    name: 'Tools',
    icon: '⚡',
    color: c.blue,
    commands: [
      { name: 'mcp start', desc: 'Start MCP server' },
      { name: 'mcp status', desc: 'Server health and config' },
      { name: 'mcp config', desc: 'Output MCP config JSON' },
      { name: 'ingest', desc: 'Import a conversation file' },
      { name: 'completion', desc: 'Generate shell completions' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Print the main help text with premium visual design.
 */
export function printHelp(): void {
  const W = 60;
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${c.bold('Synapse')} ${c.cyan(`v${SERVER_VERSION}`)} ${c.gray(BOX.h.repeat(2))} ${c.dim('local-first MCP memory server')}`);
  lines.push('');
  lines.push(boxTop(W));
  lines.push(boxLine(`${c.bold('Synapse')}  ${c.gray(`v${SERVER_VERSION}`)}  ${c.badge('MCP')}`, W));
  lines.push(boxLine(`${c.italic(c.gray('Local-first AI memory, code retrieval & knowledge graph'))}`, W));
  lines.push(boxLine('', W));
  lines.push(boxLine(`${c.green(BOX.check)} ${c.dim(`${TOOL_COUNT} MCP tools`)}  ${c.cyan(BOX.dot)} ${c.dim('Zero cloud deps')}  ${c.magenta('◇')} ${c.dim('Temporal KG')}`, W));
  lines.push(boxBottom(W));
  lines.push('');

  lines.push(`  ${c.bold('USAGE')}  ${c.gray('synapse <command> [options]')}`);
  lines.push('');

  for (const cat of CATEGORIES) {
    const header = `${cat.color(cat.icon)} ${c.bold(cat.color(cat.name))}`;
    lines.push(`  ${header}`);

    for (const cmd of cat.commands) {
      const cmdName = cat.color(cmd.name);
      const visible = cmd.name;
      const pad = Math.max(2, 26 - visible.length);
      const aliasStr = cmd.alias ? c.gray(` (${cmd.alias})`) : '';
      lines.push(`    ${cmdName}${' '.repeat(pad)}${c.dim(cmd.desc)}${aliasStr}`);
    }
    lines.push('');
  }

  lines.push(separator());
  lines.push('');
  lines.push(`  ${c.bold('FLAGS')}`);
  lines.push(`    ${c.green('--json')}                ${c.dim('Machine-readable JSON output')}`);
  lines.push(`    ${c.green('--verbose')}             ${c.dim('Increase output detail')}`);
  lines.push(`    ${c.green('--quiet')}               ${c.dim('Suppress non-essential output')}`);
  lines.push(`    ${c.green('--config')} ${c.gray('<path>')}       ${c.dim('Custom config file path')}`);
  lines.push(`    ${c.green('--version')}, ${c.green('-v')}        ${c.dim('Print version')}`);
  lines.push(`    ${c.green('--help')}, ${c.green('-h')}           ${c.dim('Show this help')}`);
  lines.push('');

  lines.push(separator());
  lines.push('');
  lines.push(`  ${c.bold('EXAMPLES')}`);
  lines.push(`    ${c.cyan('synapse memory add')} ${c.gray('--content "JWT with refresh tokens" --kind decision')}`);
  lines.push(`    ${c.cyan('synapse memory search')} ${c.gray('--query "authentication"')}`);
  lines.push(`    ${c.cyan('synapse kg add')} ${c.gray('--subject "AuthService" --predicate "uses" --object "JWT"')}`);
  lines.push(`    ${c.cyan('synapse selftest')} ${c.gray('--json')}`);
  lines.push(`    ${c.cyan('synapse dashboard')}`);
  lines.push('');

  lines.push(separator());
  lines.push('');
  lines.push(`  ${c.gray('Quick start:')}  ${c.cyan('synapse setup')} ${c.gray(BOX.arrow)} ${c.cyan('synapse doctor')} ${c.gray(BOX.arrow)} ${c.cyan('synapse hooks install')}`);
  lines.push(`  ${c.gray('Docs:')}         ${c.blue('https://wmt-mobile.github.io/synapse/')}`);
  lines.push('');

  process.stdout.write(lines.join('\n') + '\n');
}

export interface VerbDef {
  name: string;
  desc: string;
}

/**
 * Print help for a specific noun subcommand.
 */
export function printSubcommandHelp(noun: string, verbs: VerbDef[]): void {
  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${c.bold(c.cyan('synapse ' + noun))} ${c.gray('<command> [options]')}`);
  lines.push('');
  for (const v of verbs) {
    const nameStr = c.cyan(v.name);
    const visible = v.name;
    const pad = Math.max(2, 26 - visible.length);
    lines.push(`    ${nameStr}${' '.repeat(pad)}${c.dim(v.desc)}`);
  }
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}
