import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../../src/core/engine/memory/store/MemoryStore.js';
import { EmbeddingService } from '../../src/core/engine/retrieval/embedding/service.js';

// A mock embedding service for deterministic tests without downloading models
class MockEmbeddingService {
  isEnabled() { return true; }
  async embed(text: string) {
    const vec = new Array(10).fill(0.1); // Base similarity
    
    // Test 1: Orion PostgreSQL
    if (text.includes('Orion uses PostgreSQL')) {
      vec[0] = 1; vec[1] = 1; vec[2] = 1; vec[3] = 1; vec[4] = 1; vec[5] = 1; vec[6] = 1; vec[7] = 1; vec[8] = 1;
      if (text.includes('5433')) vec[9] = 1;
      if (text.includes('5432')) vec[9] = 0; // High overlap, sim ~ 0.95
    }
    
    // Test 3: Auth Session / JWT
    if (text.includes('auth') || text.includes('session') || text.includes('JWT')) {
      vec[0] = -1; vec[1] = -1; vec[2] = -1; vec[3] = -1; vec[4] = -1; vec[5] = -1; vec[6] = -1; vec[7] = -1; vec[8] = -1;
      if (text.includes('session')) vec[9] = 1;
      if (text.includes('JWT')) vec[9] = 0; // High overlap, sim ~ 0.95
    }

    // Test 4: Orthogonal
    if (text.includes('Orion team is Platform')) {
      vec[0] = 1; vec[1] = 1; vec[2] = -1; vec[3] = -1; vec[4] = 0; vec[5] = 0; vec[6] = 0; vec[7] = 0; vec[8] = 0; vec[9] = 0;
      // Similarity to Test 1 will be low
    }
    
    return vec;
  }
  async embedBatch(texts: string[]) {
    return Promise.all(texts.map(t => this.embed(t)));
  }
  getStatus() { return {}; }
}

async function setupTestStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-test-'));
  const dbPath = path.join(tmpDir, 'memory.db');
  
  const store = new MemoryStore({
    enabled: true,
    backend: 'node-sqlite',
    dbPath,
    embeddingService: new MockEmbeddingService() as unknown as EmbeddingService
  });
  
  await store.init();
  return { store, tmpDir };
}

test('Memory Conflict Resolution', async (t) => {
  const { store, tmpDir } = await setupTestStore();

  await t.test('Test 1 — Simple factual overwrite', async () => {
    // Store original fact
    await store.storeEntry({
      title: 'Database Config',
      content: 'Project Orion uses PostgreSQL on port 5433',
      scope: { project_path: 'orion' },
      dedup_threshold: 0.99
    });

    // Store contradicting fact
    await store.storeEntry({
      title: 'Database Config Updated',
      content: 'Project Orion uses PostgreSQL on port 5432',
      scope: { project_path: 'orion' },
      dedup_threshold: 0.99
    });

    // Recall
    const result = await store.recall({ query: 'What port does Project Orion run on?', projectPath: 'orion' });
    
    // In our mock:
    // 5433: vec[0]=1, vec[1]=1, vec[3]=1  -> magnitude = sqrt(3)
    // 5432: vec[0]=1, vec[1]=1, vec[4]=1  -> magnitude = sqrt(3)
    // dot product = 2
    // cosine sim = 2 / 3 = 0.666
    // WAIT. If cosine is 0.666, it won't hit the 0.85 threshold!
    // We need dot product to be ~0.85. 
    // Let's adjust the vector in the test itself to ensure they hit 0.88.
    
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].memory.content, 'Project Orion uses PostgreSQL on port 5432');
  });

  await t.test('Test 2 — Temporal preservation', async () => {
    const rows = await store.adapter!.all<{ content: string; status: string; invalidated_at: string | null }>(
      `SELECT content, status, invalidated_at FROM memory_entries WHERE scope_project_path = 'orion' ORDER BY created_at ASC`
    );
    
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].content, 'Project Orion uses PostgreSQL on port 5433');
    assert.strictEqual(rows[0].status, 'invalidated');
    assert.notStrictEqual(rows[0].invalidated_at, null);
    
    assert.strictEqual(rows[1].content, 'Project Orion uses PostgreSQL on port 5432');
    assert.strictEqual(rows[1].status, 'active');
    assert.strictEqual(rows[1].invalidated_at, null);
  });

  await t.test('Test 3 — Semantic contradiction', async () => {
    await store.storeEntry({
      title: 'Auth Decision',
      content: 'We decided to use session tokens for auth',
      scope: { project_path: 'auth' },
      dedup_threshold: 0.99
    });

    await store.storeEntry({
      title: 'Auth Decision Changed',
      content: 'We switched from session tokens to JWT',
      scope: { project_path: 'auth' },
      dedup_threshold: 0.99
    });

    const result = await store.recall({ query: 'What auth mechanism does this project use?', projectPath: 'auth' });
    
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].memory.content, 'We switched from session tokens to JWT');
  });

  await t.test('Test 4 — Non-contradiction', async () => {
    await store.storeEntry({
      title: 'Database',
      content: 'Project Orion uses PostgreSQL',
      scope: { project_path: 'orion-team' },
      dedup_threshold: 0.99
    });

    await store.storeEntry({
      title: 'Team',
      content: 'Project Orion team is Platform',
      scope: { project_path: 'orion-team' },
      dedup_threshold: 0.99
    });

    const result = await store.recall({ query: 'Tell me about Project Orion', projectPath: 'orion-team' });
    
    assert.strictEqual(result.items.length, 2);
  });

  // Cleanup
  await store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
