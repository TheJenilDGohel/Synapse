import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { applyConsolePolicy, buildRuntimeConfig, expandHome } from '../src/core/runtime/config.js';
import { buildSynapsePaths } from '../src/core/runtime/home-layout.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-config-test-'));
}

function captureStderr(fn) {
  const originalWrite = process.stderr.write;
  let output = '';
  process.stderr.write = ((chunk, encoding, callback) => {
    output += String(chunk);
    if (typeof encoding === 'function') encoding();
    if (typeof callback === 'function') callback();
    return true;
  });

  try {
    const result = fn();
    return { result, output };
  } finally {
    process.stderr.write = originalWrite;
  }
}

test('expandHome expands leading ~ only', () => {
  // expandHome uses os.homedir() which reads HOME on POSIX and USERPROFILE on
  // Windows. Verify the leading ~ is replaced by the actual home directory
  // and the trailing path is preserved, without hard-coding either separator.
  const home = os.homedir();
  const expanded = expandHome('~/a/b');
  assert.ok(expanded.startsWith(home), `${expanded} should start with ${home}`);
  assert.ok(expanded.endsWith('a/b') || expanded.endsWith('a\\b'), `${expanded} should end with a/b or a\\b`);
  // Non-leading ~ stays put
  assert.equal(expandHome('/abs/~keep'), '/abs/~keep');
});

