import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildForwardArgv,
  buildLocalnestCommandArgv,
  hasVersionFlag
} from '../bin/_shared.js';
import { SERVER_VERSION } from '../src/runtime/version.js';

function assertVersionCommand(t, scriptPath) {
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', scriptPath, '--version'], { encoding: 'utf8' });
  if (result.error?.code === 'EPERM') {
    t.skip('process spawning is blocked in this environment');
    return;
  }

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), SERVER_VERSION);
  assert.equal(result.stderr.trim(), '');
}

test('hasVersionFlag detects short and long flags', () => {
  assert.equal(hasVersionFlag(['node', 'bin', '--version']), true);
  assert.equal(hasVersionFlag(['node', 'bin', '-v']), true);
  assert.equal(hasVersionFlag(['node', 'bin', 'start']), false);
});

test('buildForwardArgv preserves process launcher slots', () => {
  const out = buildForwardArgv(['doctor', '--verbose'], ['node', 'bin/synapse.js', 'setup']);
  assert.deepEqual(out, ['node', 'bin/synapse.js', 'doctor', '--verbose']);
});

test('buildLocalnestCommandArgv rewrites legacy wrapper argv to canonical synapse command', () => {
  const out = buildLocalnestCommandArgv(
    ['setup'],
    new URL('../bin/synapse-mcp-setup.js', import.meta.url),
    ['node', 'bin/synapse-mcp-setup.js', '--json']
  );

  assert.equal(out[0], 'node');
  // Cross-platform: bin separator is '/' on POSIX and '\' on Windows.
  assert.match(out[1], /bin[\\/]synapse\.js$/);
  assert.deepEqual(out.slice(2), ['setup', '--json']);
});

test('synapse --version prints version without starting runtime-heavy paths', (t) => {
  const scriptPath = path.resolve('bin/synapse.js');
  assertVersionCommand(t, scriptPath);
});

test('synapse-mcp --version prints version without starting MCP server', (t) => {
  const scriptPath = path.resolve('bin/synapse-mcp.js');
  assertVersionCommand(t, scriptPath);
});
