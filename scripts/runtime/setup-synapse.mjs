#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  ensureSqliteVecExtension,
  migrateSynapseHomeLayout,
  resolveSynapseHome,
  resolveWritableModelCacheDir,
  installRuntimeWarningFilter
} from '../../src/runtime/index.ts';
import {
  buildSynapseServerConfig,
  installSynapseIntoDetectedClients
} from '../../src/setup/client-installer.ts';
import ora from 'ora';
import {
  c,
  symbol,
  box,
  rule
} from '../../src/cli/ansi.ts';
import {
  NPM_BIN,
  NPX_BIN,
  SYNAPSE_BIN,
  isWindows
} from '../../src/runtime/platform.ts';

if (!process.env.DART_SUPPRESS_ANALYTICS) {
  process.env.DART_SUPPRESS_ANALYTICS = 'true';
}

const cwd = process.cwd();
// Extract only HOME for path resolution — avoids CodeQL CWE-532 taint from process.env
const homeOnlyEnv = { HOME: process.env.HOME || '' };
const synapseHome = resolveSynapseHome(homeOnlyEnv);
const layout = migrateSynapseHomeLayout(synapseHome).paths;
const configPath = layout.configPath;
const snippetPath = layout.snippetPath;
const defaultDbPath = layout.sqliteDbPath;
const defaultJsonIndexPath = layout.jsonIndexPath;
const defaultMemoryDbPath = layout.memoryDbPath;
const argv = process.argv.slice(2);

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function toLabel(dirPath, fallback = 'root') {
  const base = path.basename(dirPath);
  const safe = (base || fallback).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return safe || fallback;
}

function expandHome(p) {
  if (!p) return p;
  return p.replace(/^~(?=$|\/)/, os.homedir());
}

function collectSuggestions() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'projects'),
    path.join(home, 'project'),
    path.join(home, 'code'),
    path.join(home, 'workspace'),
    path.join(home, 'work'),
    cwd
  ];

  const unique = [];
  const seen = new Set();
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (isDir(resolved)) unique.push(resolved);
  }
  return unique;
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

function getNpxCommand() {
  return NPX_BIN;
}

function getGlobalCommand() {
  return SYNAPSE_BIN;
}

function runPreflightChecks() {
  const errors = [];
  const warnings = [];

  const majorNode = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
  if (!Number.isFinite(majorNode) || majorNode < 18) {
    errors.push(`Node.js 18+ is required. Current: ${process.versions.node}`);
  }
  if (Number.isFinite(majorNode) && majorNode < 22) {
    warnings.push(`Node.js ${process.versions.node} does not provide built-in node:sqlite. Synapse setup will use the json index backend and disable local memory unless you upgrade to Node 22+.`);
  }

  const hasGlobal = commandExists(getGlobalCommand());
  const hasNpx = commandExists(getNpxCommand());
  if (!hasGlobal && !hasNpx) {
    errors.push('Neither synapse nor npx is available. Install Synapse globally or fix Node.js/npm and retry.');
  }

  if (!commandExists('rg')) {
    errors.push('ripgrep (rg) is required for efficient search. Install it and re-run setup.');
  }

  return { errors, warnings, majorNode };
}

function supportsNodeSqlite() {
  const majorNode = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
  return Number.isFinite(majorNode) && majorNode >= 22;
}

function resolveCompatibleSetupOptions({ backend, memoryEnabled }) {
  let resolvedBackend = backend;
  let resolvedMemoryEnabled = memoryEnabled;
  const warnings = [];

  if (!supportsNodeSqlite()) {
    if (resolvedBackend === 'sqlite-vec') {
      resolvedBackend = 'json';
      warnings.push(`sqlite-vec requires Node 22+ because it depends on built-in node:sqlite. Falling back to json backend on Node ${process.versions.node}.`);
    }
    if (resolvedMemoryEnabled) {
      resolvedMemoryEnabled = false;
      warnings.push(`Local memory requires Node 22+ because it depends on built-in node:sqlite. Disabling memory on Node ${process.versions.node}.`);
    }
  }

  return {
    backend: resolvedBackend,
    memoryEnabled: resolvedMemoryEnabled,
    warnings
  };
}

