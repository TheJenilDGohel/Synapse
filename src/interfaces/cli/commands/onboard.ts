/**
 * Guided first-run onboarding wizard for Synapse.
 *
 * Wraps setup + skill install + hooks install + doctor into
 * one beautiful, step-by-step flow with box drawing and ANSI colors.
 *
 * Usage: synapse onboard
 *
 * @module src/cli/commands/onboard
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SERVER_VERSION } from '../../../core/runtime/version.js';
import { c, symbol, box } from '../ansi.js';
import { startSpinner } from '../spinner.js';
import { TOOL_COUNT } from '../tool-count.js';
import type { GlobalOptions } from '../options.js';

const __dirname: string = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT: string = path.resolve(__dirname, '..', '..', '..');

/* ------------------------------------------------------------------ */
/*  Output helpers                                                     */
/* ------------------------------------------------------------------ */

function write(line: string): void {
  process.stdout.write(line + '\n');
}

function writeLines(lines: string[]): void {
  process.stdout.write(lines.join('\n') + '\n');
}


/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */

function stepHeader(num: number, total: number, label: string): void {
  const progress = c.gray(`[${num}/${total}]`);
  write('');
  write(`  ${progress} ${c.bold(label)}`);
}

function resultLine(ok: boolean, label: string): void {
  const icon = ok ? c.green(c.B.check) : c.yellow(c.B.circle);
  write(`  ${icon} ${label}`);
}

/* ------------------------------------------------------------------ */
/*  Environment detection                                              */
/* ------------------------------------------------------------------ */

interface DetectedEnvironment {
  nodeVersion: string;
  nodeOk: boolean;
  rgVersion: string | null;
  rgOk: boolean;
  claudeCode: boolean;
  cursor: boolean;
  windsurf: boolean;
  codex: boolean;
  gemini: boolean;
  kiro: boolean;
  continueAi: boolean;
  clientCount: number;
  [key: string]: string | number | boolean | null;
}

function getCommandVersion(cmd: string, args: string[] = ['--version']): string | null {
  try {
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    if (result.status !== 0) return null;
    const match = (result.stdout || '').match(/(\d+\.\d+[\w.-]*)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function detectEnvironment(): DetectedEnvironment {
  const env: DetectedEnvironment = {
    nodeVersion: process.versions.node,
    nodeOk: true,
    rgVersion: null,
    rgOk: false,
    claudeCode: false,
    cursor: false,
    windsurf: false,
    codex: false,
    gemini: false,
    kiro: false,
    continueAi: false,
    clientCount: 0,
  };

  // ripgrep
  env.rgVersion = getCommandVersion('rg');
  env.rgOk = env.rgVersion !== null;

  // AI clients
  const homeDir = os.homedir();

  env.claudeCode = fs.existsSync(path.join(homeDir, '.claude'))
    || fs.existsSync(path.join(homeDir, '.claude.json'));

  env.cursor = fs.existsSync(path.join(homeDir, '.cursor'));

  env.windsurf = fs.existsSync(path.join(homeDir, '.windsurf'))
    || fs.existsSync(path.join(homeDir, '.codeium', 'windsurf'));

  env.codex = fs.existsSync(path.join(homeDir, '.codex'));

  env.gemini = fs.existsSync(path.join(homeDir, '.gemini'));

  env.kiro = fs.existsSync(path.join(homeDir, '.kiro'));

  env.continueAi = fs.existsSync(path.join(homeDir, '.continue'));

  // Count detected clients
  env.clientCount = [
    env.claudeCode, env.cursor, env.windsurf,
    env.codex, env.gemini, env.kiro, env.continueAi,
  ].filter(Boolean).length;

  return env;
}

/* ------------------------------------------------------------------ */
/*  Step runners                                                       */
/* ------------------------------------------------------------------ */

function runSetup(quiet: boolean): boolean {
  const setupScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'setup-synapse.mjs');
  const args: string[] = ['--yes'];
  if (quiet) args.push('--quiet');

  const result = spawnSync(process.execPath, [setupScript, ...args], {
    stdio: quiet ? 'ignore' : 'inherit',
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, DART_SUPPRESS_ANALYTICS: 'true' },
  });

  return result.status === 0;
}

function runSkillInstall(): boolean {
  const skillScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'install-synapse-skill.mjs');
  const result = spawnSync(process.execPath, [skillScript, '--force', '--quiet'], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 30000,
  });

  return result.status === 0;
}

function runHooksInstall(): boolean {
  const hooksScript = path.join(PROJECT_ROOT, 'scripts', 'hooks', 'install-hooks.cjs');
  const result = spawnSync(process.execPath, [hooksScript], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 15000,
  });

  return result.status === 0;
}

function runDoctor(): boolean {
  const doctorScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'doctor-synapse.mjs');
  const result = spawnSync(process.execPath, [doctorScript, '--quiet'], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 30000,
  });

  return result.status === 0;
}

/* ------------------------------------------------------------------ */
/*  Main wizard flow                                                   */
/* ------------------------------------------------------------------ */

