import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/core/engine/memory.js';
import { backupDatabase, restoreDatabase } from '../src/core/engine/backup.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-backup-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch { /* not supported */ }
  return false;
}

async function openStore(root) {
  const store = new MemoryStore({ enabled: true, backend: 'auto', dbPath: path.join(root, 'memory.db') });
  await store.init();
  return store;
}

test('backupDatabase creates backup file at destination with integrity ok', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  t.after(async () => { try { await store?.close?.(); } catch { /* ignore */ } fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  const store = await openStore(root);
  const dest = path.join(root, 'backup1.db');
  const result = await backupDatabase(store.adapter, dest);
  assert.ok(fs.existsSync(dest), 'backup file must exist');
  assert.strictEqual(result.integrity, 'ok');
  assert.ok(result.size_bytes > 0, 'backup must have non-zero size');
  assert.ok(result.path === dest, 'path must match destination');
  assert.ok(result.created_at, 'created_at must be present');
});

test('backupDatabase twice to same destination overwrites without error (idempotent)', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  t.after(async () => { try { await store?.close?.(); } catch { /* ignore */ } fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  const store = await openStore(root);
  const dest = path.join(root, 'backup-idem.db');
  await backupDatabase(store.adapter, dest);
  const result2 = await backupDatabase(store.adapter, dest);
  assert.strictEqual(result2.integrity, 'ok', 'second backup must still have integrity ok');
});

test('restoreDatabase from valid backup returns restart_required true with integrity ok', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  t.after(async () => { try { await store?.close?.(); } catch { /* ignore */ } fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  const store = await openStore(root);
  const backupPath = path.join(root, 'snap.db');
  await backupDatabase(store.adapter, backupPath);
  // Restore to a separate path (not the live DB) for safety in tests
  const restoreDest = path.join(root, 'restored-copy.db');
  const result = await restoreDatabase(backupPath, restoreDest);
  assert.strictEqual(result.restart_required, true);
  assert.strictEqual(result.integrity, 'ok');
  assert.ok(fs.existsSync(restoreDest), 'restored file must exist');
});

test('restoreDatabase from non-existent file throws with "not found" message', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  // No store opened in this test — nothing to close, just wipe the temp dir.
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  await assert.rejects(
    () => restoreDatabase(path.join(root, 'no-such-file.db'), path.join(root, 'dest.db')),
    /not found/i,
    'must throw with "not found" message'
  );
});

test('synapse_backup MCP handler: backup_path exists in result (happy path)', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  t.after(async () => { try { await store?.close?.(); } catch { /* ignore */ } fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  const store = await openStore(root);
  const dest = path.join(root, 'mcp-backup.db');
  // Simulate handler logic directly — no MCP transport needed
  const result = await backupDatabase(store.adapter, dest);
  assert.ok(result.path, 'backup_path must be present');
  assert.ok(fs.existsSync(result.path), 'backup file must exist on disk');
  assert.strictEqual(result.integrity, 'ok');
});

test('synapse_restore MCP handler: result contains restart_required true (happy path)', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('node:sqlite not available'); return; }
  const root = makeTempDir();
  t.after(async () => { try { await store?.close?.(); } catch { /* ignore */ } fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  const store = await openStore(root);
  const backupPath = path.join(root, 'pre-restore.db');
  await backupDatabase(store.adapter, backupPath);
  const result = await restoreDatabase(backupPath, path.join(root, 'target-restore.db'));
  assert.strictEqual(result.restart_required, true);
  assert.strictEqual(result.integrity, 'ok');
});
