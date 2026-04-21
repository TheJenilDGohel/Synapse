#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import { migrateSynapseHomeLayout, resolveSynapseHome } from '../../src/runtime/index.ts';
import { SERVER_VERSION } from '../../src/runtime/version.ts';
import { normalizeInstallTarget, normalizeUpdateChannel } from '../../src/services/update/helpers.ts';
import {
  findMissingRequiredSetupFields,
  normalizeUpgradeConfig
} from '../../src/services/update/index.ts';
import ora from 'ora';
import { c, symbol, rule, box } from '../../src/cli/ansi.ts';
import { NPM_BIN, SYNAPSE_BIN, isWindows } from '../../src/runtime/platform.ts';

if (!process.env.DART_SUPPRESS_ANALYTICS) {
  process.env.DART_SUPPRESS_ANALYTICS = 'true';
}

const argv = process.argv.slice(2);
// Extract only HOME for path resolution — avoids CodeQL CWE-532 taint
const synapseHome = resolveSynapseHome({ HOME: process.env.HOME || '' });
const layout = migrateSynapseHomeLayout(synapseHome).paths;
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

function parseArg(name) {
  const key = `--${name}=`;
  const found = argv.find((item) => item.startsWith(key));
  if (!found) return null;
  return found.slice(key.length).trim();
}

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

function hasShortFlag(flag) {
  return argv.includes(`-${flag}`);
}

function getPositionalArgs() {
  return argv.filter((item) => !item.startsWith('-'));
}

function resolveTargetVersion() {
  const fromFlag = parseArg('version');
  if (fromFlag) return fromFlag;

  const positional = getPositionalArgs();
  if (positional.length === 0) return 'latest';

  if (positional[0] === 'install') {
    return positional[1] || 'latest';
  }

  return positional[0];
}

function parseBoolean(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const value = String(raw).trim().toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes' || value === 'y') return true;
  if (value === 'false' || value === '0' || value === 'no' || value === 'n') return false;
  return fallback;
}

function readExistingConfig() {
  try {
    if (!fs.existsSync(layout.configPath)) return {};
    const parsed = JSON.parse(fs.readFileSync(layout.configPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function runCommand(command, args, label) {
  const spinner = ora(`${label}…`).start();
  const run = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: isWindows
  });
  if (run.error) {
    spinner.fail(`${label} failed: ${run.error.message || run.error}`);
    throw new Error(`${label} failed: ${run.error.message || run.error}`);
  }
  if (run.status !== 0) {
    spinner.fail(`${label} failed (exit ${run.status})`);
    if (run.stderr) process.stderr.write(run.stderr + '\n');
    throw new Error(`${label} failed with exit code ${run.status}`);
  }
  spinner.succeed(`${label} complete`);
}

function runCommandCapture(command, args, label) {
  const run = spawnSync(command, args, {
    encoding: 'utf8',
    shell: isWindows
  });
  return {
    ok: run.status === 0 && !run.error,
    status: run.status,
    stdout: String(run.stdout || '').trim(),
    stderr: run.error
      ? `${label} failed: ${run.error.message || run.error}`
      : String(run.stderr || '').trim()
  };
}

function parseVersionsJson(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
    }
    if (typeof parsed === 'string') return [parsed.trim()].filter(Boolean);
    return [];
  } catch {
    return raw.split('\n').map((entry) => entry.trim()).filter(Boolean);
  }
}

function printUpgradeError({ title, detailLines = [], suggestionLines = [] }) {
  console.error('');
  console.error(`${symbol.fail()} ${c.red.bold('UPGRADE ERROR')}`);
  console.error(c.bold(title));
  if (detailLines.length > 0) {
    console.error('\nDetails:');
    for (const line of detailLines) {
      console.error(` ${c.dim('•')} ${line}`);
    }
  }
  if (suggestionLines.length > 0) {
    console.error('\nTry:');
    for (const line of suggestionLines) {
      console.error(` ${c.cyan('➜')} ${line}`);
    }
  }
  console.error('');
}

