#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSynapsePaths,
  findSqliteVecExtensionPath,
  resolveConfigPath as resolveDefaultConfigPath,
  resolveSynapseHome,
  resolveWritableModelCacheDir,
  installRuntimeWarningFilter
} from '../../src/core/runtime/index.ts';
import {
  c,
  symbol,
  bar
} from '../../src/interfaces/cli/ansi.ts';
import {
  NPM_BIN,
  NPX_BIN,
  RG_BIN,
  isWindows
} from '../../src/core/runtime/platform.ts';

if (!process.env.DART_SUPPRESS_ANALYTICS) {
  process.env.DART_SUPPRESS_ANALYTICS = 'true';
}

installRuntimeWarningFilter();

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');

// Extract only needed env vars — avoids CodeQL CWE-532 taint from process.env to console.log
const safeEnv = {
  HOME: process.env.HOME || '',
  SYNAPSE_HOME: process.env.SYNAPSE_HOME || '',
  SYNAPSE_CONFIG: process.env.SYNAPSE_CONFIG || '',
  SYNAPSE_INDEX_BACKEND: process.env.SYNAPSE_INDEX_BACKEND || '',
  SYNAPSE_SQLITE_VEC_EXTENSION: process.env.SYNAPSE_SQLITE_VEC_EXTENSION || '',
  SYNAPSE_SQLITE_VEC_SEARCH_DIRS: process.env.SYNAPSE_SQLITE_VEC_SEARCH_DIRS || '',
  SYNAPSE_EMBED_CACHE_DIR: process.env.SYNAPSE_EMBED_CACHE_DIR || '',
  SYNAPSE_RERANKER_CACHE_DIR: process.env.SYNAPSE_RERANKER_CACHE_DIR || '',
  SYNAPSE_DOCTOR_STRICT: process.env.SYNAPSE_DOCTOR_STRICT || '',
  USER: process.env.USER || '',
  USERNAME: process.env.USERNAME || '',
};

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function commandExists(cmd, args = ['--version']) {
  try {
    const result = spawnSync(cmd, args, {
      stdio: 'ignore',
      shell: isWindows
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolveConfigPath() {
  return resolveDefaultConfigPath({
    env: safeEnv,
    synapseHome: resolveSynapseHome(safeEnv)
  });
}

function parseConfigForModelCacheDirs() {
  const out = {
    embeddingCacheDir: '',
    rerankerCacheDir: ''
  };
  const cfgPath = resolveConfigPath();
  try {
    if (!fs.existsSync(cfgPath)) return out;
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const byConfigEmbedding = parsed?.index?.embeddingCacheDir;
    const byConfigReranker = parsed?.index?.rerankerCacheDir;
    if (typeof byConfigEmbedding === 'string' && byConfigEmbedding.trim()) {
      out.embeddingCacheDir = path.resolve(byConfigEmbedding);
    }
    if (typeof byConfigReranker === 'string' && byConfigReranker.trim()) {
      out.rerankerCacheDir = path.resolve(byConfigReranker);
    }
  } catch {
    // Keep defaults.
  }
  return out;
}

function resolveIndexBackend() {
  const byEnv = (safeEnv.SYNAPSE_INDEX_BACKEND || '').trim();
  if (byEnv) return byEnv;

  const cfgPath = resolveConfigPath();
  try {
    if (!fs.existsSync(cfgPath)) return 'sqlite-vec';
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return parsed?.index?.backend || 'sqlite-vec';
  } catch {
    return 'sqlite-vec';
  }
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
  if (Number.isFinite(major) && major >= 18) {
    return { id: 'node_version', ok: true, detail: `Node.js ${process.versions.node}` };
  }
  return {
    id: 'node_version',
    ok: false,
    detail: `Node.js >=18 required. Current: ${process.versions.node}`,
    fix: 'Install Node.js 18+ and re-run doctor.'
  };
}

function checkNpmNpx() {
  const npmOk = commandExists(NPM_BIN, ['--version']);
  const npxOk = commandExists(NPX_BIN, ['--version']);

  if (npmOk && npxOk) {
    return { id: 'npm_npx', ok: true, detail: `npm and npx available` };
  }

  return {
    id: 'npm_npx',
    ok: false,
    detail: `Missing npm or npx`,
    fix: 'Install/reinstall Node.js with npm, then re-run doctor.'
  };
}

function checkRipgrep() {
  const ok = commandExists(RG_BIN);
  if (ok) {
    return { id: 'ripgrep', ok: true, detail: 'ripgrep available' };
  }

  let fix;
  if (process.platform === 'win32') {
    fix = 'Install ripgrep: winget install BurntSushi.ripgrep.MSVC';
  } else if (process.platform === 'darwin') {
    fix = 'Install ripgrep: brew install ripgrep';
  } else {
    fix = 'Install ripgrep: sudo apt-get install ripgrep';
  }

  return { id: 'ripgrep', ok: false, detail: 'ripgrep (rg) missing', fix };
}

async function checkSdkImport() {
  try {
    await import('@modelcontextprotocol/sdk/server/mcp.js');
    await import('@modelcontextprotocol/sdk/server/stdio.js');
    return { id: 'sdk_import', ok: true, detail: 'MCP SDK imports resolved' };
  } catch (error) {
    return {
      id: 'sdk_import',
      ok: false,
      detail: `MCP SDK import failed: ${error?.code || error?.message || 'unknown error'}`,
      fix: 'If running from source, run npm install. If using npx package, reinstall and retry.'
    };
  }
}

async function checkSqliteBackend() {
  if (resolveIndexBackend() !== 'sqlite-vec') {
    return { id: 'sqlite_backend', ok: true, detail: 'sqlite-vec backend not selected' };
  }

  try {
    await import('node:sqlite');
    return { id: 'sqlite_backend', ok: true, detail: 'node:sqlite available for sqlite-vec backend' };
  } catch {
    return {
      id: 'sqlite_backend',
      ok: false,
      detail: 'node:sqlite unavailable for sqlite-vec backend',
      fix: 'Use Node.js 22+ or switch backend to json in setup.'
    };
  }
}

function checkConfigFile() {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    return {
      id: 'config_file',
      ok: false,
      detail: `Config not found: ${configPath}`,
      fix: 'Run synapse setup to create config.'
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {
      id: 'config_file',
      ok: false,
      detail: `Invalid JSON config: ${configPath}`,
      fix: 'Fix JSON syntax in synapse.config.json.'
    };
  }

  if (!parsed || !Array.isArray(parsed.roots) || parsed.roots.length === 0) {
    return {
      id: 'config_file',
      ok: false,
      detail: 'Config has no roots[]',
      fix: 'Add at least one valid root path in synapse.config.json.'
    };
  }

  const missing = [];
  for (const root of parsed.roots) {
    if (!root || typeof root.path !== 'string') {
      missing.push('<invalid-root-entry>');
      continue;
    }
    const resolved = path.resolve(root.path);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      missing.push(resolved);
    }
  }

  if (missing.length > 0) {
    return {
      id: 'config_file',
      ok: false,
      detail: `Some configured roots are missing: ${missing.join(', ')}`,
      fix: 'Update synapse.config.json with existing directories.'
    };
  }

  return {
    id: 'config_file',
    ok: true,
    detail: `Config OK (${configPath}) with ${parsed.roots.length} root(s)`
  };
}

function checkSqliteVecExtension() {
  if (resolveIndexBackend() !== 'sqlite-vec') {
    return { id: 'sqlite_vec_extension', ok: true, detail: 'sqlite-vec native extension not required for current backend' };
  }

  const configured = (safeEnv.SYNAPSE_SQLITE_VEC_EXTENSION || '').trim();
  const synapseHome = resolveSynapseHome(safeEnv);
  const configuredPath = configured ? path.resolve(configured) : '';
  const detected = configuredPath
    ? (fs.existsSync(configuredPath) ? { path: configuredPath, source: 'configured' } : null)
    : findSqliteVecExtensionPath({
      synapseHome,
      env: safeEnv
    });

  if (detected?.path) {
    return {
      id: 'sqlite_vec_extension',
      ok: true,
      detail: `sqlite-vec native extension ready (${detected.path})`
    };
  }

  return {
    id: 'sqlite_vec_extension',
    ok: false,
    detail: configuredPath
      ? `sqlite-vec backend selected but configured vec0 path is missing: ${configuredPath}`
      : 'sqlite-vec backend selected but vec0 native extension is not configured',
    fix: 'Run synapse setup again so Synapse can install/configure sqlite-vec, or set SYNAPSE_SQLITE_VEC_EXTENSION to the vec0 shared library path.'
  };
}

function checkModelCacheWritable() {
  const synapseHome = resolveSynapseHome(safeEnv);
  const configCaches = parseConfigForModelCacheDirs();
  const defaultCache = buildSynapsePaths(synapseHome).dirs.cache;
  const embedPreferred = path.resolve(
    (safeEnv.SYNAPSE_EMBED_CACHE_DIR || '').trim() ||
    configCaches.embeddingCacheDir ||
    defaultCache
  );
  const rerankerPreferred = path.resolve(
    (safeEnv.SYNAPSE_RERANKER_CACHE_DIR || '').trim() ||
    configCaches.rerankerCacheDir ||
    defaultCache
  );
  const embedResolved = resolveWritableModelCacheDir({
    preferredDir: embedPreferred,
    synapseHome,
    env: safeEnv
  });
  const rerankerResolved = resolveWritableModelCacheDir({
    preferredDir: rerankerPreferred,
    synapseHome,
    env: safeEnv
  });

  if (!embedResolved.writable || !rerankerResolved.writable) {
    return {
      id: 'model_cache',
      ok: false,
      detail: 'Model cache not writable for configured or fallback locations',
      fix: 'Set SYNAPSE_EMBED_CACHE_DIR/SYNAPSE_RERANKER_CACHE_DIR to a writable path, then re-run synapse setup.'
    };
  }

  const fallbackUsed = embedResolved.fallbackUsed || rerankerResolved.fallbackUsed;
  return {
    id: 'model_cache',
    ok: true,
    detail: fallbackUsed
      ? 'Model cache writable (fallback location active — run with --json for details)'
      : 'Model cache writable'
  };
}

function checkGlobalInstallStaleTempDirs() {
  const fixFlag = argv.includes('--fix');
  let nodeModulesDir;
  try {
    const isWindows = process.platform === 'win32';
    nodeModulesDir = spawnSync(NPM_BIN, ['root', '-g'], {
      encoding: 'utf8',
      shell: isWindows
    }).stdout.trim();
  } catch { /* ignore */ }
  if (!nodeModulesDir || !fs.existsSync(nodeModulesDir)) {
    return { id: 'global_stale_temp', ok: true, detail: 'Could not locate global node_modules (skipped)' };
  }

  const entries = fs.readdirSync(nodeModulesDir);
  const stalePrefix = '.synapse-';
  const stale = entries.filter((e) => e.startsWith(stalePrefix));

  if (stale.length === 0) {
    return { id: 'global_stale_temp', ok: true, detail: 'No stale npm temp dirs found' };
  }

  if (fixFlag) {
    let removed = 0;
    for (const entry of stale) {
      try {
        fs.rmSync(path.join(nodeModulesDir, entry), { recursive: true, force: true });
        removed++;
      } catch { /* best-effort */ }
    }
    if (removed === stale.length) {
      return { id: 'global_stale_temp', ok: true, detail: `Cleaned ${removed} stale npm temp dir(s)` };
    }
    return {
      id: 'global_stale_temp',
      ok: false,
      detail: `Partially cleaned: ${removed}/${stale.length} temp dirs removed`,
      fix: 'Manually remove remaining dirs or run with sudo: rm -rf ' + path.join(nodeModulesDir, stalePrefix) + '*'
    };
  }

  return {
    id: 'global_stale_temp',
    ok: false,
    detail: `${stale.length} stale npm temp dir(s) found (blocks global reinstall)`,
    fix: 'Run: synapse doctor --fix  OR  rm -rf ' + path.join(nodeModulesDir, stalePrefix) + '*'
  };
}

function printText(results) {
  console.log(c.bold('Synapse Doctor'));
  console.log('');

  for (const r of results) {
    const mark = r.ok ? symbol.ok() : symbol.fail();
    console.log(`${mark} ${c.bold(r.id)}: ${r.detail}`);
    if (!r.ok && r.fix) {
      console.log(`   ${c.yellow('fix:')} ${r.fix}`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log('');
  console.log(`Health: ${bar(passed, results.length)}`);
  console.log('');
  if (failed === 0) {
    console.log(`${symbol.ok()} ${c.green('Doctor result: healthy')}`);
  } else {
    console.log(`${symbol.fail()} ${c.red(`Doctor result: ${failed} issue(s) found`)}`);
  }
}

function printHelp() {
  process.stdout.write(c.bold('Synapse Doctor') + '\n\n');
  process.stdout.write('Usage:\n');
  process.stdout.write('  synapse doctor\n');
  process.stdout.write('  synapse doctor --verbose\n');
  process.stdout.write('  synapse doctor --json\n');
  process.stdout.write('\nCompatibility alias (deprecated):\n');
  process.stdout.write('  synapse-doctor\n');
  process.stdout.write('  synapse-doctor --json\n');
  process.stdout.write('Options:\n');
  process.stdout.write('  --json      print JSON output\n');
  process.stdout.write('  --fix       auto-fix detected issues (e.g. stale npm temp dirs)\n');
  process.stdout.write('  --help,-h   show this help\n');
}

async function main() {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  const checks = [
    checkNodeVersion(),
    checkNpmNpx(),
    checkRipgrep(),
    await checkSdkImport(),
    await checkSqliteBackend(),
    checkSqliteVecExtension(),
    checkConfigFile(),
    checkModelCacheWritable(),
    checkGlobalInstallStaleTempDirs()
  ];

  if (asJson) {
    console.log(JSON.stringify({ ok: checks.every((c) => c.ok), checks }, null, 2));
  } else {
    printText(checks);
  }

  const strict = parseBoolean(safeEnv.SYNAPSE_DOCTOR_STRICT, true);
  if (strict && checks.some((c) => !c.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[synapse-doctor] fatal:', error?.message || error);
  process.exit(1);
});
