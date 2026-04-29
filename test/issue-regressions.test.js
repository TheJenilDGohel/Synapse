import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SearchService, VectorIndexService, unifiedFind } from '../src/core/engine/retrieval.js';
import { MemoryStore, MemoryWorkflowService } from '../src/core/engine/memory.js';
import { toMinimalWriteResponse } from '../src/interfaces/mcp/common/terse-utils.js';
import { IGNORE_DIRS } from '../src/core/runtime/config.js';
import { normalizeUpdateStatus } from '../src/interfaces/mcp/common/normalizers/update.js';
import { agentPrime } from '../src/core/engine/memory/workflow/agent-prime.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-issue-regression-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    return Boolean(mod?.DatabaseSync);
  } catch {
    return false;
  }
}

function createStore(root) {
  return new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });
}

test('toMinimalWriteResponse uses memory_id for terse teach-style responses', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ memory_id: 'mem-123', kind: 'feedback' }, 'minimal'),
    { id: 'mem-123', ok: true }
  );
});

test('unifiedFind allows single-character queries (no length suppression)', async () => {
  const result = await unifiedFind(
    { query: 'a', limit: 10 },
    {
      memory: {
        recall: async () => ({ items: [{ score: 1, memory: { id: 'm1', title: 'alpha', summary: 'alpha', kind: 'knowledge' } }] }),
        searchTriples: async () => ({ items: [{ score: 1, triple_id: 't1', subject: 'alpha', predicate: 'uses', object: 'beta' }] })
      },
      search: {
        searchHybrid: async () => ({ results: [{ file: 'a.ts', start_line: 1, end_line: 1, final_score: 1 }] })
      }
    }
  );
  // It should now find results instead of returning 0
  assert.ok(result.count > 0);
});

