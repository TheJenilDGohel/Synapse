import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerStatusBuilder } from '../src/interfaces/mcp/index.js';

test('server status exposes cache diagnostics from runtime config', async () => {
  const buildServerStatus = createServerStatusBuilder({
    serverName: 'synapse',
    serverVersion: 'test',
    runtime: {
      mcpMode: 'stdio',
      hasRipgrep: true,
      indexSweepIntervalMinutes: 0,
      autoProjectSplit: true,
      maxAutoProjects: 10,
      forceSplitChildren: false,
      rgTimeoutMs: 15000,
      indexBackend: 'sqlite-vec',
      vectorIndexPath: '/tmp/synapse.index.json',
      sqliteDbPath: '/tmp/synapse.db',
      vectorChunkLines: 60,
      vectorChunkOverlap: 15,
      vectorMaxTermsPerChunk: 80,
      vectorMaxIndexedFiles: 20000,
      embeddingProvider: 'huggingface',
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingCacheDir: '/tmp/fallback-cache',
      embeddingCacheStatus: {
        path: '/tmp/fallback-cache',
        preferredPath: '/home/test/.synapse/cache',
        writable: true,
        fallbackUsed: true
      },
      embeddingDimensions: 384,
      rerankerProvider: 'huggingface',
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
      rerankerCacheDir: '/tmp/fallback-cache',
      rerankerCacheStatus: {
        path: '/tmp/fallback-cache',
        preferredPath: '/home/test/.synapse/cache',
        writable: true,
        fallbackUsed: true
      }
    },
    workspace: {
      listRoots: () => [{ label: 'root', path: '/tmp/root' }]
    },
    memory: {
      getStatus: async () => ({
        enabled: true,
        auto_capture: true,
        consent_done: true,
        backend: { available: true, requested: 'auto', selected: 'node-sqlite' },
        store: { total_entries: 1, total_events: 2 }
      })
    },
    updates: {
      getStatus: async () => ({
        current_version: '0.0.4-beta.6',
        latest_version: '0.0.4-beta.6',
        is_outdated: false,
        recommendation: 'up_to_date',
        can_attempt_update: false,
        using_cached_data: true
      })
    },
    getActiveIndexBackend: () => 'sqlite-vec',
    vectorIndex: {
      getStatus: () => ({ upgrade_recommended: false, upgrade_reason: null })
    }
  });

  const status = await buildServerStatus();
  assert.equal(status.health.overall, 'degraded');
  assert.ok(Array.isArray(status.health.issues));
  assert.equal(status.vector_index.embedding_cache_dir, '/tmp/fallback-cache');
  assert.equal(status.vector_index.embedding_cache_status.fallbackUsed, true);
  assert.equal(status.vector_index.reranker_cache_dir, '/tmp/fallback-cache');
  assert.equal(status.vector_index.reranker_cache_status.preferredPath, '/home/test/.synapse/cache');
  assert.equal(status.vector_index.diagnostics.index_sweep_interval_minutes, 0);
  assert.equal(status.health.sqlite_vec_native_ready, false);
  assert.ok(status.health.issues.includes('sqlite_vec_native_missing'));
  assert.equal(status.vector_index.diagnostics.sqlite_vec_extension_configured, false);
  assert.equal(status.updates.recommendation, 'up_to_date');
  assert.equal(status.updates.can_attempt_update, false);
  assert.equal(status.updates.using_cached_data, true);
});