function ensureVersionExists({ npmCmd, packageName, targetVersion }) {
  const channel = normalizeUpdateChannel(targetVersion);
  if (!targetVersion || targetVersion === 'latest' || channel === 'stable' || channel === 'beta') return;

  const query = runCommandCapture(npmCmd, ['view', packageName, 'versions', '--json'], 'fetch published versions');
  if (!query.ok) {
    printUpgradeError({
      title: `Unable to verify published versions for ${packageName}.`,
      detailLines: [query.stderr || `npm exited with code ${query.status}`],
      suggestionLines: [
        'Check internet/npm access and retry.',
        'Run synapse upgrade latest',
        `Run npm view ${packageName} versions --json`
      ]
    });
    process.exit(1);
  }

  const versions = parseVersionsJson(query.stdout);
  if (versions.includes(targetVersion)) return;

  const latest = versions.length > 0 ? versions[versions.length - 1] : null;
  const betaCandidates = versions.filter((entry) => entry.includes('beta')).slice(-5);
  printUpgradeError({
    title: `Requested version "${targetVersion}" is not published for ${packageName}.`,
    detailLines: [
      latest ? `Latest published version: ${latest}` : 'Unable to determine latest published version.',
      betaCandidates.length > 0
        ? `Recent beta versions: ${betaCandidates.join(', ')}`
        : 'No beta versions found in published list.'
    ],
    suggestionLines: [
      `synapse upgrade ${latest || 'latest'}`,
      `synapse upgrade --dry-run`,
      `npm view ${packageName} versions --json`
    ]
  });
  process.exit(1);
}

function toRootList(rawPaths) {
  if (!rawPaths) return [];
  const roots = [];
  for (const item of rawPaths.split(',').map((entry) => entry.trim()).filter(Boolean)) {
    const resolved = path.resolve(item);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) continue;
    roots.push({
      label: path.basename(resolved) || `root${roots.length + 1}`,
      path: resolved
    });
  }
  return roots;
}

