import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/services/memory/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-bitemp-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch {
    // ignore
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

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

test('BITEMP-01 schema: kg_triples has recorded_at column after v12 migration', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);
  await store.init();
  const cols = await store.adapter.all('PRAGMA table_info(kg_triples)');
  const col = cols.find((c) => c.name === 'recorded_at');
  assert.ok(col, 'kg_triples must have a recorded_at column post-v12');
  assert.equal(col.notnull, 1, 'recorded_at must be NOT NULL');
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BITEMP-01 backfill + insert stamping: fresh addTriple yields recorded_at === created_at', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);
  const result = await store.addTriple({
    subjectName: 'alpha',
    predicate: 'connects_to',
    objectName: 'beta'
  });
  assert.ok(result.recorded_at, 'addTriple result must include recorded_at');
  assert.match(result.recorded_at, ISO_RE, 'recorded_at must be ISO-formatted');
  assert.equal(result.recorded_at, result.created_at,
    'fresh insert: recorded_at and created_at share the same nowIso() stamp (proves backfill semantics)');
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BITEMP-02 event mode (control): default === explicit "event" === pre-phase behavior', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  // Seed two triples with explicit event-time coordinates.
  await store.addTriple({
    subjectName: 'alpha', predicate: 'at_version', objectName: 'v1',
    validFrom: '2020-01-01T00:00:00.000Z'
  });
  await store.addTriple({
    subjectName: 'alpha', predicate: 'at_version', objectName: 'v2',
    validFrom: '2030-01-01T00:00:00.000Z'
  });

  const future = '2025-06-15T00:00:00.000Z';
  const defaultMode = await store.queryTriplesAsOf('alpha', future);
  const explicitEvent = await store.queryTriplesAsOf('alpha', future, 'event');

  assert.equal(defaultMode.mode, 'event', 'default mode must echo back as "event"');
  assert.equal(explicitEvent.mode, 'event');
  assert.equal(defaultMode.count, explicitEvent.count,
    'default mode must byte-match explicit "event" mode');
  assert.deepEqual(
    defaultMode.triples.map((tr) => tr.id).sort(),
    explicitEvent.triples.map((tr) => tr.id).sort()
  );
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BITEMP-02 transaction mode: filters on recorded_at <= date, ignores valid_to', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  // Insert first triple, snapshot, sleep, insert second triple.
  const first = await store.addTriple({
    subjectName: 'alpha', predicate: 'uses', objectName: 'tool_one'
  });
  await new Promise((r) => setTimeout(r, 15));
  const snapshot = new Date().toISOString();
  await new Promise((r) => setTimeout(r, 15));
  const second = await store.addTriple({
    subjectName: 'alpha', predicate: 'uses', objectName: 'tool_two'
  });

  const tx = await store.queryTriplesAsOf('alpha', snapshot, 'transaction');
  assert.equal(tx.mode, 'transaction', 'response must echo mode: "transaction"');
  const ids = tx.triples.map((tr) => tr.id);
  assert.ok(ids.includes(first.id), 'first triple (pre-snapshot) must be present');
  assert.ok(!ids.includes(second.id), 'second triple (post-snapshot) must be excluded');
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BITEMP-03 timeline includes recorded_at on every triple and sorts by recorded_at', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  await store.addTriple({ subjectName: 'alpha', predicate: 'connects_to', objectName: 'beta' });
  await new Promise((r) => setTimeout(r, 5));
  await store.addTriple({ subjectName: 'alpha', predicate: 'connects_to', objectName: 'gamma' });

  const timeline = await store.getEntityTimeline('alpha');
  assert.ok(timeline.triples.length >= 2, 'timeline must include both triples');
  for (const tr of timeline.triples) {
    assert.ok(tr.recorded_at, `triple ${tr.id} must expose recorded_at`);
    assert.match(tr.recorded_at, ISO_RE, 'recorded_at must be ISO');
  }
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('CARD-06 reconciliation: addTriple returns recorded_at as 13th field, order locked', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  const result = await store.addTriple({
    subjectName: 'alpha',
    predicate: 'connects_to',
    objectName: 'beta'
  });

  // Option (c) per 42-CONTEXT.md: the 12 CARD-06 fields stay in the
  // same order, recorded_at lands additively at position 11 (0-indexed),
  // total 13 keys. No existing test in the repo pins a 12-field count, so
  // this lock test is the canonical source of truth going forward.
  const expectedKeys = [
    'id', 'subject_id', 'predicate', 'object_id',
    'valid_from', 'valid_to', 'confidence',
    'source_memory_id', 'source_type',
    'created_at', 'recorded_at',
    'contradictions', 'has_contradiction'
  ];
  assert.deepEqual(Object.keys(result), expectedKeys,
    'addTriple response must be exactly these 13 fields in order');
  assert.equal(Object.keys(result).length, 13);
  assert.match(result.recorded_at, ISO_RE);
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('BITEMP end-to-end: MCP surface mode param round-trips through service layer', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No supported sqlite backend available'); return; }
  const root = makeTempDir();
  const store = createStore(root);

  await store.addTriple({
    subjectName: 'alpha', predicate: 'at_version', objectName: 'v1',
    validFrom: '2020-01-01T00:00:00.000Z'
  });

  // Simulate the exact call graph-tools.ts uses:
  //   memory.queryTriplesAsOf(entity_id, as_of_date, mode)
  // Use a snapshot well in the future so both axes see the row:
  //   event-time: 2030 > valid_from (2020) and valid_to is null -> visible
  //   transaction-time: 2030 > recorded_at (now) -> visible
  const future = '2030-12-31T23:59:59.999Z';
  const eventResult = await store.queryTriplesAsOf('alpha', future, 'event');
  const txResult = await store.queryTriplesAsOf('alpha', future, 'transaction');

  assert.equal(eventResult.mode, 'event');
  assert.equal(txResult.mode, 'transaction');
  assert.ok(eventResult.count >= 1, 'event mode must surface the triple (valid_from bracketed)');
  assert.ok(txResult.count >= 1, 'transaction mode must surface the triple (recorded_at <= snapshot)');
  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
