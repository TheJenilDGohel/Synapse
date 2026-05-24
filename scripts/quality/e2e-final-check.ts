import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert';

const synapseBin = 'node bin/synapse.js';

function run(cmd: string, env: any = {}) {
    const parts = cmd.split(' ');
    const result = spawnSync('node', [parts[1], ...parts.slice(2)], {
        encoding: 'utf8',
        env: { ...process.env, ...env }
    });
    return {
        stdout: result.stdout?.toString() || '',
        stderr: result.stderr?.toString() || '',
        status: result.status
    };
}

async function testE2E() {
    console.log('--- RUTHLESS E2E FINAL VERIFICATION ---');
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-e2e-'));
    const env = { SYNAPSE_HOME: tmpHome };

    // 1. Version Check (Phase 6)
    console.log('Step 1: Version check...');
    const v = run('node bin/synapse.js --version', env);
    assert.ok(v.stdout.includes('2026.05.4'), 'Version should be correct');

    // 2. Setup (Phase 1)
    console.log('Step 2: Setup...');
    const s1 = run('node bin/synapse.js setup --yes', env);
    assert.strictEqual(s1.status, 0, 'Setup should succeed');
    
    console.log('Step 2.1: Idempotent Setup...');
    const s2 = run('node bin/synapse.js setup --yes', env);
    assert.strictEqual(s2.status, 0, 'Second setup should succeed');

    // 3. Status & Doctor (Phase 6 & 4)
    console.log('Step 3: Status (Initial)...');
    const stat = run('node bin/synapse.js status', env);
    assert.ok(stat.stdout.includes('Database not yet initialized') || stat.stdout.includes('Synapse Status'), 'Status should print or show init message');

    console.log('Step 3.1: Doctor...');
    const dr = run('node bin/synapse.js doctor', env);
    assert.ok(dr.stdout.includes('Doctor result: healthy') || dr.stdout.includes('1 issue(s) found'), 'Doctor should be operational');

    // 4. Memory & Conflict (Phase 2)
    console.log('Step 4: Memory Conflict Resolution...');
    // We'll use the CLI for this to simulate real usage
    run('node bin/synapse.js memory add --content "Project Orion uses port 5433" --title "DB"', env);
    // Add another fact to ensure different IDs and trigger contradiction
    run('node bin/synapse.js memory add --content "Project Orion uses port 5432" --title "DB Update"', env);
    
    const recall = run('node bin/synapse.js status', env);
    console.log(recall.stdout);
    assert.ok(recall.stdout.includes('entries'), 'Entries should be stored');
    // We expect 1 invalidated entry because 5432 contradicts 5433 semantically
    assert.ok(recall.stdout.includes('1 invalidated'), 'One entry should be invalidated');

    // 5. Bench (Phase 5)
    console.log('Step 5: Benchmarks...');
    const bench = run('node bin/synapse.js bench', env);
    assert.ok(bench.stdout.includes('MEMORY OPERATIONS'), 'Bench should run');

    console.log('\n✅ ALL E2E GATES PASSED.');
    
    // Cleanup
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
}

testE2E().catch(err => {
    console.error('❌ E2E FAIL:', err);
    process.exit(1);
});
