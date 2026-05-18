#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildLociPaths,
  findSqliteVecExtensionPath,
  resolveConfigPath as resolveDefaultConfigPath,
  resolveLociHome,
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
  LOCI_HOME: process.env.LOCI_HOME || '',
  LOCI_CONFIG: process.env.LOCI_CONFIG || '',
  LOCI_INDEX_BACKEND: process.env.LOCI_INDEX_BACKEND || '',
  LOCI_SQLITE_VEC_EXTENSION: process.env.LOCI_SQLITE_VEC_EXTENSION || '',
  LOCI_SQLITE_VEC_SEARCH_DIRS: process.env.LOCI_SQLITE_VEC_SEARCH_DIRS || '',
  LOCI_EMBED_CACHE_DIR: process.env.LOCI_EMBED_CACHE_DIR || '',
  LOCI_RERANKER_CACHE_DIR: process.env.LOCI_RERANKER_CACHE_DIR || '',
  LOCI_DOCTOR_STRICT: process.env.LOCI_DOCTOR_STRICT || '',
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
    lociHome: resolveLociHome(safeEnv)
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
  const byEnv = (safeEnv.LOCI_INDEX_BACKEND || '').trim();
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
    return { id: 'node_version', ok: true, detail: `Node.js ${process.versions.node}`, critical: true };
  }
  return {
    id: 'node_version',
    ok: false,
    critical: true,
    detail: `Node.js >=18 required. Current: ${process.versions.node}`,
    fix: 'Install Node.js 18+ and re-run doctor.'
  };
}

function checkNpmNpx() {
  const npmOk = commandExists(NPM_BIN, ['--version']);
  const npxOk = commandExists(NPX_BIN, ['--version']);

  if (npmOk && npxOk) {
    return { id: 'npm_npx', ok: true, detail: `npm and npx available`, critical: true };
  }

  return {
    id: 'npm_npx',
    ok: false,
    critical: true,
    detail: `Missing npm or npx`,
    fix: 'Install/reinstall Node.js with npm, then re-run doctor.'
  };
}

function checkRipgrep() {
  const ok = commandExists(RG_BIN);
  if (ok) {
    return { id: 'ripgrep', ok: true, detail: 'ripgrep available', critical: false };
  }

  let fix;
  if (process.platform === 'win32') {
    fix = 'Install ripgrep: winget install BurntSushi.ripgrep.MSVC';
  } else if (process.platform === 'darwin') {
    fix = 'Install ripgrep: brew install ripgrep';
  } else {
    fix = 'Install ripgrep: sudo apt-get install ripgrep';
  }

  return { id: 'ripgrep', ok: false, critical: false, detail: 'ripgrep (rg) missing', fix };
}

async function checkSdkImport() {
  try {
    await import('@modelcontextprotocol/sdk/server/mcp.js');
    await import('@modelcontextprotocol/sdk/server/stdio.js');
    return { id: 'sdk_import', ok: true, detail: 'MCP SDK imports resolved', critical: true };
  } catch (error) {
    return {
      id: 'sdk_import',
      ok: false,
      critical: true,
      detail: `MCP SDK import failed: ${error?.code || error?.message || 'unknown error'}`,
      fix: 'If running from source, run npm install. If using npx package, reinstall and retry.'
    };
  }
}

