import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SearchService } from '../src/core/engine/retrieval.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-search-test-'));
}

test('searchCode falls back to filesystem walk when rg path fails', () => {
  const root = makeTempDir();
  const a = path.join(root, 'a.js');
  const b = path.join(root, 'b.md');
  fs.writeFileSync(a, 'Alpha\nalpha\n', 'utf8');
  fs.writeFileSync(b, 'alpha in markdown\n', 'utf8');

  const workspace = {
    resolveSearchBases: () => [root],
    normalizeTarget: (p) => p,
    *walkDirectories(base) {
      yield { files: [path.join(base, 'a.js'), path.join(base, 'b.md')] };
    },
    isLikelyTextFile: () => true,
    safeReadText: (p) => fs.readFileSync(p, 'utf8')
  };

  const service = new SearchService({
    workspace,
    ignoreDirs: new Set(['node_modules']),
    hasRipgrep: true,
    rgTimeoutMs: 1000,
    maxFileBytes: 10_000,
    vectorIndex: null
  });

  service.fastSearchWithRipgrep = () => {
    throw new Error('rg failed');
  };

  const res = service.searchCode({
    query: 'alpha',
    projectPath: root,
    allRoots: false,
    glob: '*.js',
    maxResults: 10,
    caseSensitive: false
  });

  assert.equal(res.length, 2);
  assert.ok(res.every((r) => r.file.endsWith('.js')));

  const cs = service.searchCode({
    query: 'Alpha',
    projectPath: root,
    allRoots: false,
    glob: '*.js',
    maxResults: 10,
    caseSensitive: true
  });
  assert.equal(cs.length, 1);
  assert.equal(cs[0].line, 1);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('searchCode throws if normalizeTarget mismatch is detected', () => {
  const service = new SearchService({
    workspace: {
      resolveSearchBases: () => ['/tmp/base'],
      normalizeTarget: () => '/tmp/other'
    },
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: null
  });

  assert.throws(
    () => service.searchCode({
      query: 'x',
      projectPath: undefined,
      allRoots: false,
      glob: '*',
      maxResults: 10,
      caseSensitive: false
    }),
    /Resolved base path mismatch/
  );
});

test('symbol helpers find definitions, exports, imports, and calls', () => {
  const root = makeTempDir();
  const defs = path.join(root, 'defs.js');
  const use = path.join(root, 'use.js');

  fs.writeFileSync(
    defs,
    [
      'export function AuthService() {',
      '  return true;',
      '}',
      'export { AuthService };'
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    use,
    [
      "import { AuthService } from './defs.js';",
      'const ok = AuthService();'
    ].join('\n'),
    'utf8'
  );

  const workspace = {
    resolveSearchBases: () => [root],
    normalizeTarget: (p) => p,
    *walkDirectories(base) {
      yield { files: [path.join(base, 'defs.js'), path.join(base, 'use.js')] };
    },
    isLikelyTextFile: () => true,
    safeReadText: (p) => fs.readFileSync(p, 'utf8')
  };

  const service = new SearchService({
    workspace,
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 10_000,
    vectorIndex: null
  });

  const symbol = service.getSymbol({
    symbol: 'AuthService',
    projectPath: root,
    allRoots: false,
    glob: '*.js',
    maxResults: 20,
    caseSensitive: false
  });
  assert.ok(symbol.count >= 1);
  assert.ok(symbol.definitions.some((d) => d.file.endsWith('defs.js')));
  assert.ok(symbol.exports.some((d) => d.file.endsWith('defs.js')));

  const usages = service.findUsages({
    symbol: 'AuthService',
    projectPath: root,
    allRoots: false,
    glob: '*.js',
    maxResults: 20,
    caseSensitive: false,
    contextLines: 1
  });
  assert.ok(usages.usages.some((u) => u.kind === 'import' && u.file.endsWith('use.js')));
  assert.ok(usages.usages.some((u) => u.kind === 'call' && u.file.endsWith('use.js')));

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
