import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMissingRequiredSetupFields,
  normalizeUpgradeConfig
} from '../src/services/update/index.js';

test('findMissingRequiredSetupFields reports required paths', () => {
  const missing = findMissingRequiredSetupFields({});
  const paths = missing.map((entry) => entry.path);
  assert(paths.includes('roots'));
  assert(paths.includes('index.backend'));
  assert(paths.includes('memory.enabled'));
});

test('normalizeUpgradeConfig merges existing values over defaults', () => {
  const defaults = {
    roots: [{ label: 'default', path: '/tmp/default' }],
    index: {
      backend: 'sqlite-vec',
      dbPath: '/tmp/synapse/data/index.sqlite3',
      indexPath: '/tmp/synapse/data/index.json',
      chunkLines: 60,
      chunkOverlap: 15,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 20000,
      embeddingProvider: 'huggingface',
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingCacheDir: '/tmp/synapse/cache',
      embeddingDimensions: 384,
      rerankerProvider: 'huggingface',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      rerankerCacheDir: '/tmp/synapse/cache'
    },
    memory: {
      enabled: false,
      backend: 'auto',
      dbPath: '/tmp/synapse/data/memory.sqlite3',
      autoCapture: false,
      askForConsentDone: false
    }
  };

  const existingConfig = {
    roots: [{ label: 'repo', path: '/work/repo' }],
    index: {
      backend: 'json',
      dbPath: '/work/index.db',
      chunkLines: 120,
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingDimensions: 384,
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2'
    },
    memory: {
      enabled: true,
      dbPath: '/work/memory.db'
    }
  };

  const merged = normalizeUpgradeConfig({ existingConfig, defaults });

  assert.equal(merged.index.backend, 'json');
  assert.equal(merged.index.dbPath, '/work/index.db');
  assert.equal(merged.index.indexPath, defaults.index.indexPath);
  assert.equal(merged.index.chunkLines, 120);
  assert.equal(merged.index.embeddingProvider, defaults.index.embeddingProvider);
  assert.equal(merged.index.embeddingModel, 'sentence-transformers/all-MiniLM-L6-v2');
  assert.equal(merged.index.embeddingDimensions, 384);
  assert.equal(merged.index.rerankerProvider, defaults.index.rerankerProvider);
  assert.equal(merged.index.rerankerModel, 'cross-encoder/ms-marco-MiniLM-L-6-v2');
  assert.equal(merged.memory.enabled, true);
  assert.equal(merged.memory.autoCapture, true);
  assert.equal(merged.memory.dbPath, '/work/memory.db');
  assert.equal(merged.memory.backend, defaults.memory.backend);
  assert.deepEqual(merged.roots, existingConfig.roots);
});

test('normalizeUpgradeConfig rewrites legacy xenova runtime settings to current defaults', () => {
  const defaults = {
    roots: [{ label: 'default', path: '/tmp/default' }],
    index: {
      backend: 'sqlite-vec',
      dbPath: '/tmp/synapse/data/index.sqlite3',
      indexPath: '/tmp/synapse/data/index.json',
      chunkLines: 60,
      chunkOverlap: 15,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 20000,
      embeddingProvider: 'huggingface',
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingCacheDir: '/tmp/synapse/cache',
      embeddingDimensions: 384,
      rerankerProvider: 'huggingface',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      rerankerCacheDir: '/tmp/synapse/cache'
    },
    memory: {
      enabled: false,
      backend: 'auto',
      dbPath: '/tmp/synapse/data/memory.sqlite3',
      autoCapture: false,
      askForConsentDone: false
    }
  };

  const merged = normalizeUpgradeConfig({
    defaults,
    existingConfig: {
      roots: [{ label: 'repo', path: '/work/repo' }],
      index: {
        embeddingProvider: 'xenova',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        rerankerProvider: 'xenova',
        rerankerModel: 'Xenova/ms-marco-MiniLM-L-6-v2'
      }
    }
  });

  assert.equal(merged.index.embeddingProvider, 'huggingface');
  assert.equal(merged.index.embeddingModel, 'sentence-transformers/all-MiniLM-L6-v2');
  assert.equal(merged.index.rerankerProvider, 'huggingface');
  assert.equal(merged.index.rerankerModel, 'cross-encoder/ms-marco-MiniLM-L-6-v2');
});