test('SearchService falls back to regex symbol lookup when symbol index is empty', () => {
  const root = makeTempDir();
  const defs = path.join(root, 'defs.ts');
  const use = path.join(root, 'use.ts');
  fs.writeFileSync(defs, 'export function AuthService() { return true; }\n', 'utf8');
  fs.writeFileSync(use, 'const ok = AuthService();\n', 'utf8');

  const workspace = {
    resolveSearchBases: () => [root],
    normalizeTarget: (p) => p,
    *walkDirectories(base) {
      yield { files: [path.join(base, 'defs.ts'), path.join(base, 'use.ts')] };
    },
    isLikelyTextFile: () => true,
    safeReadText: (p) => fs.readFileSync(p, 'utf8')
  };

  const service = new SearchService({
    workspace,
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 10000,
    vectorIndex: null,
    symbolIndex: {
      findCallers: () => ({ symbol: 'AuthService', count: 0, callers: [] }),
      findDefinition: () => ({ symbol: 'AuthService', count: 0, definitions: [] }),
      findImplementations: () => ({ symbol: 'AuthService', count: 0, implementations: [] }),
      renamePreview: () => ({ old_name: 'AuthService', new_name: 'AuthClient', total_changes: 0, files_affected: 0, changes: [] })
    }
  });

  const definition = service.findDefinitionSymbol({ symbol: 'AuthService', projectPath: root });
  assert.ok(definition.count >= 1);
  assert.ok(definition.definitions.some((item) => item.file.endsWith('defs.ts')));

  const callers = service.findCallersSymbol({ symbol: 'AuthService', projectPath: root });
  assert.ok(callers.count >= 1);
  assert.ok(callers.callers.some((item) => item.file.endsWith('use.ts')));

  const rename = service.renamePreviewSymbol({ oldName: 'AuthService', newName: 'AuthClient', projectPath: root });
  assert.ok(rename.total_changes >= 1);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('IGNORE_DIRS includes common cache and build directories', () => {
  assert.equal(IGNORE_DIRS.has('node_modules'), true);
  assert.equal(IGNORE_DIRS.has('.git'), true);
});

test('VectorIndexService reports cold_start instead of looking broken before first index build', () => {
  const root = makeTempDir();
  const service = new VectorIndexService({
    workspace: {
      resolveSearchBases: () => [root],
      normalizeTarget: (p) => p,
      *walkDirectories() {
        yield { files: [] };
      },
      isLikelyTextFile: () => true,
      safeReadText: () => ''
    },
    indexPath: path.join(root, 'index.json'),
    chunkLines: 50,
    chunkOverlap: 10,
    maxTermsPerChunk: 80,
    maxIndexedFiles: 100,
    embeddingService: null,
    astChunker: null
  });

  const status = service.getStatus();
  assert.equal(status.state, 'cold_start');
  assert.equal(status.cold_start, true);
});

test('memory recall returns empty for gibberish queries instead of unrelated matches', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  await store.storeEntry({
    title: 'Authentication flow',
    summary: 'Login and signup decisions',
    content: 'OAuth and session handling details',
    kind: 'knowledge',
    importance: 70
  });

  const result = await store.recall({ query: 'zzzxqvplmnonexistent', limit: 10 });
  assert.equal(result.count, 0);
  assert.deepStrictEqual(result.items, []);

  try { await store.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('memory related throws for unknown memory ids', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);
  await store.init();

  await assert.rejects(
    () => store.getRelated('missing-memory'),
    /memory not found: missing-memory/
  );

  try { await store.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('kg as-of rejects invalid dates instead of silently returning all triples', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  await store.addTriple({
    subjectName: 'alpha',
    predicate: 'uses',
    objectName: 'beta'
  });

  await assert.rejects(
    () => store.queryTriplesAsOf('alpha', 'definitely-not-a-date'),
    /Invalid as_of date/
  );

  try { await store.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('queryEntityRelationships distinguishes missing entities from empty graphs', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);
  await store.init();

  const result = await store.queryEntityRelationships('missing-entity', {});
  assert.equal(result.entity_found, false);
  assert.match(result.suggestion, /synapse_kg_list_entities/);
  assert.equal(result.count, 0);

  try { await store.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('kg list entities supports fuzzy discovery', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  await store.addEntity({ name: 'Authentication Service', type: 'concept' });
  await store.addEntity({ name: 'Billing Service', type: 'concept' });

  const result = await store.listEntities({ nameContains: 'auth', limit: 10, offset: 0 });
  assert.equal(result.count, 1);
  assert.equal(result.items[0].id, 'authentication_service');

  try { await store.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('captureOutcome zero-arg flow produces a session marker', async () => {
  let received = null;
  const service = new MemoryWorkflowService({
    memory: {
      getStatus: async () => ({
        enabled: true,
        auto_capture: true,
        consent_done: true,
        backend: { available: true, requested: 'auto', selected: 'node-sqlite' },
        store: { total_entries: 2, total_events: 5 }
      }),
      captureEvent: async (input) => {
        received = input;
        return { event_id: 1, status: 'promoted', promoted_memory_id: 'm1', event_type: input.event_type };
      }
    }
  });

  const result = await service.captureOutcome({});
  assert.equal(result.captured, true);
  assert.equal(received.title, 'Session completed');
  assert.match(received.summary, /2 memories and 5 recorded events/);
});

test('normalizeUpdateStatus surfaces stale cache guidance', () => {
  const result = normalizeUpdateStatus({
    update_channel: 'stable',
    current_version: '0.1.0',
    latest_version: '0.1.0',
    stale: true,
    checked_age_minutes: 1440
  });

  assert.equal(result.stale, true);
  assert.match(result.stale_warning, /Run synapse_update_status to refresh/);
});

test('agentPrime includes warnings when index services are cold', async () => {
  const result = await agentPrime(
    {
      memory: {
        recall: async () => ({ items: [] }),
        store: { adapter: null, init: async () => ({}) }
      },
      search: { searchHybrid: async () => ({ results: [] }) },
      vectorIndex: {
        getStatus: () => ({
          embedding: { enabled: true, available: false },
          ast_chunking: { active_languages: [], missing_dependencies: ['tree-sitter-typescript'], fallback_languages: ['typescript'] }
        })
      }
    },
    { task: 'inspect auth flow' }
  );

  assert.ok(result.warnings.length >= 2);
  assert.ok(result.suggested_actions.some((item) => /synapse_index_project/.test(item)));
});