test('buildRuntimeConfig prioritizes PROJECT_ROOTS and env tuning', () => {
  const rootA = makeTempDir();
  const rootB = makeTempDir();
  const synapseHome = makeTempDir();
  const cfgPath = buildSynapsePaths(synapseHome).configPath;
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify({ version: 2, roots: [{ label: 'cfg', path: rootA }] }), 'utf8');

  const runtime = buildRuntimeConfig({
    MCP_MODE: 'STDIO',
    PROJECT_ROOTS: `alpha=${rootA};beta=${rootB}`,
    SYNAPSE_CONFIG: cfgPath,
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_VECTOR_CHUNK_LINES: '120',
    SYNAPSE_VECTOR_CHUNK_OVERLAP: '20',
    SYNAPSE_VECTOR_MAX_TERMS: '90',
    SYNAPSE_VECTOR_MAX_FILES: '345',
    SYNAPSE_EXTRA_PROJECT_MARKERS: 'a.txt,b.txt',
    DISABLE_CONSOLE_OUTPUT: 'true',
    SYNAPSE_AUTO_PROJECT_SPLIT: 'false',
    SYNAPSE_FORCE_SPLIT_CHILDREN: 'true',
    SYNAPSE_RG_TIMEOUT_MS: '1234'
  });

  assert.equal(runtime.mcpMode, 'stdio');
  assert.equal(runtime.roots.length, 2);
  assert.equal(runtime.roots[0].label, 'alpha');
  assert.equal(runtime.autoProjectSplit, false);
  assert.equal(runtime.forceSplitChildren, true);
  assert.equal(runtime.disableConsoleOutput, true);
  assert.equal(runtime.rgTimeoutMs, 1234);
  assert.equal(runtime.vectorChunkLines, 120);
  assert.equal(runtime.vectorChunkOverlap, 20);
  assert.equal(runtime.vectorMaxTermsPerChunk, 90);
  assert.equal(runtime.vectorMaxIndexedFiles, 345);
  assert.equal(runtime.indexSweepIntervalMinutes, 0);
  assert.equal(runtime.memoryEnabled, false);
  assert.equal(runtime.memoryBackend, 'auto');
  assert.ok(runtime.extraProjectMarkers.has('a.txt'));

  fs.rmSync(rootA, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(rootB, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig disables background index sweeps by default in stdio mode', () => {
  const synapseHome = makeTempDir();

  const runtime = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    MCP_MODE: 'stdio'
  });

  assert.equal(runtime.indexSweepIntervalMinutes, 0);

  const overridden = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    MCP_MODE: 'stdio',
    SYNAPSE_INDEX_SWEEP_INTERVAL_MINUTES: '7'
  });

  assert.equal(overridden.indexSweepIntervalMinutes, 7);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig uses config file roots when PROJECT_ROOTS missing', () => {
  const rootA = makeTempDir();
  const synapseHome = makeTempDir();
  const cfgPath = buildSynapsePaths(synapseHome).configPath;
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(
    cfgPath,
    JSON.stringify({
      version: 3,
      roots: [{ label: 'cfg-root', path: rootA }],
      memory: {
        enabled: true,
        backend: 'auto',
        dbPath: path.join(synapseHome, 'memory.db'),
        autoCapture: true,
        askForConsentDone: true
      }
    }),
    'utf8'
  );

  const runtime = buildRuntimeConfig({
    SYNAPSE_CONFIG: cfgPath,
    SYNAPSE_HOME: synapseHome
  });
  assert.equal(runtime.roots.length, 1);
  assert.equal(runtime.roots[0].label, 'cfg-root');
  assert.equal(runtime.roots[0].path, rootA);
  assert.equal(runtime.memoryEnabled, true);
  assert.equal(runtime.memoryBackend, 'auto');
  assert.equal(runtime.memoryAutoCapture, true);
  assert.equal(runtime.memoryConsentDone, true);

  fs.rmSync(rootA, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig clamps update intervals to safe ranges', () => {
  const synapseHome = makeTempDir();
  const runtimeLow = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES: '1',
    SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES: '1'
  });
  assert.equal(runtimeLow.updateCheckIntervalMinutes, 15);
  assert.equal(runtimeLow.updateFailureBackoffMinutes, 5);

  const runtimeHigh = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES: '99999',
    SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES: '99999'
  });
  assert.equal(runtimeHigh.updateCheckIntervalMinutes, 1440);
  assert.equal(runtimeHigh.updateFailureBackoffMinutes, 240);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig migrates flat synapse home files into subdirectories', () => {
  const synapseHome = makeTempDir();
  const legacyConfig = path.join(synapseHome, 'synapse.config.json');
  fs.writeFileSync(
    legacyConfig,
    JSON.stringify({ version: 3, roots: [{ label: 'cfg-root', path: synapseHome }] }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(synapseHome, 'update-status.json'), JSON.stringify({ ok: true }), 'utf8');

  const runtime = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome
  });
  const layout = buildSynapsePaths(synapseHome);

  assert.equal(runtime.sqliteDbPath, layout.sqliteDbPath);
  assert.equal(runtime.vectorIndexPath, layout.jsonIndexPath);
  assert.equal(runtime.memoryDbPath, layout.memoryDbPath);
  assert.ok(fs.existsSync(layout.configPath));
  assert.ok(fs.existsSync(layout.updateStatusPath));
  assert.equal(fs.existsSync(legacyConfig), false);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig honors legacy SYNAPSE_CONFIG path after layout migration', () => {
  const synapseHome = makeTempDir();
  const legacyConfig = path.join(synapseHome, 'synapse.config.json');
  fs.writeFileSync(
    legacyConfig,
    JSON.stringify({ version: 3, roots: [{ label: 'cfg-root', path: synapseHome }] }, null, 2),
    'utf8'
  );

  const runtime = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_CONFIG: legacyConfig
  });
  const layout = buildSynapsePaths(synapseHome);

  assert.equal(runtime.roots[0].path, synapseHome);
  assert.ok(fs.existsSync(layout.configPath));
  assert.equal(fs.existsSync(legacyConfig), false);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('applyConsolePolicy disables common console outputs', () => {
  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn
  };

  applyConsolePolicy(true);
  assert.notEqual(console.log, original.log);
  assert.notEqual(console.info, original.info);
  assert.notEqual(console.debug, original.debug);
  assert.notEqual(console.warn, original.warn);

  console.log = original.log;
  console.info = original.info;
  console.debug = original.debug;
  console.warn = original.warn;
});