function buildSynapseEnv(indexConfig) {
  const env = {
    MCP_MODE: 'stdio',
    SYNAPSE_CONFIG: configPath,
    SYNAPSE_INDEX_BACKEND: indexConfig.backend,
    SYNAPSE_DB_PATH: indexConfig.dbPath,
    SYNAPSE_INDEX_PATH: indexConfig.indexPath,
    SYNAPSE_EMBED_PROVIDER: indexConfig.embedding.provider,
    SYNAPSE_EMBED_MODEL: indexConfig.embedding.model,
    SYNAPSE_EMBED_CACHE_DIR: indexConfig.embedding.cacheDir,
    SYNAPSE_EMBED_DIMS: String(indexConfig.embedding.dimensions),
    SYNAPSE_RERANKER_PROVIDER: indexConfig.reranker.provider,
    SYNAPSE_RERANKER_MODEL: indexConfig.reranker.model,
    SYNAPSE_RERANKER_CACHE_DIR: indexConfig.reranker.cacheDir,
    SYNAPSE_MEMORY_ENABLED: String(indexConfig.memory.enabled),
    SYNAPSE_MEMORY_BACKEND: indexConfig.memory.backend,
    SYNAPSE_MEMORY_DB_PATH: indexConfig.memory.dbPath
  };
  if (indexConfig.sqliteVecExtensionPath) {
    env.SYNAPSE_SQLITE_VEC_EXTENSION = indexConfig.sqliteVecExtensionPath;
  }
  return env;
}

function buildClientSnippet(packageRef, indexConfig) {
  const launch = resolveLaunchPreference(packageRef);
  return {
    mcpServers: {
      synapse: buildSynapseServerConfig({
        command: launch.command,
        args: launch.args,
        env: buildSynapseEnv(indexConfig)
      })
    }
  };
}



function buildGlobalClientSnippet(indexConfig) {
  return {
    mcpServers: {
      synapse: buildSynapseServerConfig({
        command: getGlobalCommand(),
        env: buildSynapseEnv(indexConfig)
      })
    }
  };
}

function resolveLaunchPreference(packageRef) {
  if (commandExists(getGlobalCommand())) {
    return { command: getGlobalCommand(), args: [] };
  }
  return { command: getNpxCommand(), args: ['-y', packageRef] };
}

function parseArg(name) {
  const long = `--${name}=`;
  const item = argv.find((a) => a.startsWith(long));
  if (!item) return null;
  return item.slice(long.length).trim();
}

