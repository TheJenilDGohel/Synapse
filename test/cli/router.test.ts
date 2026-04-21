import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = path.resolve('bin/synapse.js');

test('CLI: synapse help shows all unified commands', (t) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return;
  }

  assert.equal(result.status, 0);
  const out = result.stdout;
  
  // Noun commands
  assert.match(out, /memory add\s+Store a memory entry/);
  assert.match(out, /mcp start\s+Start MCP server/);
  
  // Unified subcommands
  assert.match(out, /doctor\s+Run health diagnostics/);
  assert.match(out, /setup\s+Run interactive setup wizard/);
  assert.match(out, /upgrade\s+Upgrade package and sync config/);
});

test('CLI: synapse memory help shows context/outcome verbs', (t) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'memory', 'help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') return;

  assert.equal(result.status, 0);
  const out = result.stdout;
  
  assert.match(out, /context\s+Synthesize task-relevant context/);
  assert.match(out, /outcome\s+Capture task outcome/);
});

test('CLI: synapse version returns current version', (t) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'version'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^\d+\.\d+\.\d+/);
});

test('CLI: invalid command returns non-zero code', (t) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'invalid-noun'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') return;

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown command: invalid-noun/);
});
