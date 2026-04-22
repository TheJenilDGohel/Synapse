import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ensureConfigUpgraded } from '../src/core/migrations/config-migrator.js';
import { buildSynapsePaths } from '../src/core/runtime/home-layout.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-migrator-test-'));
}

test('ensureConfigUpgraded handles missing/invalid config', () => {
  const root = makeTempDir();
  const missing = ensureConfigUpgraded({ configPath: path.join(root, 'missing.json'), synapseHome: root });
  assert.equal(missing.changed, false);
  assert.equal(missing.reason, 'missing');

  const invalidPath = path.join(root, 'invalid.json');
  fs.writeFileSync(invalidPath, '{not-json', 'utf8');
  const invalid = ensureConfigUpgraded({ configPath: invalidPath, synapseHome: root });
  assert.equal(invalid.changed, false);
  assert.equal(invalid.reason, 'invalid-json');

  const badShapePath = path.join(root, 'bad-shape.json');
  fs.writeFileSync(badShapePath, JSON.stringify({ roots: 'x' }), 'utf8');
  const badShape = ensureConfigUpgraded({ configPath: badShapePath, synapseHome: root });
  assert.equal(badShape.changed, false);
  assert.equal(badShape.reason, 'invalid-shape');

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('ensureConfigUpgraded migrates old config and creates backup', () => {
  const root = makeTempDir();
  const cfgPath = buildSynapsePaths(root).configPath;
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(
    cfgPath,
    JSON.stringify({ version: 1, roots: [{ label: 'x', path: root }] }, null, 2),
    'utf8'
  );

  const result = ensureConfigUpgraded({ configPath: cfgPath, synapseHome: root });
  assert.equal(result.changed, true);
  assert.equal(result.version, 4);
  assert.ok(result.backupPath);
  assert.ok(fs.existsSync(result.backupPath));

  const upgraded = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  assert.equal(upgraded.version, 4);
  assert.equal(upgraded.index.backend, 'sqlite-vec');
  assert.equal(upgraded.index.maxIndexedFiles, 20000);
  assert.equal(upgraded.index.dbPath, buildSynapsePaths(root).sqliteDbPath);
  assert.equal(upgraded.index.embeddingProvider, 'huggingface');
  assert.equal(upgraded.index.embeddingModel, 'sentence-transformers/all-MiniLM-L6-v2');
  assert.equal(upgraded.index.embeddingDimensions, 384);
  assert.equal(upgraded.index.rerankerProvider, 'huggingface');
  assert.equal(upgraded.index.rerankerModel, 'cross-encoder/ms-marco-MiniLM-L-6-v2');
  assert.equal(upgraded.memory.enabled, false);
  assert.equal(upgraded.memory.backend, 'auto');
  assert.equal(upgraded.memory.autoCapture, false);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('ensureConfigUpgraded returns up-to-date without rewrite', () => {
  const root = makeTempDir();
  const cfgPath = buildSynapsePaths(root).configPath;
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  const data = {
    version: 4,
    roots: [{ label: 'x', path: root }],
    index: {
      backend: 'sqlite-vec',
      dbPath: path.join(root, 'db.sqlite'),
      indexPath: path.join(root, 'idx.json'),
      chunkLines: 60,
      chunkOverlap: 15,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 20000,
      embeddingProvider: 'huggingface',
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingCacheDir: path.join(root, '.cache'),
      embeddingDimensions: 384,
      rerankerProvider: 'huggingface',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      rerankerCacheDir: path.join(root, '.cache')
    },
    memory: {
      enabled: true,
      backend: 'auto',
      dbPath: path.join(root, 'memory.sqlite'),
      autoCapture: true,
      askForConsentDone: true
    }
  };
  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), 'utf8');

  const result = ensureConfigUpgraded({ configPath: cfgPath, synapseHome: root });
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'up-to-date');

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
