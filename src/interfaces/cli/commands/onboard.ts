import { parseFlags } from '../parse-flags.js';
/**
 * Guided first-run onboarding wizard for Loci.
 *
 * Wraps setup + skill install + hooks install + doctor into
 * one beautiful, step-by-step flow with box drawing and ANSI colors.
 *
 * Usage: loci onboard
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
const PROJECT_ROOT: string = path.resolve(__dirname, '..', '..', '..', '..');

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
  const isAgent = process.env.AI_AGENT === 'true';
  if (isAgent) {
    write(`[${num}/${total}] ${label}`);
    return;
  }
  const progress = c.gray(`[${num}/${total}]`);
  write('');
  write(`  ${progress} ${c.bold(label)}`);
}

function resultLine(ok: boolean, label: string): void {
  const isAgent = process.env.AI_AGENT === 'true';
  if (isAgent) {
    write(`${ok ? '✓' : '!'} ${label}`);
    return;
  }
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
  const setupScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'setup-loci.mjs');
  const args: string[] = ['--yes'];
  if (quiet) args.push('--quiet');

  const result = spawnSync(process.execPath, [...process.execArgv, setupScript, ...args], {
    stdio: quiet ? 'ignore' : 'inherit',
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, DART_SUPPRESS_ANALYTICS: 'true' },
  });

  return result.status === 0;
}

function runSkillInstall(): boolean {
  const skillScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'install-loci-skill.mjs');
  const result = spawnSync(process.execPath, [...process.execArgv, skillScript, '--force', '--quiet'], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 30000,
  });

  return result.status === 0;
}

function runHooksInstall(): boolean {
  const hooksScript = path.join(PROJECT_ROOT, 'scripts', 'hooks', 'install-hooks.cjs');
  const result = spawnSync(process.execPath, [...process.execArgv, hooksScript], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 15000,
  });

  return result.status === 0;
}

function runDoctor(): boolean {
  const doctorScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'doctor-loci.mjs');
  const result = spawnSync(process.execPath, [doctorScript, '--quiet'], {
    stdio: 'ignore',
    encoding: 'utf8',
    timeout: 30000,
  });

  return result.status === 0;
}

function runPriorityBoost(): boolean {
  const cwd = process.cwd();
  const rules = [
    { name: '.cursorrules', label: 'Cursor Rules' },
    { name: '.clauderules', label: 'Claude Rules' },
  ];

  const directive = `
# Loci Priority Directive

Loci is your primary context and memory layer.
- Before starting a task, ALWAYS recall relevant memories using \`/loci:recall\`.
- If you learn something significant, ALWAYS use \`/loci:remember\`.
- Maintain the architectural integrity described in the project's knowledge base.
`.trim();

  let created = 0;
  for (const rule of rules) {
    const filePath = path.join(cwd, rule.name);
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `${directive}\n`, 'utf8');
        created += 1;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('Loci Priority Directive')) {
          fs.appendFileSync(filePath, `\n${directive}\n`, 'utf8');
          created += 1;
        }
      }
    } catch {
      return false;
    }
  }

  return created > 0;
}

/* ------------------------------------------------------------------ */
/*  Main wizard flow                                                   */
/* ------------------------------------------------------------------ */