async function checkSqliteBackend() {
  if (resolveIndexBackend() !== 'sqlite-vec') {
    return { id: 'sqlite_backend', ok: true, detail: 'sqlite-vec backend not selected', critical: true };
  }

  try {
    await import('node:sqlite');
    return { id: 'sqlite_backend', ok: true, detail: 'node:sqlite available for sqlite-vec backend', critical: true };
  } catch {
    return {
      id: 'sqlite_backend',
      ok: false,
      critical: true,
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
      critical: true,
      detail: `Config not found: ${configPath}`,
      fix: 'Run loci setup to create config.'
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {
      id: 'config_file',
      ok: false,
      critical: true,
      detail: `Invalid JSON config: ${configPath}`,
      fix: 'Fix JSON syntax in loci.config.json.'
    };
  }

  if (!parsed || !Array.isArray(parsed.roots) || parsed.roots.length === 0) {
    return {
      id: 'config_file',
      ok: false,
      critical: true,
      detail: 'Config has no roots[]',
      fix: 'Add at least one valid root path in loci.config.json.'
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
      critical: false, // Root paths missing is common and not strictly fatal for core service start
      detail: `Some configured roots are missing: ${missing.join(', ')}`,
      fix: 'Update loci.config.json with existing directories.'
    };
  }

  return {
    id: 'config_file',
    ok: true,
    detail: `Config OK (${configPath}) with ${parsed.roots.length} root(s)`,
    critical: true
  };
}

function checkSqliteVecExtension() {
  if (resolveIndexBackend() !== 'sqlite-vec') {
    return { id: 'sqlite_vec_extension', ok: true, detail: 'sqlite-vec native extension not required for current backend', critical: true };
  }

  const configured = (safeEnv.LOCI_SQLITE_VEC_EXTENSION || '').trim();
  const lociHome = resolveLociHome(safeEnv);
  const configuredPath = configured ? path.resolve(configured) : '';
  const detected = configuredPath
    ? (fs.existsSync(configuredPath) ? { path: configuredPath, source: 'configured' } : null)
    : findSqliteVecExtensionPath({
      lociHome,
      env: safeEnv
    });

  if (detected?.path) {
    return {
      id: 'sqlite_vec_extension',
      ok: true,
      detail: `sqlite-vec native extension ready (${detected.path})`,
      critical: true
    };
  }

  return {
    id: 'sqlite_vec_extension',
    ok: false,
    critical: true,
    detail: configuredPath
      ? `sqlite-vec backend selected but configured vec0 path is missing: ${configuredPath}`
      : 'sqlite-vec backend selected but vec0 native extension is not configured',
    fix: 'Run loci setup again so Loci can install/configure sqlite-vec, or set LOCI_SQLITE_VEC_EXTENSION to the vec0 shared library path.'
  };
}

function checkModelCacheWritable() {
  const lociHome = resolveLociHome(safeEnv);
  const configCaches = parseConfigForModelCacheDirs();
  const defaultCache = buildLociPaths(lociHome).dirs.cache;
  const embedPreferred = path.resolve(
    (safeEnv.LOCI_EMBED_CACHE_DIR || '').trim() ||
    configCaches.embeddingCacheDir ||
    defaultCache
  );
  const rerankerPreferred = path.resolve(
    (safeEnv.LOCI_RERANKER_CACHE_DIR || '').trim() ||
    configCaches.rerankerCacheDir ||
    defaultCache
  );
  const embedResolved = resolveWritableModelCacheDir({
    preferredDir: embedPreferred,
    lociHome,
    env: safeEnv
  });
  const rerankerResolved = resolveWritableModelCacheDir({
    preferredDir: rerankerPreferred,
    lociHome,
    env: safeEnv
  });

  if (!embedResolved.writable || !rerankerResolved.writable) {
    return {
      id: 'model_cache',
      ok: false,
      critical: true,
      detail: 'Model cache not writable for configured or fallback locations',
      fix: 'Set LOCI_EMBED_CACHE_DIR/LOCI_RERANKER_CACHE_DIR to a writable path, then re-run loci setup.'
    };
  }

  const fallbackUsed = embedResolved.fallbackUsed || rerankerResolved.fallbackUsed;
  return {
    id: 'model_cache',
    ok: true,
    critical: true,
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
    return { id: 'global_stale_temp', ok: true, detail: 'Could not locate global node_modules (skipped)', critical: false };
  }

  const entries = fs.readdirSync(nodeModulesDir);
  const stalePrefix = '.loci-mcp-';
  const stale = entries.filter((e) => e.startsWith(stalePrefix));

  if (stale.length === 0) {
    return { id: 'global_stale_temp', ok: true, detail: 'No stale npm temp dirs found', critical: false };
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
      return { id: 'global_stale_temp', ok: true, detail: `Cleaned ${removed} stale npm temp dir(s)`, critical: false };
    }
    return {
      id: 'global_stale_temp',
      ok: false,
      critical: false,
      detail: `Partially cleaned: ${removed}/${stale.length} temp dirs removed`,
      fix: 'Manually remove remaining dirs or run with sudo: rm -rf ' + path.join(nodeModulesDir, stalePrefix) + '*'
    };
  }

  return {
    id: 'global_stale_temp',
    ok: false,
    critical: false,
    detail: `${stale.length} stale npm temp dir(s) found (blocks global reinstall)`,
    fix: 'Run: loci doctor --fix  OR  rm -rf ' + path.join(nodeModulesDir, stalePrefix) + '*'
  };
}

function printText(results) {
  console.log(c.bold('Loci Doctor'));
  console.log('');

  for (const r of results) {
    let mark = r.ok ? symbol.ok() : symbol.fail();
    if (!r.ok && !r.critical) mark = symbol.warn();
    
    console.log(`${mark} ${c.bold(r.id)}: ${r.detail}`);
    if (!r.ok && r.fix) {
      console.log(`   ${c.yellow('fix:')} ${r.fix}`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const criticalFailed = results.filter((r) => !r.ok && r.critical).length;
  const optionalFailed = results.filter((r) => !r.ok && !r.critical).length;

  console.log('');
  console.log(`Health: ${bar(passed, results.length)}`);
  console.log('');

  if (criticalFailed === 0) {
    if (optionalFailed === 0) {
      console.log(`${symbol.ok()} ${c.green('Doctor result: healthy')}`);
    } else {
      console.log(`${symbol.warn()} ${c.yellow(`Doctor result: operational (${optionalFailed} optional issues found)`)}`);
    }
  } else {
    console.log(`${symbol.fail()} ${c.red(`Doctor result: ${criticalFailed + optionalFailed} issue(s) found (${criticalFailed} critical)`)}`);
  }
}

function printHelp() {
  process.stdout.write(c.bold('Loci Doctor') + '\n\n');
  process.stdout.write('Usage:\n');
  process.stdout.write('  loci doctor\n');
  process.stdout.write('  loci doctor --verbose\n');
  process.stdout.write('  loci doctor --json\n');
  process.stdout.write('\nCompatibility alias (deprecated):\n');
  process.stdout.write('  loci-doctor\n');
  process.stdout.write('  loci-doctor --json\n');
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
    console.log(JSON.stringify({ 
      ok: checks.every((c) => c.ok || !c.critical), 
      healthy: checks.every((c) => c.ok),
      checks 
    }, null, 2));
  } else {
    printText(checks);
  }

  const strict = parseBoolean(safeEnv.LOCI_DOCTOR_STRICT, true);
  if (strict && checks.some((c) => !c.ok && c.critical)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[loci-doctor] fatal:', error?.message || error);
  process.exit(1);
});