function applyFieldValue(config, fieldPath, value) {
  if (fieldPath === 'roots') {
    config.roots = value;
    return;
  }
  const parts = fieldPath.split('.');
  let cursor = config;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

async function fillMissingFields(baseConfig, missingFields) {
  if (missingFields.length === 0) return baseConfig;

  const rl = readline.createInterface({ input, output });
  try {
    process.stdout.write('\n');
    console.log(rule('Action required'));
    console.log('New required setup fields need your input:');
    for (const field of missingFields) {
      console.log(` ${c.yellow('•')} ${c.bold(field.label)} (${c.dim(field.path)})`);
    }
    process.stdout.write('\n');

    for (const field of missingFields) {
      if (field.path === 'roots') {
        const answer = (await rl.question('Project folders (comma-separated absolute paths): ')).trim();
        const roots = toRootList(answer);
        if (roots.length === 0) {
          throw new Error('At least one valid project folder is required.');
        }
        applyFieldValue(baseConfig, field.path, roots);
        continue;
      }

      if (field.type === 'boolean') {
        const answer = (await rl.question(`${field.label} [true/false]: `)).trim();
        applyFieldValue(baseConfig, field.path, parseBoolean(answer, false));
        continue;
      }

      const answer = (await rl.question(`${field.label}: `)).trim();
      if (!answer) {
        throw new Error(`Value required for ${field.path}`);
      }
      applyFieldValue(baseConfig, field.path, answer);
    }
  } finally {
    rl.close();
  }
  return baseConfig;
}

async function main() {
  if (hasFlag('help') || hasShortFlag('h')) {
    console.log(c.bold('Synapse upgrade helper'));
    console.log('');
    console.log(c.bold('Usage:'));
    console.log('  synapse upgrade');
    console.log('  synapse upgrade stable');
    console.log('  synapse upgrade beta');
    console.log(`  synapse upgrade ${c.cyan(SERVER_VERSION)}`);
    console.log(`  synapse upgrade ${c.cyan('install')} ${c.cyan(SERVER_VERSION)}`);
    console.log('');
    console.log(c.bold('Options:'));
    console.log(`  ${c.cyan('--version')}=<semver|latest|stable|beta>  target package version`);
    console.log(`  ${c.cyan('--package')}=<npm-package>              package name (default synapse)`);
    console.log(`  ${c.cyan('--skip-skill')}                         skip skill sync step`);
    console.log(`  ${c.cyan('--yes')}                                continue without confirmation`);
    console.log(`  ${c.cyan('--dry-run')}                           print actions only`);
    return;
  }

  const packageName = parseArg('package') || 'synapse';
  const targetVersion = resolveTargetVersion();
  const installTarget = normalizeInstallTarget(targetVersion);
  const skipSkill = hasFlag('skip-skill');
  const dryRun = hasFlag('dry-run');
  const assumeYes = hasFlag('yes');

  const defaults = {
    roots: [{ label: path.basename(process.cwd()) || 'cwd', path: process.cwd() }],
    index: {
      backend: 'sqlite-vec',
      dbPath: layout.sqliteDbPath,
      indexPath: layout.jsonIndexPath,
      chunkLines: 60,
      chunkOverlap: 15,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 20000,
      embeddingProvider: 'huggingface',
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingCacheDir: layout.dirs.cache,
      embeddingDimensions: 384,
      rerankerProvider: 'huggingface',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      rerankerCacheDir: layout.dirs.cache
    },
    memory: {
      enabled: false,
      backend: 'auto',
      dbPath: layout.memoryDbPath,
      autoCapture: false,
      askForConsentDone: false
    }
  };

  const existingConfig = readExistingConfig();
  const missing = findMissingRequiredSetupFields(existingConfig);
  const mergedConfig = normalizeUpgradeConfig({ existingConfig, defaults });
  const finalConfig = assumeYes ? mergedConfig : await fillMissingFields(mergedConfig, missing);

  const npmCmd = NPM_BIN;
  const skillCmd = SYNAPSE_BIN;
  const setupScript = path.resolve(scriptsDir, 'setup-synapse.mjs');
  const setupArgs = [
    setupScript,
    `--package=${packageName}`,
    `--roots-json=${JSON.stringify(finalConfig.roots)}`,
    `--index-backend=${finalConfig.index.backend}`,
    `--db-path=${finalConfig.index.dbPath}`,
    `--index-path=${finalConfig.index.indexPath}`,
    `--chunk-lines=${String(finalConfig.index.chunkLines)}`,
    `--chunk-overlap=${String(finalConfig.index.chunkOverlap)}`,
    `--max-terms-per-chunk=${String(finalConfig.index.maxTermsPerChunk)}`,
    `--max-indexed-files=${String(finalConfig.index.maxIndexedFiles)}`,
    `--embed-provider=${finalConfig.index.embeddingProvider || 'huggingface'}`,
    `--embed-model=${finalConfig.index.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2'}`,
    `--embed-cache-dir=${finalConfig.index.embeddingCacheDir || layout.dirs.cache}`,
    `--embed-dims=${String(finalConfig.index.embeddingDimensions || 384)}`,
    `--reranker-provider=${finalConfig.index.rerankerProvider || 'huggingface'}`,
    `--reranker-model=${finalConfig.index.rerankerModel || 'cross-encoder/ms-marco-MiniLM-L-6-v2'}`,
    `--reranker-cache-dir=${finalConfig.index.rerankerCacheDir || layout.dirs.cache}`,
    `--memory-enabled=${String(finalConfig.memory.enabled)}`,
    `--memory-backend=${finalConfig.memory.backend}`,
    `--memory-db-path=${finalConfig.memory.dbPath}`,
    `--memory-auto-capture=${String(finalConfig.memory.autoCapture)}`,
    `--memory-consent-done=${String(finalConfig.memory.askForConsentDone)}`
  ];

  const planned = [
    `${npmCmd} install -g ${packageName}@${installTarget}`,
    skipSkill ? null : `${skillCmd} install skills --force`,
    `${process.execPath} ${setupArgs.join(' ')}`
  ].filter(Boolean);

  if (dryRun) {
    process.stdout.write('[upgrade] dry run, planned commands:\n');
    for (const command of planned) {
      process.stdout.write(`- ${command}\n`);
    }
    return;
  }

  ensureVersionExists({ npmCmd, packageName, targetVersion });
  runCommand(npmCmd, ['install', '-g', `${packageName}@${installTarget}`], 'upgrade package');
  if (!skipSkill) {
    runCommand(skillCmd, ['install', 'skills', '--force'], 'sync skill');
  }
  // Use --import tsx/esm so setup can import .ts source files
  let tsxImportArgs = [];
  try {
    const { createRequire } = await import('node:module');
    const { pathToFileURL } = await import('node:url');
    const req = createRequire(path.resolve(scriptsDir, '..', '..', 'package.json'));
    tsxImportArgs = ['--import', pathToFileURL(req.resolve('tsx/esm')).href];
  } catch { /* tsx unavailable — try without */ }
  runCommand(process.execPath, [...tsxImportArgs, ...setupArgs], 'migrate setup');

  const doctorScript = path.resolve(scriptsDir, 'doctor-synapse.mjs');
  try {
    runCommand(process.execPath, [...tsxImportArgs, doctorScript], 'post-upgrade doctor');
  } catch (error) {
    console.error(`${symbol.warn()} ${c.yellow(error.message)}`);
  }

  console.log('');
  console.log(box.top(60));
  console.log(box.row(c.bold('Synapse Upgrade Completed ✓'), 60));
  console.log(box.divider(60));
  console.log(box.row('Next: Restart your MCP client to apply changes.', 60));
  console.log(box.bottom(60));
  console.log('');
}

main().catch((error) => {
  process.stderr.write(`[synapse-upgrade] fatal: ${error?.message || error}\n`);
  process.exit(1);
});