async function runOnboard(): Promise<void> {
  const totalSteps = 5;

  // Welcome
  writeLines(box([
    `${c.bold('Welcome to Synapse')}  ${c.gray(`v${SERVER_VERSION}`)}`,
    c.italic(c.gray('Local-first AI memory & code retrieval')),
    '',
    `Let's get you set up in under a minute.`,
  ], { padding: 1 }));

  // Step 1: Detect environment
  stepHeader(1, totalSteps, 'Detecting environment...');
  const envSpinner = startSpinner('Scanning for runtimes and AI clients...');
  const env = detectEnvironment();
  envSpinner.succeed('Environment detected');
  write('');

  resultLine(env.nodeOk,
    `Node.js ${c.cyan(env.nodeVersion)} ${c.dim('(memory support available)')}`);

  resultLine(env.rgOk,
    env.rgOk
      ? `ripgrep ${c.cyan(env.rgVersion!)} ${c.dim('(fast search enabled)')}`
      : `ripgrep ${c.dim('not found — install for faster search')}`);

  // AI clients
  const clients: Array<{ key: string; label: string }> = [
    { key: 'claudeCode', label: 'Claude Code' },
    { key: 'cursor',     label: 'Cursor' },
    { key: 'windsurf',   label: 'Windsurf' },
    { key: 'codex',      label: 'Codex' },
    { key: 'gemini',     label: 'Gemini CLI' },
    { key: 'kiro',       label: 'Kiro' },
    { key: 'continueAi', label: 'Continue' },
  ];

  for (const cl of clients) {
    if (env[cl.key]) {
      resultLine(true, `${cl.label} ${c.dim('detected')}`);
    } else {
      resultLine(false, `${cl.label} ${c.dim('not found')}`);
    }
  }

  // Step 2: Run setup
  stepHeader(2, totalSteps, 'Running setup...');
  const setupSpinner = startSpinner('Initializing configuration and databases...');
  const setupOk = runSetup(true);
  if (setupOk) setupSpinner.succeed('Configuration and databases initialized');
  else setupSpinner.fail('Setup encountered issues');
  resultLine(setupOk, setupOk
    ? 'Configuration and databases initialized'
    : c.red('Setup encountered issues — run `synapse setup` manually'));

  // Step 3: Install skills
  stepHeader(3, totalSteps, 'Installing skills to AI clients...');
  const skillSpinner = startSpinner('Writing skill files to AI clients...');
  const skillsOk = runSkillInstall();
  if (skillsOk) skillSpinner.succeed('Skills installed');
  else skillSpinner.warn('Skill install had warnings');
  if (skillsOk) {
    resultLine(true, env.clientCount > 0
      ? `Skills installed to ${c.cyan(String(env.clientCount))} AI client(s)`
      : 'Skills bundled (no AI clients detected)');
  } else {
    resultLine(false, c.yellow('Skill install had warnings — run `synapse skill install` to retry'));
  }

  // Step 4: Install hooks
  stepHeader(4, totalSteps, 'Installing Claude Code hooks...');
  if (env.claudeCode) {
    const hookSpinner = startSpinner('Wiring memory hooks into Claude Code...');
    const hooksOk = runHooksInstall();
    if (hooksOk) hookSpinner.succeed('Memory hooks active');
    else hookSpinner.fail('Hook install had issues');
    resultLine(hooksOk, hooksOk
      ? 'Memory hooks active in Claude Code'
      : c.yellow('Hook install had issues — run `synapse hooks install`'));
  } else {
    resultLine(false, c.dim('Claude Code not detected — skipping hooks'));
  }

  // Step 5: Doctor
  stepHeader(5, totalSteps, 'Verifying installation...');
  const doctorSpinner = startSpinner('Running health checks...');
  const doctorOk = runDoctor();
  if (doctorOk) doctorSpinner.succeed('All health checks passed');
  else doctorSpinner.warn('Some checks need attention');
  resultLine(doctorOk, doctorOk
    ? 'All health checks passed'
    : c.yellow('Some checks failed — run `synapse doctor` for details'));

  // Completion summary
  const allOk = setupOk && doctorOk;

  writeLines(box([
    allOk
      ? `${c.green(c.B.check)} ${c.bold('Synapse is ready!')}`
      : `${c.yellow('!')} ${c.bold('Synapse is partially configured')}`,
    '',
    `${c.green(c.B.check)} ${c.dim(`${TOOL_COUNT} MCP tools available`)}`,
    env.clientCount > 0
      ? `${c.green(c.B.check)} ${c.dim(`Skills installed in ${env.clientCount} AI client(s)`)}`
      : `${c.yellow(c.B.circle)} ${c.dim('No AI clients detected for skill install')}`,
    env.claudeCode
      ? `${c.green(c.B.check)} ${c.dim('Memory hooks active in Claude Code')}`
      : `${c.yellow(c.B.circle)} ${c.dim('Claude Code hooks skipped')}`,
    '',
    c.bold('Try these commands:'),
    `  ${c.cyan('/synapse:recall')}    ${c.gray(c.B.arrow)} ${c.dim('recall memories for a task')}`,
    `  ${c.cyan('/synapse:remember')}  ${c.gray(c.B.arrow)} ${c.dim('save something to memory')}`,
    `  ${c.cyan('/synapse:fact')}      ${c.gray(c.B.arrow)} ${c.dim('add a knowledge graph fact')}`,
  ], { padding: 1 }));

  process.exitCode = allOk ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function run(_args: string[], _opts: GlobalOptions): Promise<void> {
  await runOnboard();
}