test('buildRuntimeConfig falls back to writable model cache directory', () => {
  if (process.platform === 'win32') return;

  const synapseHome = makeTempDir();
  const blocked = path.join(synapseHome, 'blocked-cache');
  fs.mkdirSync(blocked, { recursive: true });
  fs.chmodSync(blocked, 0o555);

  const runtime = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_EMBED_CACHE_DIR: blocked,
    SYNAPSE_RERANKER_CACHE_DIR: blocked
  });

  assert.notEqual(runtime.embeddingCacheDir, blocked);
  assert.notEqual(runtime.rerankerCacheDir, blocked);
  assert.equal(runtime.embeddingCacheDir, runtime.rerankerCacheDir);
  assert.equal(fs.existsSync(runtime.embeddingCacheDir), true);
  assert.equal(runtime.embeddingCacheStatus.fallbackUsed, true);
  assert.equal(runtime.rerankerCacheStatus.fallbackUsed, true);
  assert.equal(runtime.embeddingCacheStatus.preferredPath, blocked);
  assert.equal(runtime.rerankerCacheStatus.preferredPath, blocked);
  assert.ok(runtime.embeddingCacheStatus.preferredFailure);
  assert.ok(Array.isArray(runtime.embeddingCacheStatus.attemptedPaths));
  assert.ok(runtime.embeddingCacheStatus.attemptedPaths.length >= 1);

  fs.chmodSync(blocked, 0o755);
  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig uses default cache path cleanly on a fresh writable home', () => {
  const synapseHome = makeTempDir();
  const layout = buildSynapsePaths(synapseHome);

  const { result: runtime, output } = captureStderr(() => buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome
  }));

  assert.equal(runtime.embeddingCacheDir, layout.dirs.cache);
  assert.equal(runtime.rerankerCacheDir, layout.dirs.cache);
  assert.equal(runtime.embeddingCacheStatus.fallbackUsed, false);
  assert.equal(runtime.rerankerCacheStatus.fallbackUsed, false);
  assert.equal(output.includes('fallback path'), false);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig migrates legacy flat home cleanly without cache fallback noise', () => {
  const synapseHome = makeTempDir();
  const legacyConfig = path.join(synapseHome, 'synapse.config.json');
  fs.writeFileSync(
    legacyConfig,
    JSON.stringify({ version: 3, roots: [{ label: 'cfg-root', path: synapseHome }] }, null, 2),
    'utf8'
  );

  const { result: runtime, output } = captureStderr(() => buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_CONFIG: legacyConfig
  }));

  assert.equal(runtime.embeddingCacheStatus.fallbackUsed, false);
  assert.equal(runtime.rerankerCacheStatus.fallbackUsed, false);
  assert.equal(output.includes('fallback path'), false);

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('buildRuntimeConfig auto-detects sqlite-vec native extension from synapse vendor path', () => {
  const synapseHome = makeTempDir();
  const vendorDir = path.join(synapseHome, 'vendor', 'sqlite-vec', 'node_modules', 'sqlite-vec', 'dist');
  fs.mkdirSync(vendorDir, { recursive: true });
  const extensionName = process.platform === 'win32'
    ? 'vec0.dll'
    : process.platform === 'darwin'
      ? 'vec0.dylib'
      : 'vec0.so';
  const extensionPath = path.join(vendorDir, extensionName);
  fs.writeFileSync(extensionPath, 'binary', 'utf8');

  const runtime = buildRuntimeConfig({
    SYNAPSE_HOME: synapseHome,
    SYNAPSE_INDEX_BACKEND: 'sqlite-vec'
  });

  assert.equal(runtime.sqliteVecExtensionPath, extensionPath);
  assert.equal(runtime.sqliteVecExtensionSource, 'synapse-vendor');

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
