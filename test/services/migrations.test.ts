import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { NodeSqliteAdapter } from '../../src/core/engine/adapter.js';
import { runMigrations } from '../../src/core/engine/memory/migrations.js';
import { ensureSchema, SCHEMA_VERSION } from '../../src/core/engine/memory/schema.js';
import { MemoryStore } from '../../src/core/engine/memory/store/MemoryStore.js';

test('Schema Migrations', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-test-'));
  const dbPath = path.join(tmpDir, 'migration.db');
  
  await t.test('Test 1 — Upgrade path (Fresh install to latest)', async () => {
    const store = new MemoryStore({
      enabled: true,
      backend: 'node-sqlite',
      dbPath,
      embeddingService: null
    });
    
    // Init will call ensureSchema which calls runMigrations
    await store.init();
    
    // Check if schema_version matches
    const version = await store.getMeta('schema_version');
    assert.strictEqual(Number(version), SCHEMA_VERSION);
    
    // Check if backup files were created during migrations
    const files = fs.readdirSync(tmpDir);
    const backups = files.filter(f => f.endsWith('.backup'));
    assert.ok(backups.length > 0, 'Backup files should be created during migrations');
    
    await store.close();
  });

  await t.test('Test 2 — Doctor reports schema version', async () => {
    // Run doctor command in another process to see if it prints the schema version
    const { spawnSync } = await import('node:child_process');
    const doctorOut = spawnSync('node', ['bin/synapse.js', 'doctor'], { env: { ...process.env, SYNAPSE_CONFIG: '' } });
    const output = doctorOut.stdout.toString() + doctorOut.stderr.toString();
    
    // Since we didn't specify a config for doctor, it will look at default ~/.synapse/synapse.db
    // As long as it prints "Schema version:", the check works.
    assert.ok(output.includes('Schema version:'), 'Doctor should report schema version');
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
