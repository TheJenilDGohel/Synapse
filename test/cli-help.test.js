import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runHelp(t, relativeScriptPath) {
  const scriptPath = path.resolve(relativeScriptPath);
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, '--help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return null;
  }
  return result;
}

test('doctor help prints usage without running checks', (t) => {
  const result = runHelp(t, 'scripts/runtime/doctor-synapse.mjs');
  if (!result) return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.doesNotMatch(result.stdout, /Doctor result:/);
});

test('setup help prints usage without runtime warning noise', (t) => {
  const result = runHelp(t, 'scripts/runtime/setup-synapse.mjs');
  if (!result) return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Synapse setup/);
  assert.doesNotMatch(result.stderr, /ExperimentalWarning/);
});

test('synapse start --help prints usage without starting server', (t) => {
  const result = runHelp(t, 'bin/synapse.js');
  if (!result) return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Synapse|USAGE|Usage:/);
  assert.match(result.stdout, /install skills/);
});

test('synapse start subcommand help prints start usage without runtime noise', (t) => {
  const scriptPath = path.resolve('bin/synapse.js');
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'start', '--help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return;
  }

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Synapse MCP server/);
  assert.doesNotMatch(result.stderr, /ExperimentalWarning/);
});

test('synapse task-context help prints canonical usage without executing workflow', (t) => {
  const scriptPath = path.resolve('bin/synapse.js');
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, 'task-context', '--help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return;
  }

  assert.equal(result.status, 0);
  assert.match(result.stdout, /synapse task-context/);
  assert.doesNotMatch(result.stdout, /"runtime":/);
});

test('legacy setup wrapper prints deprecation warning and forwards to canonical help', (t) => {
  const scriptPath = path.resolve('bin/synapse-setup.js');
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, '--help'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return;
  }

  assert.equal(result.status, 0);
  assert.match(result.stderr, /deprecated/i);
  assert.match(result.stdout, /Synapse setup/);
});

test('task-context help prints usage without executing workflow', (t) => {
  const result = runHelp(t, 'scripts/memory/task-context-synapse.mjs');
  if (!result) return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /synapse task-context/);
  assert.doesNotMatch(result.stdout, /"runtime":/);
});

test('capture-outcome help prints usage without validation errors', (t) => {
  const result = runHelp(t, 'scripts/memory/capture-outcome-synapse.mjs');
  if (!result) return;

  assert.equal(result.status, 0);
  assert.match(result.stdout, /synapse capture-outcome/);
  assert.equal(result.stderr.trim(), '');
});
