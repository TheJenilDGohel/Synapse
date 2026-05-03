import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { c, symbol } from '../ansi.js';
import { writeError } from '../output.js';
import { startSpinner } from '../spinner.js';
import type { GlobalOptions } from '../options.js';

const __dirname: string = path.dirname(fileURLToPath(import.meta.url));
// CLI lives at <root>/src/interfaces/cli/commands/ — hooks at <root>/scripts/hooks/
const PKG_ROOT: string = path.resolve(__dirname, '..', '..', '..', '..');
const HOOKS_DIR: string = path.join(PKG_ROOT, 'scripts', 'hooks');

type Handler = (args: string[], opts: GlobalOptions) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  install: handleInstall,
  status: handleStatus,
};

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const sub = args[0] || '';
  const handler = HANDLERS[sub];
  if (!handler) {
    process.stdout.write([
      '',
      `  synapse hooks ${c.cyan('install')}    Install Claude Code hooks for auto memory retrieval/capture`,
      `  synapse hooks ${c.cyan('status')}     Show installed hook status`,
      '',
    ].join('\n'));
    return;
  }
  await handler(args.slice(1), opts);
}

async function handleInstall(): Promise<void> {
  const installerPath = path.join(HOOKS_DIR, 'install-hooks.cjs');
  if (!fs.existsSync(installerPath)) {
    writeError(`Hook installer not found at ${installerPath}`);
    writeError('Package may be corrupted. Reinstall with: npm install -g synapse');
    process.exitCode = 1;
    return;
  }
  const spinner = startSpinner('Installing Claude Code hooks...');
  const result = spawnSync(process.execPath, [installerPath], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status === 0) {
    spinner.succeed('Claude Code hooks installed');
  } else {
    spinner.fail('Hook installation failed');
    if (result.stderr) process.stderr.write(result.stderr);
  }
  process.exitCode = result.status || 0;
}

async function handleStatus(): Promise<void> {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    const settings: Record<string, unknown> = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const hooks = (settings.hooks || {}) as Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    const preHooks = (hooks.PreToolUse || []).filter(
      (e) => e.hooks?.some((h) => h.command?.includes('synapse'))
    );
    const postHooks = (hooks.PostToolUse || []).filter(
      (e) => e.hooks?.some((h) => h.command?.includes('synapse'))
    );

    const preInstalled = preHooks.length > 0;
    const postInstalled = postHooks.length > 0;

    process.stdout.write(`\n  ${c.bold('Synapse Claude Code Hooks')}\n\n`);
    process.stdout.write(`  Pre-tool (memory retrieval):  ${preInstalled ? c.green('INSTALLED') : c.red('NOT INSTALLED')}\n`);
    process.stdout.write(`  Post-tool (outcome capture):  ${postInstalled ? c.green('INSTALLED') : c.red('NOT INSTALLED')}\n`);
    process.stdout.write(`  Settings file: ${c.dim(settingsPath)}\n\n`);

    if (!preInstalled || !postInstalled) {
      process.stdout.write('  Run: synapse hooks install\n\n');
    }

    // Verify hook scripts exist at referenced paths
    for (const entry of [...preHooks, ...postHooks]) {
      for (const h of (entry.hooks || [])) {
        const cmdMatch = h.command?.match(/node\s+"?([^"]+)"?/);
        if (cmdMatch) {
          const scriptPath = cmdMatch[1];
          const exists = fs.existsSync(scriptPath);
          if (!exists) {
            process.stdout.write(`  ${symbol.warn()} ${c.yellow('WARNING')}: Hook script missing: ${scriptPath}\n`);
            process.stdout.write(`  Run: ${c.cyan('synapse hooks install')}\n\n`);
          }
        }
      }
    }
  } catch {
    process.stdout.write(`\n  No Claude Code settings found at ${settingsPath}\n`);
    process.stdout.write('  Run: synapse hooks install\n\n');
  }
}
