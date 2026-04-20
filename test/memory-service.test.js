import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryService } from '../src/services/memory/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-memory-service-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    return Boolean(mod?.DatabaseSync);
  } catch {
    return false;
  }
}

test('explicit captureEvent works even when autoCapture is disabled', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available for memory service test');
    return;
  }

  const synapseHome = makeTempDir();
  const service = new MemoryService({
    synapseHome,
    enabled: true,
    backend: 'auto',
    dbPath: path.join(synapseHome, 'memory.db'),
    autoCapture: false,
    consentDone: true
  });

  const captured = await service.captureEvent({
    event_type: 'bugfix',
    status: 'resolved',
    title: 'Fix auth refresh race',
    summary: 'Serialize token refresh requests in the auth gateway.',
    content: 'Resolved duplicate JWT refresh attempts by queueing refresh and retrying once.',
    files_changed: 2,
    has_tests: true,
    scope: {
      project_path: '/repo/app',
      topic: 'auth'
    }
  });

  assert.ok(captured.promoted_memory_id);
  assert.equal(captured.status, 'promoted');

  try { await service.close(); } catch { /* ignore */ }
  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
