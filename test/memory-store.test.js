import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/core/engine/memory.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-memory-test-'));
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

test('memory store lifecycle: create, list, update, recall, delete', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const created = await store.storeEntry({
    kind: 'knowledge',
    title: 'Auth bug fix',
    summary: 'JWT refresh bug was fixed in auth middleware',
    content: 'Remember to refresh JWT before proxying API requests.',
    importance: 75,
    tags: ['auth', 'jwt'],
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  assert.equal(created.created, true);
  assert.ok(created.memory.id);

  const listed = await store.listEntries({ projectPath: '/repo/app', topic: 'auth' });
  assert.equal(listed.count, 1);
  assert.equal(listed.items[0].title, 'Auth bug fix');

  const updated = await store.updateEntry(created.memory.id, {
    summary: 'JWT refresh bug was fixed in auth middleware and gateway',
    change_note: 'Expanded fix context'
  });
  assert.equal(updated.summary.includes('gateway'), true);
  assert.equal(updated.revisions.length, 2);

  const recalled = await store.recall({
    query: 'jwt auth refresh fix',
    projectPath: '/repo/app',
    topic: 'auth',
    limit: 5
  });
  assert.equal(recalled.count, 1);
  assert.equal(recalled.items[0].memory.id, created.memory.id);
  assert.equal(recalled.items[0].score > 0 && recalled.items[0].score <= 1, true);
  assert.equal(recalled.items[0].raw_score >= recalled.items[0].score, true);

  const deleted = await store.deleteEntry(created.memory.id);
  assert.equal(deleted.deleted, true);

  const afterDelete = await store.listEntries({ projectPath: '/repo/app' });
  assert.equal(afterDelete.count, 0);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('memory recall ranks scoped relevant memory ahead of weaker matches', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const authFix = await store.storeEntry({
    kind: 'knowledge',
    title: 'Fix auth refresh race',
    summary: 'Serialize JWT token refresh requests in gateway auth flow',
    content: 'When multiple requests race, queue token refresh and retry once after refresh completes.',
    importance: 70,
    tags: ['auth', 'jwt', 'gateway'],
    scope: {
      root_path: '/repo',
      project_path: '/repo/app',
      branch_name: 'feature/auth',
      topic: 'auth',
      feature: 'refresh'
    }
  });

  await store.storeEntry({
    kind: 'knowledge',
    title: 'Improve dashboard refresh',
    summary: 'Refresh dashboard cards after settings save',
    content: 'This is about dashboard widgets, not authentication.',
    importance: 90,
    tags: ['dashboard'],
    scope: {
      root_path: '/repo',
      project_path: '/repo/app',
      topic: 'ui',
      feature: 'dashboard'
    }
  });

  const recalled = await store.recall({
    query: 'jwt auth refresh race gateway',
    rootPath: '/repo',
    projectPath: '/repo/app',
    branchName: 'feature/auth',
    topic: 'auth',
    feature: 'refresh',
    limit: 5
  });

  assert.equal(recalled.count >= 1, true);
  assert.equal(recalled.items[0].memory.id, authFix.memory.id);
  assert.equal(recalled.items[0].score > 0 && recalled.items[0].score <= 1, true);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('memory recall applies logarithmic usage boost with recency bias', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const frequent = await store.storeEntry({
    kind: 'knowledge',
    title: 'Deployment rollout checklist alpha',
    summary: 'Shared query terms for usage scoring',
    content: 'Deploy API with rollout checklist alpha and verify health checks.',
    importance: 50,
    scope: { project_path: '/repo/app', topic: 'deploy' }
  });

  const stale = await store.storeEntry({
    kind: 'knowledge',
    title: 'Deployment rollout checklist beta',
    summary: 'Shared query terms for usage scoring',
    content: 'Deploy API with rollout checklist beta and verify health checks.',
    importance: 50,
    scope: { project_path: '/repo/app', topic: 'deploy' }
  });

  await store.init();
  await store.adapter.run(
    `UPDATE memory_entries
        SET recall_count = ?, last_recalled_at = ?
      WHERE id = ?`,
    [25, new Date().toISOString(), frequent.memory.id]
  );
  await store.adapter.run(
    `UPDATE memory_entries
        SET recall_count = ?, last_recalled_at = ?
      WHERE id = ?`,
    [25, new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), stale.memory.id]
  );

  const recalled = await store.recall({
    query: 'deployment rollout checklist verify health',
    projectPath: '/repo/app',
    topic: 'deploy',
    limit: 5
  });

  assert.equal(recalled.count >= 2, true);
  assert.equal(recalled.items[0].memory.id, frequent.memory.id, 'recently-used memory should outrank equally-used stale memory');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('memory store dedupes identical scoped entries', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const first = await store.storeEntry({
    kind: 'preference',
    title: 'Use rg first',
    summary: 'Prefer ripgrep for text search',
    content: 'Always use rg before grep in this repository.',
    scope: {
      project_path: '/repo/app',
      topic: 'workflow'
    }
  });
  const second = await store.storeEntry({
    kind: 'preference',
    title: 'Use rg first',
    summary: 'Prefer ripgrep for text search',
    content: 'Always use rg before grep in this repository.',
    scope: {
      project_path: '/repo/app',
      topic: 'workflow'
    }
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.memory.id, first.memory.id);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('captureEvent promotes high-signal events and ignores weak ones', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const promoted = await store.captureEvent({
    event_type: 'bugfix',
    status: 'resolved',
    title: 'Fix auth refresh race',
    summary: 'Resolved race in auth refresh handling',
    content: 'Fix auth refresh race by serializing token refresh and retrying once.',
    files_changed: 3,
    has_tests: true,
    tags: ['auth', 'race'],
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  assert.equal(promoted.status, 'promoted');
  assert.ok(promoted.promoted_memory_id);

  const weak = await store.captureEvent({
    event_type: 'task',
    status: 'in_progress',
    title: 'Looked at auth folder',
    summary: 'Explored files',
    content: 'Opened files to understand layout.',
    files_changed: 0,
    has_tests: false,
    scope: {
      project_path: '/repo/app'
    }
  });

  assert.equal(weak.status, 'ignored');
  assert.equal(weak.promoted_memory_id, null);

  const events = await store.listEvents({ projectPath: '/repo/app' });
  assert.equal(events.count, 2);

  const memories = await store.listEntries({ projectPath: '/repo/app' });
  assert.equal(memories.count, 1);
  assert.equal(memories.items[0].title, 'Fix auth refresh race');

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('captureEvent promotes completed task work when it contains durable implementation detail', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const captured = await store.captureEvent({
    event_type: 'task',
    status: 'completed',
    title: 'Worked on auth flow',
    summary: 'Remember to serialize token refresh requests in the auth gateway',
    content: 'Implemented queueing so duplicate refresh requests wait and retry once after refresh completes.',
    files_changed: 2,
    has_tests: false,
    tags: ['auth', 'jwt'],
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  assert.equal(captured.status, 'promoted');
  assert.ok(captured.promoted_memory_id);

  const memory = await store.getEntry(captured.promoted_memory_id);
  assert.equal(memory.title.includes('auth flow'), false);
  assert.equal(memory.summary.includes('serialize token refresh requests'), true);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('captureEvent merges into an existing related memory instead of duplicating it', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory store test');
    return;
  }

  const root = makeTempDir();
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });

  const original = await store.storeEntry({
    kind: 'knowledge',
    title: 'Fix auth refresh race',
    summary: 'Serialize token refresh requests',
    content: 'Queue refresh requests to avoid duplicate token refresh operations.',
    tags: ['auth', 'jwt'],
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  const captured = await store.captureEvent({
    event_type: 'bugfix',
    status: 'resolved',
    title: 'Fix auth refresh race in gateway',
    summary: 'Resolved JWT refresh race in gateway flow',
    content: 'Queue refresh requests and retry once after refresh completes in the auth gateway.',
    files_changed: 2,
    has_tests: true,
    tags: ['auth', 'gateway'],
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  assert.equal(captured.status, 'merged');
  assert.equal(captured.promoted_memory_id, original.memory.id);

  const memory = await store.getEntry(original.memory.id);
  assert.equal(memory.revisions.length, 2);
  assert.equal(memory.content.includes('retry once after refresh completes'), true);

  const allMemories = await store.listEntries({ projectPath: '/repo/app' });
  assert.equal(allMemories.count, 1);

  try { await store?.close?.(); } catch { /* ignore */ }
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
