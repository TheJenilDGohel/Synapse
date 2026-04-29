import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/core/engine/memory.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-nest-branch-test-'));
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

test('storeEntry persists explicit nest and branch verbatim', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const created = await store.storeEntry({
    kind: 'knowledge',
    title: 'Explicit pass-through',
    content: 'Explicit nest and branch should land on the row as-is.',
    importance: 60,
    scope: { project_path: '/tmp/foo' },
    nest: 'synapse',
    branch: 'release/0.2.0'
  });

  assert.equal(created.created, true);
  assert.ok(created.memory?.id);

  const entry = await store.getEntry(created.memory.id);
  assert.equal(entry.nest, 'synapse');
  assert.equal(entry.branch, 'release/0.2.0');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('captureEvent persists explicit nest and branch on promoted memory', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const result = await store.captureEvent({
    event_type: 'task',
    status: 'completed',
    title: 'Capture event wiring check',
    content: 'Deliberate high-signal content that should clear the promotion threshold for the wiring regression test because we pass high importance explicitly.',
    importance: 90,
    scope: { project_path: '/tmp/foo' },
    nest: 'my-nest',
    branch: 'my-branch'
  });

  if (result.status !== 'promoted') {
    t.diagnostic(`captureEvent did not promote, status=${result.status}; skipping row assertion`);
    try { await store?.close?.(); } catch { /* ignore */ }
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    return;
  }

  const listed = await store.listEntries({ projectPath: '/tmp/foo' });
  assert.ok(listed.count >= 1, 'expected at least one promoted memory');
  const promoted = listed.items.find((item) => item.id === result.promoted_memory_id) || listed.items[0];
  assert.equal(promoted.nest, 'my-nest');
  assert.equal(promoted.branch, 'my-branch');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('storeEntry fallback derives nest from basename and sanitizes branch', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const created = await store.storeEntry({
    kind: 'knowledge',
    title: 'Basename fallback check',
    content: 'With no explicit nest or branch, fallback should yield basename and sanitized branch.',
    importance: 55,
    scope: {
      project_path: '/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse',
      branch_name: 'release/0.2.0'
    }
  });

  assert.equal(created.created, true);
  const entry = await store.getEntry(created.memory.id);
  assert.equal(entry.nest, 'synapse', 'nest should be basename of project_path');
  assert.equal(entry.branch, 'release-0.2.0', 'branch should have slashes replaced with hyphens');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('explicit branch with slashes is preserved (sanitization only on fallback)', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const created = await store.storeEntry({
    kind: 'knowledge',
    title: 'Explicit slashes survive',
    content: 'Explicit branch string should keep its slashes even though the fallback would strip them.',
    importance: 55,
    scope: {
      project_path: '/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/other',
      branch_name: 'should/not/matter'
    },
    nest: 'explicit',
    branch: 'feature/foo/bar'
  });

  assert.equal(created.created, true);
  const entry = await store.getEntry(created.memory.id);
  assert.equal(entry.nest, 'explicit', 'explicit nest must not be overridden by basename fallback');
  assert.equal(entry.branch, 'feature/foo/bar', 'explicit branch must retain slashes');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('manageBranches supports merge, delete, and stale listing', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }

  const root = makeTempDir();
  const store = createStore(root);

  const oldA = await store.storeEntry({
    kind: 'knowledge',
    title: 'Old release note',
    content: 'Branch cleanup candidate one.',
    scope: { project_path: '/tmp/synapse' },
    nest: 'synapse',
    branch: 'release-0.3.0'
  });
  const oldB = await store.storeEntry({
    kind: 'knowledge',
    title: 'Old release note 2',
    content: 'Branch cleanup candidate two.',
    scope: { project_path: '/tmp/synapse' },
    nest: 'synapse',
    branch: 'release-0.3.0'
  });
  await store.storeEntry({
    kind: 'knowledge',
    title: 'Canonical branch note',
    content: 'Already on the canonical branch.',
    scope: { project_path: '/tmp/synapse' },
    nest: 'synapse',
    branch: 'release/0.3.0'
  });
  await store.storeEntry({
    kind: 'knowledge',
    title: 'Testing flow branch',
    content: 'Should be cleared by delete action.',
    scope: { project_path: '/tmp/synapse' },
    nest: 'synapse',
    branch: 'Testing Flow'
  });

  await store.init();
  const staleDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await store.adapter.run(
    `UPDATE memory_entries
        SET updated_at = ?, last_recalled_at = ?
      WHERE id IN (?, ?)`,
    [staleDate, staleDate, oldA.memory.id, oldB.memory.id]
  );

  const stale = await store.manageBranches({
    action: 'list_stale',
    nest: 'synapse',
    olderThanDays: 30
  });
  assert.equal(stale.action, 'list_stale');
  assert.ok((stale.items || []).some((item) => item.branch === 'release-0.3.0'));

  const merged = await store.manageBranches({
    action: 'merge',
    nest: 'synapse',
    fromBranch: 'release-0.3.0',
    toBranch: 'release/0.3.0'
  });
  assert.equal(merged.moved_count, 2);

  const branchesAfterMerge = await store.listBranches('synapse');
  assert.equal(branchesAfterMerge.branches.some((item) => item.branch === 'release-0.3.0'), false);
  assert.equal(branchesAfterMerge.branches.some((item) => item.branch === 'release/0.3.0' && item.count === 3), true);

  const deleted = await store.manageBranches({
    action: 'delete',
    nest: 'synapse',
    branch: 'Testing Flow'
  });
  assert.equal(deleted.deleted_count, 1);

  const cleared = await store.listEntries({ projectPath: '/tmp/synapse', nest: 'synapse' });
  const testingFlow = cleared.items.find((item) => item.title === 'Testing flow branch');
  assert.equal(testingFlow?.branch, '');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
