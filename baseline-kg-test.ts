import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from './src/core/engine/memory/store/MemoryStore.js';

async function runBaselineTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-baseline-kg-'));
  const dbPath = path.join(tmpDir, 'memory.db');
  
  const store = new MemoryStore({
    enabled: true,
    backend: 'node-sqlite',
    dbPath,
    embeddingService: null
  });
  
  await store.init();

  console.log('--- Phase 3 Baseline Test (Human-like) ---');
  
  console.log('Action: Storing a technical fact in memory...');
  const fact = 'The auth service depends on Redis for session storage.';
  await store.storeEntry({
    title: 'Architecture Note',
    content: fact,
    scope: { project_path: 'baseline-test' }
  });

  console.log('\nVerification: Checking Knowledge Graph for auto-extracted nodes...');
  const entities = await store.listEntities();
  console.log(`Entities found: ${entities.count}`);
  if (entities.count > 0) {
    console.log('Detected entities:', entities.items.map(e => e.name));
  }

  const stats = await store.getKgStats();
  console.log('KG Stats:', stats);

  console.log('\nResult:');
  if (entities.count === 0) {
    console.log('FAIL: No entities were auto-extracted. The Knowledge Graph remains empty.');
    console.log('This confirms that current KG extraction is purely manual or limited to existing entity linking.');
  } else {
    console.log('PASS: Entities were found (Unexpected for current baseline).');
  }

  await store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

runBaselineTest().catch(console.error);
