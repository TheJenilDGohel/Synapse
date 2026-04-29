import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureSqliteVecExtension,
  findSqliteVecExtensionPath
} from '../src/core/runtime/sqlite-vec-extension.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-vec-test-'));
}

function extensionName() {
  if (process.platform === 'win32') return 'vec0.dll';
  if (process.platform === 'darwin') return 'vec0.dylib';
  return 'vec0.so';
}

test('findSqliteVecExtensionPath discovers vec0 under Synapse vendor tree', () => {
  const synapseHome = makeTempDir();
  const libDir = path.join(synapseHome, 'vendor', 'sqlite-vec', 'node_modules', 'sqlite-vec', 'dist');
  fs.mkdirSync(libDir, { recursive: true });
  const libPath = path.join(libDir, extensionName());
  fs.writeFileSync(libPath, 'binary', 'utf8');

  // Mock sqliteVecModule to return null to force manual discovery
  const mockSqliteVec = { getLoadablePath: () => null };

  const result = findSqliteVecExtensionPath({
    synapseHome,
    env: {},
    sqliteVecModule: mockSqliteVec
  });

  assert.equal(result.path, libPath);
  assert.equal(result.source, 'synapse-vendor');

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('findSqliteVecExtensionPath prioritizes official sqlite-vec package', () => {
  const synapseHome = makeTempDir();
  const packagePath = path.join(synapseHome, 'real-package', extensionName());
  fs.mkdirSync(path.dirname(packagePath), { recursive: true });
  fs.writeFileSync(packagePath, 'binary', 'utf8');

  const mockSqliteVec = { getLoadablePath: () => packagePath };

  const result = findSqliteVecExtensionPath({
    synapseHome,
    env: {},
    sqliteVecModule: mockSqliteVec
  });

  assert.equal(result.path, packagePath);
  assert.equal(result.source, 'sqlite-vec-package');

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('ensureSqliteVecExtension installs sqlite-vec into Synapse vendor tree when missing', () => {
  const synapseHome = makeTempDir();
  const mockSqliteVec = { getLoadablePath: () => null }; // Force install

  const installSpawn = (command, args, options) => {
    // Cross-platform: command is 'npm' on POSIX and 'npm.cmd' on Windows.
    const isNpm = String(command).startsWith('npm');
    if (isNpm && Array.isArray(args) && args[0] === 'root') {
      return { status: 0, stdout: `${path.join(synapseHome, 'missing-global')}\n` };
    }
    if (isNpm && Array.isArray(args) && args[0] === 'install') {
      const libDir = path.join(options.cwd, 'node_modules', 'sqlite-vec', 'dist');
      fs.mkdirSync(libDir, { recursive: true });
      fs.writeFileSync(path.join(libDir, extensionName()), 'binary', 'utf8');
      return { status: 0, stdout: '', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: '' };
  };

  const result = ensureSqliteVecExtension({
    synapseHome,
    env: {},
    installIfMissing: true,
    spawn: installSpawn,
    sqliteVecModule: mockSqliteVec
  });

  assert.equal(result.ok, true);
  assert.equal(result.installed, true);
  assert.match(result.path, new RegExp(`${extensionName().replace('.', '\\.')}$`));

  fs.rmSync(synapseHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
