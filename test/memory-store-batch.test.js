import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/core/engine/memory.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-mem-batch-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch {
    // No supported backend available in this runtime.
  }
  return false;
}

function createStore(root) {
  return new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });
}

function makeMemories(count, offset = 0, overrides = {}) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + offset;
    items.push({
      kind: 'knowledge',
      title: `Batch item ${idx}`,
      content: `Unique batch content row ${idx} with enough length to satisfy validation checks and fingerprinting requirements.`,
      importance: 50,
      confidence: 0.7,
      scope: { project_path: '/tmp/batch-project' },
      ...overrides
    });
  }
  return items;
}

test('storeEntryBatch: happy path inserts 50 fresh memories', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const result = await store.storeEntryBatch({ memories: makeMemories(50) });

  assert.equal(result.created, 50, 'expected 50 fresh inserts');
  assert.equal(result.duplicates, 0, 'expected zero duplicates on first pass');
  assert.deepEqual(result.errors, [], 'expected no validation errors');
  assert.equal(result.ids, undefined, 'minimal response must omit ids');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: re-submitting the same 50 memories counts as 50 duplicates via fingerprint', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const batch = makeMemories(50);
  const first = await store.storeEntryBatch({ memories: batch });
  assert.equal(first.created, 50);

  const second = await store.storeEntryBatch({ memories: batch });
  assert.equal(second.created, 0, 'expected zero new rows on second pass');
  assert.equal(second.duplicates, 50, 'expected fingerprint dedup to catch all 50');
  assert.deepEqual(second.errors, []);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: partial dedup — 20 new + 5 existing returns created=20, duplicates=5', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const originals = makeMemories(5);
  const first = await store.storeEntryBatch({ memories: originals });
  assert.equal(first.created, 5);

  // New batch: the 5 originals + 20 fresh items
  const freshItems = makeMemories(20, 100);
  const mixedBatch = [...originals, ...freshItems];
  assert.equal(mixedBatch.length, 25);

  const second = await store.storeEntryBatch({ memories: mixedBatch });
  assert.equal(second.created, 20, 'expected 20 fresh items to insert');
  assert.equal(second.duplicates, 5, 'expected 5 duplicates from originals');
  assert.deepEqual(second.errors, []);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: verbose response_format returns ids array (new + existing)', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const originals = makeMemories(5);
  await store.storeEntryBatch({ memories: originals });

  const mixedBatch = [...originals, ...makeMemories(20, 200)];
  const result = await store.storeEntryBatch({
    memories: mixedBatch,
    response_format: 'verbose'
  });

  assert.equal(result.created, 20);
  assert.equal(result.duplicates, 5);
  assert.ok(Array.isArray(result.ids), 'verbose response must include ids array');
  assert.equal(result.ids.length, 25, 'ids array must match input length');
  for (const id of result.ids) {
    assert.ok(id && typeof id === 'string', 'every id must be a non-empty string');
    assert.match(id, /^mem_/, 'expected mem_ prefix on ids');
  }

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: oversized batch (> 100) throws MAX_BATCH_SIZE_EXCEEDED and inserts nothing', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  await store.init();
  const before = await store.adapter.get('SELECT COUNT(*) AS c FROM memory_entries');
  const beforeCount = before?.c || 0;

  const oversized = makeMemories(101);
  await assert.rejects(
    () => store.storeEntryBatch({ memories: oversized }),
    (err) => err?.code === 'MAX_BATCH_SIZE_EXCEEDED'
  );

  const after = await store.adapter.get('SELECT COUNT(*) AS c FROM memory_entries');
  assert.equal(after.c, beforeCount, 'no rows should be inserted for oversized batch');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: per-item validation failure reports row index while rest insert', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const good = makeMemories(4);
  // Insert a bad row at index 2 (missing content)
  const batch = [
    good[0],
    good[1],
    { kind: 'knowledge', title: 'No content here', content: '', scope: { project_path: '/tmp/batch-project' } },
    good[2],
    good[3]
  ];

  const result = await store.storeEntryBatch({ memories: batch });
  assert.equal(result.created, 4, 'expected 4 valid rows to insert');
  assert.equal(result.duplicates, 0);
  assert.equal(result.errors.length, 1, 'expected exactly one validation error');
  assert.equal(result.errors[0].index, 2, 'error index should match bad row position');
  assert.ok(result.errors[0].message, 'error message must be present');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: nest and branch pass-through regression (quick-260409-pdf guard)', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const batch = makeMemories(10, 300).map((item) => ({
    ...item,
    nest: 'synapse',
    branch: 'release/0.2.0'
  }));

  const result = await store.storeEntryBatch({
    memories: batch,
    response_format: 'verbose'
  });

  assert.equal(result.created, 10);
  assert.equal(result.ids.length, 10);

  for (const id of result.ids) {
    const entry = await store.getEntry(id);
    assert.ok(entry, `expected entry ${id} to exist`);
    assert.equal(entry.nest, 'synapse', 'explicit nest must land verbatim');
    assert.equal(entry.branch, 'release/0.2.0', 'explicit branch must land verbatim');
  }

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: unexpected adapter error during insert rolls back entire batch', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);
  await store.init();

  const before = await store.adapter.get('SELECT COUNT(*) AS c FROM memory_entries');
  const beforeCount = before?.c || 0;

  const realAdapter = store.adapter;
  const originalTransaction = realAdapter.transaction.bind(realAdapter);
  let insertCount = 0;

  const wrappedAdapter = new Proxy(realAdapter, {
    get(target, prop, receiver) {
      if (prop === 'transaction') {
        return async (fn) => originalTransaction(async (ad) => {
          const innerAdapter = new Proxy(ad, {
            get(innerTarget, innerProp, innerReceiver) {
              if (innerProp === 'run') {
                return async (sql, params) => {
                  if (typeof sql === 'string' && sql.trim().startsWith('INSERT INTO memory_entries')) {
                    insertCount += 1;
                    if (insertCount === 5) {
                      throw new Error('Forced failure on 5th insert');
                    }
                  }
                  return Reflect.get(innerTarget, innerProp, innerReceiver).call(innerTarget, sql, params);
                };
              }
              return Reflect.get(innerTarget, innerProp, innerReceiver);
            }
          });
          return fn(innerAdapter);
        });
      }
      return Reflect.get(target, prop, receiver);
    }
  });

  store.adapter = wrappedAdapter;

  const batch = makeMemories(10, 400);
  await assert.rejects(
    () => store.storeEntryBatch({ memories: batch }),
    /Forced failure on 5th insert/
  );

  // Restore real adapter and verify no partial inserts survived
  store.adapter = realAdapter;
  const after = await store.adapter.get('SELECT COUNT(*) AS c FROM memory_entries');
  assert.equal(after.c, beforeCount, 'rollback must leave memory_entries unchanged');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntryBatch: listEntries total_count matches created count', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const batch = makeMemories(15, 500);
  const result = await store.storeEntryBatch({ memories: batch });
  assert.equal(result.created, 15);

  const listed = await store.listEntries({ projectPath: '/tmp/batch-project', limit: 200 });
  assert.equal(listed.total_count, 15, 'listEntries must see all newly inserted rows');
  assert.equal(listed.items.length, 15);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