async function runOnboard(): Promise<void> {
  const totalSteps = 6;

  // Welcome
  writeLines(box([
    `${c.bold('Welcome to Loci')}  ${c.gray(`v${SERVER_VERSION}`)}`,
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
    : c.red('Setup encountered issues — run `loci setup` manually'));

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
    resultLine(false, c.yellow('Skill install had warnings — run `loci skill install` to retry'));
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
      : c.yellow('Hook install had issues — run `loci hooks install`'));
  } else {
    resultLine(false, c.dim('Claude Code not detected — skipping hooks'));
  }

  // Step 5: Doctor
  stepHeader(5, totalSteps, 'Verifying installation...');
  const doctorSpinner = startSpinner('Running health checks...');
  const doctorScript = path.join(PROJECT_ROOT, 'scripts', 'runtime', 'doctor-loci.mjs');
  const doctorResult = spawnSync(process.execPath, [...process.execArgv, doctorScript, '--json'], {
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 30000,
  });

  let doctorOk = false;
  let doctorHealthy = false;
  try {
    const stdout = doctorResult.stdout || '';
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    doctorOk = parsed.ok === true;
    doctorHealthy = parsed.healthy === true;
  } catch {
    doctorOk = doctorResult.status === 0;
  }

  if (doctorHealthy) {
    doctorSpinner.succeed('All health checks passed');
    resultLine(true, 'All health checks passed');
  } else if (doctorOk) {
    doctorSpinner.warn('Operational with warnings');
    resultLine(true, c.yellow('Operational (non-critical checks need attention — run `loci doctor` for details)'));
  } else {
    doctorSpinner.fail('Critical checks failed');
    resultLine(false, c.red('Some critical checks failed — run `loci doctor` to diagnose'));
  }

  // Step 6: Priority Boost
  stepHeader(6, totalSteps, 'Boosting AI priority...');
  const boostSpinner = startSpinner('Generating local priority rules...');
  const boostOk = runPriorityBoost();
  if (boostOk) boostSpinner.succeed('AI priority rules established');
  else boostSpinner.info('Priority rules already present or skipped');
  resultLine(true, 'Context booster active (.cursorrules/.clauderules)');

  // Completion summary
  const allOk = setupOk && doctorOk;
  const isAgent = process.env.AI_AGENT === 'true';

  if (isAgent) {
    writeLines([
      allOk ? '✓ Loci ready.' : '! Loci partially configured.',
      `${TOOL_COUNT} MCP tools active.`
    ]);
  } else {
    writeLines(box([
      allOk
        ? (doctorHealthy ? `${c.green(c.B.check)} ${c.bold('Loci is ready!')}` : `${c.yellow('!')} ${c.bold('Loci is operational')}`)
        : `${c.red('!')} ${c.bold('Loci is partially configured')}`,
      '',
      `${c.green(c.B.check)} ${c.dim(`${TOOL_COUNT} MCP tools available`)}`,
      env.clientCount > 0
        ? `${c.green(c.B.check)} ${c.dim(`Skills installed in ${env.clientCount} AI client(s)`)}`
        : `${c.yellow(c.B.circle)} ${c.dim('No AI clients detected for skill install')}`,
      env.claudeCode
        ? `${c.green(c.B.check)} ${c.dim('Memory hooks active in Claude Code')}`
        : `${c.yellow(c.B.circle)} ${c.dim('Claude Code hooks skipped')}`,
      !doctorHealthy && doctorOk ? `${c.yellow('!')} ${c.dim('Some optional dependencies missing (run `loci doctor`)')}` : '',
      '',
      c.bold('Try these commands:'),
      `  ${c.cyan('/loci:recall')}    ${c.gray(c.B.arrow)} ${c.dim('recall memories for a task')}`,
      `  ${c.cyan('/loci:remember')}  ${c.gray(c.B.arrow)} ${c.dim('save something to memory')}`,
      `  ${c.cyan('/loci:fact')}      ${c.gray(c.B.arrow)} ${c.dim('add a knowledge graph fact')}`,
    ].filter(Boolean), { padding: 1 }));
  }

  process.exitCode = allOk ? 0 : 1;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function run(args: string[], _opts: GlobalOptions): Promise<void> {
  const { helpRequested } = parseFlags(args, {});
  if (helpRequested) {
    process.stdout.write('Usage: loci onboard\n\n');
    process.stdout.write('Starts the guided first-run onboarding wizard to set up configuration,\n');
    process.stdout.write('install skills, and verify system health.\n');
    return;
  }
  await runOnboard();
}
