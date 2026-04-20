import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/services/memory/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-kg-batch-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch {
    // Ignore and treat memory store as unavailable on this runtime.
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

test('addEntityBatch with 100 entities — all created, no duplicates, no errors, ids omitted by default', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const entities = Array.from({ length: 100 }, (_, i) => ({
    name: `batch_entity_${i}`,
    type: 'concept',
    properties: { idx: i }
  }));

  const summary = await store.addEntityBatch({ entities });

  assert.equal(summary.created, 100);
  assert.equal(summary.duplicates, 0);
  assert.deepEqual(summary.errors, []);
  assert.equal(summary.ids, undefined, 'ids array must be omitted by default');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addEntityBatch re-run with same payload — all duplicates via INSERT OR IGNORE', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const entities = Array.from({ length: 100 }, (_, i) => ({
    name: `dup_entity_${i}`,
    type: 'concept'
  }));

  const first = await store.addEntityBatch({ entities });
  assert.equal(first.created, 100);

  const second = await store.addEntityBatch({ entities });
  assert.equal(second.created, 0);
  assert.equal(second.duplicates, 100);
  assert.deepEqual(second.errors, []);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addEntityBatch with response_format: verbose returns ids[] of length 100', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const entities = Array.from({ length: 100 }, (_, i) => ({
    name: `verbose_entity_${i}`,
    type: 'concept'
  }));

  const summary = await store.addEntityBatch({ entities, response_format: 'verbose' });

  assert.equal(summary.created, 100);
  assert.ok(Array.isArray(summary.ids), 'ids must be array when response_format === verbose');
  assert.equal(summary.ids.length, 100);
  for (const id of summary.ids) {
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  }

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addEntityBatch with 501 entities throws MAX_BATCH_SIZE_EXCEEDED and inserts nothing', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const entities = Array.from({ length: 501 }, (_, i) => ({
    name: `oversized_entity_${i}`
  }));

  let caught;
  try {
    await store.addEntityBatch({ entities });
  } catch (err) {
    caught = err;
  }

  assert.ok(caught, 'expected addEntityBatch to throw');
  assert.equal(caught.code, 'MAX_BATCH_SIZE_EXCEEDED');
  assert.match(caught.message, /exceeds maximum/);

  // Confirm no rows inserted — call a small valid batch to init then query stats
  const stats = await store.getKgStats();
  assert.equal(stats.entities, 0);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addEntityBatch with one row missing name — errors[] populated, rest inserted', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const entities = [
    { name: 'valid_one' },
    { name: '' }, // missing/empty name — validation failure
    { name: 'valid_three' }
  ];

  const summary = await store.addEntityBatch({ entities });

  assert.equal(summary.created, 2);
  assert.equal(summary.duplicates, 0);
  assert.equal(summary.errors.length, 1);
  assert.equal(summary.errors[0].index, 1);
  assert.match(summary.errors[0].message, /name/i);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addTripleBatch with 50 fresh triples — all created', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const triples = Array.from({ length: 50 }, (_, i) => ({
    subjectName: `actor_${i}`,
    predicate: 'uses',
    objectName: `tool_${i}`
  }));

  const summary = await store.addTripleBatch({ triples });

  assert.equal(summary.created, 50);
  assert.equal(summary.duplicates, 0);
  assert.deepEqual(summary.errors, []);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addTripleBatch dedup: 25 new + 25 pre-existing yields 25 created / 25 duplicates', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  // Seed 25 existing triples
  const seed = Array.from({ length: 25 }, (_, i) => ({
    subjectName: `seed_actor_${i}`,
    predicate: 'depends_on',
    objectName: `seed_dep_${i}`
  }));
  const seedSummary = await store.addTripleBatch({ triples: seed });
  assert.equal(seedSummary.created, 25);

  // Now insert same 25 + 25 new
  const mixed = [
    ...seed, // duplicates
    ...Array.from({ length: 25 }, (_, i) => ({
      subjectName: `new_actor_${i}`,
      predicate: 'depends_on',
      objectName: `new_dep_${i}`
    }))
  ];

  const summary = await store.addTripleBatch({ triples: mixed });
  assert.equal(summary.created, 25);
  assert.equal(summary.duplicates, 25);
  assert.deepEqual(summary.errors, []);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addTripleBatch rollback: stubbed adapter.run rejects mid-batch, entire batch rolled back', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  // Force init and capture raw adapter
  await store.init();
  const realAdapter = store.adapter;

  // Count INSERT INTO kg_triples calls; reject on the 3rd insert
  let insertCount = 0;
  const wrapped = {
    exec: (...args) => realAdapter.exec(...args),
    get: (...args) => realAdapter.get(...args),
    all: (...args) => realAdapter.all(...args),
    transaction: (fn) => realAdapter.transaction(async (ad) => {
      // Forward the wrapper so nested calls still honor the stub
      const nestedWrap = {
        exec: (...args) => ad.exec(...args),
        get: (...args) => ad.get(...args),
        all: (...args) => ad.all(...args),
        transaction: (fn2) => ad.transaction(fn2),
        run: async (sql, params) => {
          if (typeof sql === 'string' && sql.includes('INSERT INTO kg_triples')) {
            insertCount += 1;
            if (insertCount === 3) {
              throw new Error('simulated DB failure mid-batch');
            }
          }
          return ad.run(sql, params);
        }
      };
      return fn(nestedWrap);
    }),
    run: (...args) => realAdapter.run(...args)
  };

  // Swap adapter for this one call
  store.adapter = wrapped;

  const triples = Array.from({ length: 5 }, (_, i) => ({
    subjectName: `rb_actor_${i}`,
    predicate: 'uses',
    objectName: `rb_tool_${i}`
  }));

  let caught;
  try {
    await store.addTripleBatch({ triples });
  } catch (err) {
    caught = err;
  }

  assert.ok(caught, 'expected addTripleBatch to rethrow');
  assert.match(caught.message, /simulated DB failure/);

  // Restore adapter and verify no triples persisted
  store.adapter = realAdapter;
  const stats = await store.getKgStats();
  assert.equal(stats.triples, 0, 'transaction must have rolled back — no triples persisted');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('addTripleBatch with one row missing predicate — error collected, rest inserted', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const triples = [
    { subjectName: 'a', predicate: 'likes', objectName: 'b' },
    { subjectName: 'c', predicate: '', objectName: 'd' }, // missing predicate
    { subjectName: 'e', predicate: 'likes', objectName: 'f' }
  ];

  const summary = await store.addTripleBatch({ triples });

  assert.equal(summary.created, 2);
  assert.equal(summary.duplicates, 0);
  assert.equal(summary.errors.length, 1);
  assert.equal(summary.errors[0].index, 1);
  assert.match(summary.errors[0].message, /predicate/i);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BATCH-06: single addTriple without valid_from auto-stamps and is findable via queryTriplesAsOf', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  await store.addEntity({ name: 'alpha' });
  await store.addEntity({ name: 'beta' });

  const result = await store.addTriple({
    subjectName: 'alpha',
    predicate: 'connects_to',
    objectName: 'beta'
  });

  assert.ok(result.valid_from, 'valid_from must be auto-stamped');
  assert.match(result.valid_from, /^\d{4}-\d{2}-\d{2}T/, 'valid_from must be an ISO string');

  // Query slightly in the future — the triple must be visible
  const future = new Date(Date.now() + 1000).toISOString();
  const asOf = await store.queryTriplesAsOf('alpha', future);
  assert.ok(asOf.count >= 1, 'auto-stamped triple must be findable via queryTriplesAsOf');
  const found = asOf.triples.find((t) => t.id === result.id);
  assert.ok(found, 'our triple must be in the as-of results');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BATCH-06 backwards compat: addTriple with explicit valid_from: null stays null', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const result = await store.addTriple({
    subjectName: 'gamma',
    predicate: 'connects_to',
    objectName: 'delta',
    validFrom: null
  });

  assert.equal(result.valid_from, null, 'explicit null valid_from must survive');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