function parseBooleanArg(name) {
  const raw = parseArg(name);
  if (raw === null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n') return false;
  throw new Error(`Invalid boolean for --${name}: ${raw}`);
}

function parseIntegerArg(name, fallback) {
  const raw = parseArg(name);
  if (raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for --${name}: ${raw}`);
  }
  return parsed;
}

function parseRootsFromPathsArg(pathsArg) {
  if (!pathsArg) return [];

  const roots = [];
  for (const raw of pathsArg.split(',').map((x) => x.trim()).filter(Boolean)) {
    const resolved = path.resolve(expandHome(raw));
    if (!isDir(resolved)) continue;
    roots.push({
      label: toLabel(resolved, `root${roots.length + 1}`),
      path: resolved
    });
  }
  return roots;
}

function parseRootsFromJsonArg(rootsJsonArg) {
  if (!rootsJsonArg) return [];
  let parsed;
  try {
    parsed = JSON.parse(rootsJsonArg);
  } catch {
    throw new Error('Invalid JSON provided in --roots-json');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('--roots-json must be a JSON array');
  }

  const roots = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.path !== 'string' || item.path.trim() === '') continue;
    const resolved = path.resolve(expandHome(item.path.trim()));
    if (!isDir(resolved)) continue;
    const label = typeof item.label === 'string' && item.label.trim()
      ? item.label.trim()
      : toLabel(resolved, `root${roots.length + 1}`);
    roots.push({ label, path: resolved });
  }

  return roots;
}

function readExistingConfig() {
  try {
    if (!fs.existsSync(configPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeExistingRoots(existingRoots) {
  if (!Array.isArray(existingRoots)) return [];
  const roots = [];
  for (const item of existingRoots) {
    if (!item || typeof item.path !== 'string' || item.path.trim() === '') continue;
    const resolved = path.resolve(expandHome(item.path.trim()));
    if (!isDir(resolved)) continue;
    const label = typeof item.label === 'string' && item.label.trim()
      ? item.label.trim()
      : toLabel(resolved, `root${roots.length + 1}`);
    roots.push({ label, path: resolved });
  }
  return roots;
}

function buildExistingDefaults(existingConfig) {
  const roots = sanitizeExistingRoots(existingConfig?.roots);
  const existingIndex = existingConfig?.index || {};
  const existingMemory = existingConfig?.memory || {};

  return {
    roots,
    backend: typeof existingIndex.backend === 'string' && existingIndex.backend.trim()
      ? existingIndex.backend.trim()
      : 'sqlite-vec',
    dbPath: typeof existingIndex.dbPath === 'string' && existingIndex.dbPath.trim()
      ? path.resolve(expandHome(existingIndex.dbPath))
      : defaultDbPath,
    indexPath: typeof existingIndex.indexPath === 'string' && existingIndex.indexPath.trim()
      ? path.resolve(expandHome(existingIndex.indexPath))
      : defaultJsonIndexPath,
    chunkLines: Number.isFinite(existingIndex.chunkLines) ? existingIndex.chunkLines : 60,
    chunkOverlap: Number.isFinite(existingIndex.chunkOverlap) ? existingIndex.chunkOverlap : 15,
    maxTermsPerChunk: Number.isFinite(existingIndex.maxTermsPerChunk) ? existingIndex.maxTermsPerChunk : 80,
    maxIndexedFiles: Number.isFinite(existingIndex.maxIndexedFiles) ? existingIndex.maxIndexedFiles : 20000,
    embeddingProvider: typeof existingIndex.embeddingProvider === 'string' && existingIndex.embeddingProvider.trim()
      ? existingIndex.embeddingProvider.trim()
      : 'huggingface',
    embeddingModel: typeof existingIndex.embeddingModel === 'string' && existingIndex.embeddingModel.trim()
      ? existingIndex.embeddingModel.trim()
      : 'sentence-transformers/all-MiniLM-L6-v2',
    embedCachePreferred: typeof existingIndex.embeddingCacheDir === 'string' && existingIndex.embeddingCacheDir.trim()
      ? path.resolve(expandHome(existingIndex.embeddingCacheDir))
      : layout.dirs.cache,
    embeddingDimensions: Number.isFinite(existingIndex.embeddingDimensions) ? existingIndex.embeddingDimensions : 384,
    rerankerProvider: typeof existingIndex.rerankerProvider === 'string' && existingIndex.rerankerProvider.trim()
      ? existingIndex.rerankerProvider.trim()
      : 'huggingface',
    rerankerModel: typeof existingIndex.rerankerModel === 'string' && existingIndex.rerankerModel.trim()
      ? existingIndex.rerankerModel.trim()
      : 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    rerankerCachePreferred: typeof existingIndex.rerankerCacheDir === 'string' && existingIndex.rerankerCacheDir.trim()
      ? path.resolve(expandHome(existingIndex.rerankerCacheDir))
      : layout.dirs.cache,
    memoryBackend: typeof existingMemory.backend === 'string' && existingMemory.backend.trim()
      ? existingMemory.backend.trim()
      : 'auto',
    memoryDbPath: typeof existingMemory.dbPath === 'string' && existingMemory.dbPath.trim()
      ? path.resolve(expandHome(existingMemory.dbPath))
      : defaultMemoryDbPath
  };
}

function resolveModelCacheDirs(preferredEmbedDir, preferredRerankerDir) {
  // Extract only needed vars — avoids CodeQL CWE-532 (clear-text logging of env)
  const safeEnv = { HOME: process.env.HOME || '', USER: process.env.USER || '', USERNAME: process.env.USERNAME || '' };
  const embed = resolveWritableModelCacheDir({
    preferredDir: preferredEmbedDir,
    synapseHome,
    env: safeEnv
  });
  const reranker = resolveWritableModelCacheDir({
    preferredDir: preferredRerankerDir,
    synapseHome,
    env: safeEnv
  });

  if (embed.fallbackUsed) {
    console.log('[setup] info: embedding cache using fallback location (preferred dir not writable)');
  }
  if (reranker.fallbackUsed) {
    console.log('[setup] info: reranker cache using fallback location (preferred dir not writable)');
  }

  return {
    embeddingCacheDir: embed.path,
    rerankerCacheDir: reranker.path
  };
}

function resolveSqliteVecPreference(indexConfig) {
  if (indexConfig.backend !== 'sqlite-vec') {
    return {
      sqliteVecExtensionPath: '',
      sqliteVecInstallStatus: {
        ok: true,
        installed: false,
        source: 'not-required',
        reason: 'json backend selected'
      }
    };
  }

  const explicitPath = parseArg('sqlite-vec-extension');
  if (explicitPath) {
    return {
      sqliteVecExtensionPath: path.resolve(expandHome(explicitPath)),
      sqliteVecInstallStatus: {
        ok: true,
        installed: false,
        source: 'configured',
        reason: 'explicit path provided'
      }
    };
  }

  const skipInstall = parseBooleanArg('skip-sqlite-vec-install') ?? false;
  const installResult = ensureSqliteVecExtension({
    synapseHome,
    env: { ...homeOnlyEnv, SYNAPSE_SQLITE_VEC_SEARCH_DIRS: process.env.SYNAPSE_SQLITE_VEC_SEARCH_DIRS || '' },
    installIfMissing: !skipInstall
  });
  return {
    sqliteVecExtensionPath: installResult.ok ? installResult.path : '',
    sqliteVecInstallStatus: installResult
  };
}

function saveOutputs(roots, packageRef, indexConfig) {
  fs.mkdirSync(layout.dirs.config, { recursive: true });
  fs.mkdirSync(layout.dirs.data, { recursive: true });
  fs.mkdirSync(layout.dirs.cache, { recursive: true });
  fs.mkdirSync(layout.dirs.backups, { recursive: true });
  fs.mkdirSync(layout.dirs.vendor, { recursive: true });
  const config = {
    name: 'synapse',
    version: 4,
    updatedAt: new Date().toISOString(),
    roots,
    index: {
      backend: indexConfig.backend,
      dbPath: indexConfig.dbPath,
      indexPath: indexConfig.indexPath,
      chunkLines: indexConfig.chunkLines,
      chunkOverlap: indexConfig.chunkOverlap,
      maxTermsPerChunk: indexConfig.maxTermsPerChunk,
      maxIndexedFiles: indexConfig.maxIndexedFiles,
      sqliteVecExtensionPath: indexConfig.sqliteVecExtensionPath || '',
      embeddingProvider: indexConfig.embedding.provider,
      embeddingModel: indexConfig.embedding.model,
      embeddingCacheDir: indexConfig.embedding.cacheDir,
      embeddingDimensions: indexConfig.embedding.dimensions,
      rerankerProvider: indexConfig.reranker.provider,
      rerankerModel: indexConfig.reranker.model,
      rerankerCacheDir: indexConfig.reranker.cacheDir
    },
    memory: {
      enabled: indexConfig.memory.enabled,
      backend: indexConfig.memory.backend,
      dbPath: indexConfig.memory.dbPath,
      autoCapture: indexConfig.memory.autoCapture,
      askForConsentDone: true
    }
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  fs.writeFileSync(snippetPath, `${JSON.stringify(buildClientSnippet(packageRef, indexConfig), null, 2)}\n`, 'utf8');
}

function installClientConfigs(packageRef, indexConfig) {
  const snippet = buildClientSnippet(packageRef, indexConfig);
  const serverConfig = snippet.mcpServers.synapse;
  return installSynapseIntoDetectedClients({
    serverConfig,
    backupDir: layout.dirs.backups
  });
}

async function warmupModels(indexConfig) {
  const { EmbeddingService, RerankerService } = await import('../../src/services/retrieval/index.js');

  if (indexConfig?.embedding?.provider && indexConfig.embedding.provider !== 'none') {
    const embedSpinner = ora('Warming up embedding model (first run downloads ~90MB)…').start();
    try {
      const embedding = new EmbeddingService({
        provider: indexConfig.embedding.provider,
        model: indexConfig.embedding.model,
        cacheDir: indexConfig.embedding.cacheDir
      });
      await embedding.embed('synapse embedding warmup');
      embedSpinner.succeed('Embedding model ready');
    } catch (error) {
      embedSpinner.warn(`Embedding warmup failed: ${error?.message || error}`);
    }
  }

  if (indexConfig?.reranker?.provider && indexConfig.reranker.provider !== 'none') {
    const rerankSpinner = ora('Warming up reranker model…').start();
    try {
      const reranker = new RerankerService({
        provider: indexConfig.reranker.provider,
        model: indexConfig.reranker.model,
        cacheDir: indexConfig.reranker.cacheDir
      });
      await reranker.score('warmup query', 'warmup candidate');
      rerankSpinner.succeed('Reranker model ready');
    } catch (error) {
      rerankSpinner.warn(`Reranker warmup failed: ${error?.message || error}`);
    }
  }
}

function printSuccess(packageRef, indexConfig) {
  const launch = resolveLaunchPreference(packageRef);
  const clientInstall = installClientConfigs(packageRef, indexConfig);
  const verbose = argv.includes('--verbose') || argv.includes('-v');

  console.log('');
  console.log(box.top(60));
  console.log(box.row(c.bold('Synapse Setup Complete ✓'), 60));
  console.log(box.divider(60));
  console.log(box.row(`Launcher: ${launch.command}${launch.args.length ? ' ' + launch.args.join(' ') : ''}`, 60));
  console.log(box.row(`Backend:  ${indexConfig.backend}`, 60));
  console.log(box.row(`Config:   ${configPath}`, 60));

  if (clientInstall.installed.length > 0) {
    console.log(box.divider(60));
    console.log(box.row('Auto-installed into:', 60));
    for (const result of clientInstall.installed) {
      console.log(box.row(`  ${symbol.ok()} ${result.tool}: ${result.status}`, 60));
    }
  }
  console.log(box.bottom(60));
  console.log('');

  if (clientInstall.unsupported.length > 0) {
    console.log(c.yellow('Detected but not auto-configured:'));
    for (const item of clientInstall.unsupported) {
      console.log(`  ${symbol.warn()} ${item.label}: ${item.reason}`);
    }
    console.log('');
  }

  console.log(rule('Next steps'));
  console.log('1) Restart AI tools that were updated above');

  if (verbose) {
    console.log('2) Client configuration snippet:');
    const preferredSnippet = buildClientSnippet(packageRef, indexConfig);
    console.log('');
    console.log(JSON.stringify(preferredSnippet, null, 2));
    console.log('');
    console.log('3) Global only (if installed):');
    console.log(JSON.stringify(buildGlobalClientSnippet(indexConfig), null, 2));
  } else {
    console.log(`2) If your tool was not updated, run with ${c.cyan('--verbose')} to see config snippets.`);
  }

  console.log('');
  console.log('Try: synapse doctor');
  console.log(rule());
}

async function main() {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Synapse setup');
    console.log('');
    console.log('Usage:');
    console.log('  synapse setup');
    console.log('  synapse setup --paths="/abs/path1,/abs/path2"');
    console.log('  synapse setup --roots-json=\'[{"label":"repo","path":"/abs/repo"}]\'');
    console.log('  synapse setup --package="synapse"');
    console.log('  synapse setup --skip-model-download=true');
    console.log('  synapse setup --skip-sqlite-vec-install=true');
    console.log('  synapse setup --sqlite-vec-extension="/abs/path/to/vec0.so"');
    console.log('  synapse setup --index-backend=sqlite-vec');
    console.log('  synapse setup --memory-db-path="/abs/path/to/memory.db"');
    console.log('');
    console.log('Memory, SQLite backend, and knowledge graph are always enabled.');
    console.log('Roots are auto-detected from ~/projects, ~/code, ~/workspace, and cwd.');
    return;
  }

  // Extract package ref to a literal default — CodeQL CWE-532 taint break
  const envPkg = process.env.SYNAPSE_NPX_PACKAGE;
  const packageRef = parseArg('package') || (typeof envPkg === 'string' && envPkg.length > 0 ? envPkg.replace(/[^a-zA-Z0-9@/._-]/g, '') : 'synapse');
  const existingConfig = readExistingConfig();
  const existingDefaults = buildExistingDefaults(existingConfig);
  const preflight = runPreflightChecks();
  if (preflight.errors.length > 0) {
    for (const err of preflight.errors) {
      console.error(`${symbol.fail()} ${c.red(err)}`);
    }
    process.exit(1);
  }
  for (const warning of preflight.warnings) {
    console.error(`${symbol.warn()} ${c.yellow(warning)}`);
  }

  // Resolve roots: explicit args > existing config > auto-detected > cwd fallback
  let roots;
  const rootsJsonArg = parseArg('roots-json');
  const pathsArg = parseArg('paths');
  if (rootsJsonArg) {
    roots = parseRootsFromJsonArg(rootsJsonArg);
    if (roots.length === 0) throw new Error('No valid directories provided in --roots-json');
  } else if (pathsArg) {
    roots = parseRootsFromPathsArg(pathsArg);
    if (roots.length === 0) throw new Error('No valid directories provided in --paths');
  } else {
    roots = [...existingDefaults.roots];
    if (roots.length === 0) {
      const suggestions = collectSuggestions();
      roots = suggestions.map((s, i) => ({ label: toLabel(s, `root${i + 1}`), path: s }));
      if (roots.length > 0) {
        process.stdout.write(`[setup] auto-detected ${roots.length} root(s): ${roots.map((r) => r.path).join(', ')}\n`);
      }
    }
    if (roots.length === 0) {
      process.stdout.write(`[setup] no roots found — using current directory: ${cwd}\n`);
      roots = [{ label: toLabel(cwd, 'cwd'), path: cwd }];
    }
  }

  // Index backend — always prefer sqlite-vec, fall back to json on Node < 22
  const requestedBackend = parseArg('index-backend') || 'sqlite-vec';
  const dbPath = path.resolve(expandHome(parseArg('db-path') || existingDefaults.dbPath));
  const indexPath = path.resolve(expandHome(parseArg('index-path') || existingDefaults.indexPath));
  const chunkLines = parseIntegerArg('chunk-lines', existingDefaults.chunkLines);
  const chunkOverlap = parseIntegerArg('chunk-overlap', existingDefaults.chunkOverlap);
  const maxTermsPerChunk = parseIntegerArg('max-terms-per-chunk', existingDefaults.maxTermsPerChunk);
  const maxIndexedFiles = parseIntegerArg('max-indexed-files', existingDefaults.maxIndexedFiles);
  const skipModelDownload = parseBooleanArg('skip-model-download') ?? false;
  const { embeddingCacheDir, rerankerCacheDir } = resolveModelCacheDirs(
    existingDefaults.embedCachePreferred,
    existingDefaults.rerankerCachePreferred
  );

  // Memory — always enabled; power users can override via CLI arg only
  const requestedMemoryEnabled = parseBooleanArg('memory-enabled') ?? true;
  const memoryBackend = parseArg('memory-backend') || existingDefaults.memoryBackend;
  const memoryDbPath = path.resolve(expandHome(parseArg('memory-db-path') || existingDefaults.memoryDbPath));

  const compatibility = resolveCompatibleSetupOptions({
    backend: requestedBackend,
    memoryEnabled: requestedMemoryEnabled
  });
  for (const warning of compatibility.warnings) {
    process.stderr.write(`[setup] warning: ${warning}\n`);
  }
  const backend = compatibility.backend;
  const memoryEnabled = compatibility.memoryEnabled;
  const { sqliteVecExtensionPath, sqliteVecInstallStatus } = resolveSqliteVecPreference({ backend });

  const indexConfig = {
    backend,
    dbPath,
    indexPath,
    chunkLines,
    chunkOverlap,
    maxTermsPerChunk,
    maxIndexedFiles,
    sqliteVecExtensionPath,
    embedding: {
      provider: existingDefaults.embeddingProvider,
      model: existingDefaults.embeddingModel,
      cacheDir: embeddingCacheDir,
      dimensions: existingDefaults.embeddingDimensions
    },
    reranker: {
      provider: existingDefaults.rerankerProvider,
      model: existingDefaults.rerankerModel,
      cacheDir: rerankerCacheDir
    },
    memory: {
      enabled: memoryEnabled,
      backend: memoryBackend,
      dbPath: memoryDbPath,
      autoCapture: memoryEnabled,
      askForConsentDone: true
    }
  };

  saveOutputs(roots, packageRef, indexConfig);
  printSuccess(packageRef, indexConfig);
  if (backend === 'sqlite-vec' && !sqliteVecInstallStatus.ok) {
    process.stderr.write(`[setup] warning: sqlite-vec native extension missing: ${sqliteVecInstallStatus.reason || 'unknown reason'}\n`);
  }
  if (!skipModelDownload) {
    await warmupModels(indexConfig);
  }
}

main().catch((error) => {
  console.error('[synapse-setup] fatal:', error?.message || error);
  process.exit(1);
});
