import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/core/engine/memory/store/MemoryStore.js';
import { applySqliteTuning } from '../src/core/engine/memory.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-tuning-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch { /* not supported */ }
  return false;
}

// Helper: read a single PRAGMA value via a one-shot prepared statement
function readPragma(db, name) {
  const row = db.prepare(`PRAGMA ${name}`).get();
  if (!row) return null;
  return Object.values(row)[0];
}

test('WAL-01/WAL-02: applySqliteTuning applies all 4 PRAGMAs on a fresh DB', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }
  const root = makeTempDir();
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(root, 'tuning.db'));

  await applySqliteTuning(db);

  const journal = String(readPragma(db, 'journal_mode')).toLowerCase();
  const sync = Number(readPragma(db, 'synchronous'));
  const cache = Number(readPragma(db, 'cache_size'));
  const mmap = Number(readPragma(db, 'mmap_size'));

  assert.equal(journal, 'wal', 'journal_mode must be wal (case-insensitive)');
  assert.equal(sync, 1, 'synchronous=NORMAL maps to integer 1');
  assert.equal(cache, -64000, 'cache_size must be -64000 (64 MB)');
  assert.equal(mmap, 268435456, 'mmap_size must be 256 MB');

  // Windows: checkpoint WAL and disable it before closing so the .db-wal /
  // .db-shm auxiliary files are released and the temp dir can be unlinked.
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
  try { db.exec('PRAGMA journal_mode=DELETE;'); } catch { /* ignore */ }
  db.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('applySqliteTuning is idempotent — second call does not throw or change values', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }
  const root = makeTempDir();
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(root, 'idempotent.db'));

  await applySqliteTuning(db);
  const firstCache = Number(readPragma(db, 'cache_size'));
  await applySqliteTuning(db); // second call
  const secondCache = Number(readPragma(db, 'cache_size'));
  const journal2 = String(readPragma(db, 'journal_mode')).toLowerCase();
  const mmap2 = Number(readPragma(db, 'mmap_size'));

  assert.equal(secondCache, firstCache, 'cache_size unchanged after re-apply');
  assert.equal(journal2, 'wal', 'journal_mode still wal after re-apply');
  assert.equal(mmap2, 268435456, 'mmap_size still 256 MB after re-apply');

  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
  try { db.exec('PRAGMA journal_mode=DELETE;'); } catch { /* ignore */ }
  db.close();
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('WAL-03: 500 triple batch insert completes in under 2 seconds', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }
  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });
  await store.init();

  // Build 500 unique triples. Use distinct subjects to avoid dedup hits.
  const triples = Array.from({ length: 500 }, (_, i) => ({
    subjectName: `wal03_subject_${i}`,
    predicate: 'related_to',
    objectName: `wal03_object_${i}`
  }));

  const startNs = process.hrtime.bigint();
  const summary = await store.addTripleBatch({ triples });
  const endNs = process.hrtime.bigint();
  const durationMs = Number(endNs - startNs) / 1_000_000;

  assert.equal(summary.created, 500, `expected 500 created, got ${summary.created}`);
  assert.ok(
    durationMs < 2000,
    `WAL-03 regression: 500-triple batch insert took ${durationMs.toFixed(1)} ms (budget 2000 ms)`
  );

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('Symbols index DB applies journal_mode=wal via ensureDb', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }
  const root = makeTempDir();
  const symbolsDbPath = path.join(root, 'symbols.db');
  const { SymbolIndexService } = await import('../src/core/engine/retrieval/symbols/index.js');
  const svc = new SymbolIndexService(symbolsDbPath, null);

  // Trigger ensureDb() via a tiny indexFile call. Empty/zero-symbol
  // file is fine — we only need the DB to be opened & tuned.
  try {
    await svc.indexFile('fake.ts', '// no symbols here\n');
  } catch {
    // Extraction may fail without an astChunker; that's OK — the DB
    // is still opened + tuned before the extractor runs.
  }

  // Open a parallel handle to assert PRAGMAs on disk.
  // NOTE: journal_mode is database-scoped (persisted in DB header) so a
  // second connection sees 'wal'. synchronous, cache_size, and mmap_size
  // are connection-scoped — the probe handle inherits its own defaults,
  // not the service's connection-level settings. Therefore we only probe
  // journal_mode here; the authoritative connection-scoped assertions are
  // in Test 1 (WAL-01/WAL-02) which reads PRAGMAs on the same handle.
  const { DatabaseSync } = await import('node:sqlite');
  const probe = new DatabaseSync(symbolsDbPath);
  const journal = String(readPragma(probe, 'journal_mode')).toLowerCase();

  assert.equal(journal, 'wal', 'symbols DB journal_mode must be wal');

  probe.close();
  try { svc.close(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
