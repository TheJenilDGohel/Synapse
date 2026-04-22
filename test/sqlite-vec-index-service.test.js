import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
const skipReason = nodeMajor < 22 ? `node:sqlite requires Node 22+ (current: ${process.versions.node})` : false;

const { buildBaseScopeClause, SqliteVecIndexService } = skipReason
  ? { buildBaseScopeClause: null, SqliteVecIndexService: null }
  : await import('../src/core/engine/retrieval/sqlite-vec/service.js');
const {
  getVecTableDefinition,
  normalizeVecPrimaryKey,
  shouldRebuildVecTable
} = skipReason
  ? { getVecTableDefinition: null, normalizeVecPrimaryKey: null, shouldRebuildVecTable: null }
  : await import('../src/core/engine/retrieval/sqlite-vec/runtime.js');

test('buildBaseScopeClause handles slash and backslash descendants', { skip: skipReason }, () => {
  const bases = ['C:\\repo\\project', '/home/u/repo'];
  const scope = buildBaseScopeClause(bases);

  assert.equal(scope.params[0], 'C:\\repo\\project');
  assert.equal(scope.params[1], 'C:\\repo\\project/%');
  assert.equal(scope.params[2], 'C:\\repo\\project\\%');
  assert.equal(scope.params[3], '/home/u/repo');
  assert.equal(scope.params[4], '/home/u/repo/%');
  assert.equal(scope.params[5], '/home/u/repo\\%');
});

