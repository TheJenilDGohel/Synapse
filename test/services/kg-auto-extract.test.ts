import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../../src/core/engine/memory/store/MemoryStore.js';

// Mock Enrichment Service for deterministic extraction tests
class MockEnrichmentService {
  async initialize() { return; }
  async extractGraph(id: string, statement: string) {
    if (statement.includes('hypothetical')) {
      return { entities: [], relationships: [], confidence: 1.0, is_hypothetical: true, is_negation: false };
    }
    if (statement.includes('negation')) {
      return { entities: [], relationships: [], confidence: 1.0, is_hypothetical: false, is_negation: true };
    }
    if (statement.includes('auth service') && statement.includes('Redis')) {
      return {
        entities: [
          { name: 'AuthService', type: 'service' },
          { name: 'Redis', type: 'technology' }
        ],
        relationships: [
          { from: 'AuthService', relation: 'depends_on', to: 'Redis' }
        ],
        confidence: 0.9,
        is_hypothetical: false,
        is_negation: false
      };
    }
    return { entities: [], relationships: [], confidence: 0, is_hypothetical: false, is_negation: false };
  }
  getStatus() { return { active: true }; }
}

async function setupTestStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-test-kg-extract-'));
  const dbPath = path.join(tmpDir, 'memory.db');
  
  const store = new MemoryStore({
    enabled: true,
    backend: 'node-sqlite',
    dbPath,
    embeddingService: null,
    enrichmentService: new MockEnrichmentService() as any
  });
  
  await store.init();
  return { store, tmpDir };
}

// Helper to wait for async background extraction
async function waitForExtraction() {
  return new Promise(resolve => setTimeout(resolve, 100));
}

test('Automatic Knowledge Graph Extraction (Phase 3)', async (t) => {
  const { store, tmpDir } = await setupTestStore();

  await t.test('Test 1 — Basic extraction', async () => {
    await store.storeEntry({
      title: 'Architecture',
      content: 'The auth service depends on Redis for session storage.',
      scope: { project_path: 'kg-test' }
    });

    await waitForExtraction();

    const entities = await store.listEntities();
    const triples = await store.getKgStats();

    assert.ok(entities.items.some(e => e.name === 'AuthService'), 'AuthService entity should be created');
    assert.ok(entities.items.some(e => e.name === 'Redis'), 'Redis entity should be created');
    assert.strictEqual(triples.triples, 1, 'One triple should be created');
    
    const relations = await store.queryEntityRelationships('authservice');
    assert.strictEqual(relations.triples.length, 1);
    assert.strictEqual(relations.triples[0].predicate, 'depends_on');
    assert.strictEqual(relations.triples[0].object_name, 'Redis');
  });

  await t.test('Test 2 — Hypothetical rejection', async () => {
    await store.storeEntry({
      title: 'Hypothetical',
      content: 'If we used Redis instead of PostgreSQL (hypothetical)',
      scope: { project_path: 'kg-test' }
    });

    await waitForExtraction();

    // No NEW entities should be created beyond the ones from Test 1
    const entities = await store.listEntities();
    assert.strictEqual(entities.count, 2); 
  });

  await t.test('Test 3 — Negation handling', async () => {
    await store.storeEntry({
      title: 'Negation',
      content: 'We do not use negation for storage (negation)',
      scope: { project_path: 'kg-test' }
    });

    await waitForExtraction();

    const entities = await store.listEntities();
    assert.strictEqual(entities.count, 2); 
  });

  // Cleanup
  await store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