test('sqlite index updates df/norm incrementally across reindex', { skip: skipReason }, async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-test-'));
  const dbPath = path.join(tempRoot, 'idx.db');
  const target = path.join(tempRoot, 'a.js');

  fs.writeFileSync(target, 'const foo = 1;\nfoo();\n', 'utf8');

  const workspace = {
    resolveSearchBases: () => [tempRoot],
    normalizeTarget: (p) => p,
    *walkDirectories(base) {
      yield { files: [path.join(base, 'a.js')] };
    },
    isLikelyTextFile: () => true,
    safeReadText: (p) => fs.readFileSync(p, 'utf8')
  };

  const service = new SqliteVecIndexService({
    workspace,
    dbPath,
    sqliteVecExtensionPath: '',
    chunkLines: 20,
    chunkOverlap: 5,
    maxTermsPerChunk: 40,
    maxIndexedFiles: 100
  });

  await service.indexProject({ projectPath: tempRoot, allRoots: false, force: false, maxFiles: 10 });
  const fooBefore = await service.semanticSearch({
    query: 'foo',
    projectPath: tempRoot,
    allRoots: false,
    maxResults: 5,
    minScore: 0
  });
  assert.ok(fooBefore.length > 0);

  fs.writeFileSync(target, 'const bar = 2;\nbar();\n', 'utf8');
  await service.indexProject({ projectPath: tempRoot, allRoots: false, force: false, maxFiles: 10 });

  const fooAfter = await service.semanticSearch({
    query: 'foo',
    projectPath: tempRoot,
    allRoots: false,
    maxResults: 5,
    minScore: 0
  });
  const barAfter = await service.semanticSearch({
    query: 'bar',
    projectPath: tempRoot,
    allRoots: false,
    maxResults: 5,
    minScore: 0
  });

  assert.equal(fooAfter.length, 0);
  assert.ok(barAfter.length > 0);

  try { service.close(); } catch { /* ignore */ }
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('sqlite index status reports extension as not configured when no extension path is provided', { skip: skipReason }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-status-test-'));
  const dbPath = path.join(tempRoot, 'idx.db');

  const workspace = {
    resolveSearchBases: () => [tempRoot],
    normalizeTarget: (p) => p,
    *walkDirectories() {
      yield { files: [] };
    },
    isLikelyTextFile: () => true,
    safeReadText: () => ''
  };

  const service = new SqliteVecIndexService({
    workspace,
    dbPath,
    sqliteVecExtensionPath: '',
    chunkLines: 20,
    chunkOverlap: 5,
    maxTermsPerChunk: 40,
    maxIndexedFiles: 100
  });

  const status = service.getStatus();
  assert.equal(status.sqlite_vec_loaded, null);
  assert.equal(status.sqlite_vec_extension.configured, false);
  assert.equal(status.sqlite_vec_extension.attempted, false);
  assert.equal(status.sqlite_vec_extension.status, 'not-configured');

  try { service.close(); } catch { /* ignore */ }
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('sqlite index status degrades gracefully when status cannot open the database', { skip: skipReason }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-status-error-test-'));
  const dbPath = path.join(tempRoot, 'idx.db');

  const workspace = {
    resolveSearchBases: () => [tempRoot],
    normalizeTarget: (p) => p,
    *walkDirectories() {
      yield { files: [] };
    },
    isLikelyTextFile: () => true,
    safeReadText: () => ''
  };

  const service = new SqliteVecIndexService({
    workspace,
    dbPath,
    sqliteVecExtensionPath: '',
    chunkLines: 20,
    chunkOverlap: 5,
    maxTermsPerChunk: 40,
    maxIndexedFiles: 100
  });

  service.ensureDb = () => {
    const error = new Error('database is locked');
    error.code = 'ERR_SQLITE_ERROR';
    throw error;
  };

  const status = service.getStatus();
  assert.equal(status.backend, 'sqlite-vec');
  assert.equal(status.total_files, 0);
  assert.equal(status.sqlite_vec_table_ready, false);
  assert.match(status.error || '', /database is locked/);

  try { service.close(); } catch { /* ignore */ }
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('sqlite index enables extension loading when an extension path is configured', { skip: skipReason }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-extension-test-'));
  const dbPath = path.join(tempRoot, 'idx.db');

  const workspace = {
    resolveSearchBases: () => [tempRoot],
    normalizeTarget: (p) => p,
    *walkDirectories() {
      yield { files: [] };
    },
    isLikelyTextFile: () => true,
    safeReadText: () => ''
  };

  const service = new SqliteVecIndexService({
    workspace,
    dbPath,
    sqliteVecExtensionPath: path.join(tempRoot, 'missing-vec0.so'),
    chunkLines: 20,
    chunkOverlap: 5,
    maxTermsPerChunk: 40,
    maxIndexedFiles: 100
  });

  service.ensureDb();

  assert.equal(service.sqliteVecLoadAttempted, true);
  assert.equal(service.sqliteVecLoadError.includes('disabled at database creation'), false);

  service.resetDb();
  try { service.close(); } catch { /* ignore */ }
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('sqlite vec table definition uses explicit integer primary key column', { skip: skipReason }, () => {
  const service = { embeddingDimensions: 384 };
  assert.equal(
    getVecTableDefinition(service),
    'vec0(chunk_rowid integer primary key, embedding float[384])'
  );
});

test('sqlite vec table is rebuilt when legacy hidden-rowid schema is detected', { skip: skipReason }, () => {
  const service = { embeddingDimensions: 384 };
  assert.equal(
    shouldRebuildVecTable(service, 'CREATE VIRTUAL TABLE vec_chunks USING vec0(embedding float[384])'),
    true
  );
  assert.equal(
    shouldRebuildVecTable(service, 'CREATE VIRTUAL TABLE vec_chunks USING vec0(chunk_rowid integer primary key, embedding float[384])'),
    false
  );
});

test('sqlite vec primary key normalization only accepts safe integers', { skip: skipReason }, () => {
  assert.equal(normalizeVecPrimaryKey(12), 12);
  assert.equal(normalizeVecPrimaryKey('34'), 34);
  assert.throws(() => normalizeVecPrimaryKey('1.5'), /Invalid vec primary key/);
});

test('sqlite index BM25 fallback returns lexical semantic hit without embeddings', { skip: skipReason }, async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-sqlite-bm25-test-'));
  const dbPath = path.join(tempRoot, 'idx.db');
  const target = path.join(tempRoot, 'auth.js');

  fs.writeFileSync(target, 'export const jwtGuard = () => true;', 'utf8');

  const workspace = {
    resolveSearchBases: () => [tempRoot],
    normalizeTarget: (p) => p,
    *walkDirectories(base) {
      yield { files: [path.join(base, 'auth.js')] };
    },
    isLikelyTextFile: () => true,
    safeReadText: (p) => fs.readFileSync(p, 'utf8')
  };

  const service = new SqliteVecIndexService({
    workspace,
    dbPath,
    sqliteVecExtensionPath: '',
    chunkLines: 20,
    chunkOverlap: 5,
    maxTermsPerChunk: 40,
    maxIndexedFiles: 100
  });

  await service.indexProject({ projectPath: tempRoot, allRoots: false, force: false, maxFiles: 10 });
  const out = await service.semanticSearch({
    query: 'jwt guard',
    projectPath: tempRoot,
    allRoots: false,
    maxResults: 5,
    minScore: 0
  });

  assert.ok(out.length > 0);
  assert.equal(out[0].file, target);

  try { service.close(); } catch { /* ignore */ }
  fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
