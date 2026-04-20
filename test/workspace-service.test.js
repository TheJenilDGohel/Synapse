import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceService } from '../src/services/workspace/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-workspace-test-'));
}

function makeWorkspace(root, opts = {}) {
  return new WorkspaceService({
    roots: [{ label: 'root', path: root }],
    ignoreDirs: new Set(['node_modules', 'build']),
    textExtensions: new Set(['.js', '.ts', '.md', '.txt']),
    projectMarkerFiles: new Set(['package.json', 'pubspec.yaml']),
    projectHintDirs: new Set(['src', 'lib', 'test']),
    extraProjectMarkers: new Set(['.project-marker']),
    maxFileBytes: opts.maxFileBytes || 1024,
    autoProjectSplit: opts.autoProjectSplit ?? true,
    maxAutoProjects: opts.maxAutoProjects || 10,
    forceSplitChildren: opts.forceSplitChildren ?? false
  });
}

test('normalizeTarget enforces root boundaries', () => {
  const root = makeTempDir();
  const service = makeWorkspace(root);

  const inside = service.normalizeTarget('./');
  assert.equal(inside, path.resolve(root));

  assert.throws(() => service.normalizeTarget(path.resolve(root, '..')), /outside configured roots/);
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('resolveSearchBases auto split and fallback behavior', () => {
  const root = makeTempDir();
  const projA = path.join(root, 'proj-a');
  const projB = path.join(root, 'proj-b');
  fs.mkdirSync(projA);
  fs.mkdirSync(path.join(projA, 'src'), { recursive: true });
  fs.writeFileSync(path.join(projA, 'package.json'), '{}', 'utf8');
  fs.mkdirSync(path.join(projB, 'random'), { recursive: true });

  const splitService = makeWorkspace(root, { autoProjectSplit: true, forceSplitChildren: false });
  const splitBases = splitService.resolveSearchBases(undefined, false);
  assert.equal(splitBases.length, 1);
  assert.equal(splitBases[0], projA);

  const forceService = makeWorkspace(root, { autoProjectSplit: true, forceSplitChildren: true, maxAutoProjects: 5 });
  const forcedWhenProjectsExist = forceService.resolveSearchBases(undefined, false);
  assert.deepEqual(forcedWhenProjectsExist, [projA]);

  // forceSplitChildren applies only when no explicit project markers are found.
  fs.rmSync(path.join(projA, 'package.json'));
  const forced = forceService.resolveSearchBases(undefined, false);
  assert.ok(forced.includes(projA));
  assert.ok(forced.includes(projB));

  const noSplitService = makeWorkspace(root, { autoProjectSplit: false });
  const raw = noSplitService.resolveSearchBases(undefined, false);
  assert.deepEqual(raw, [root]);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('listProjects/projectTree/summarizeProject/readFileChunk flows', async () => {
  const root = makeTempDir();
  const proj = path.join(root, 'proj');
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  fs.mkdirSync(path.join(proj, '.hidden-dir'));
  fs.writeFileSync(path.join(proj, 'package.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(proj, 'src', 'main.js'), 'a\nb\nc\nd\n123456789', 'utf8');
  fs.writeFileSync(path.join(proj, 'README.md'), '# hi', 'utf8');
  fs.writeFileSync(path.join(proj, '.hidden.txt'), 'hidden', 'utf8');

  const service = makeWorkspace(root, { maxFileBytes: 1024 });

  const projects = service.listProjects(root, 10);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'proj');
  assert.match(projects[0].markers, /node/);

  const tree = service.projectTree(proj, 3, 20);
  assert.ok(tree.some((l) => l.includes('src/')));
  assert.ok(tree.some((l) => l.includes('main.js')));

  const summary = service.summarizeProject(proj, 1);
  assert.equal(summary.truncated, true);
  assert.equal(summary.files_counted, 1);

  const chunk = await service.readFileChunk(path.join(proj, 'src', 'main.js'), 3, 20, 2);
  assert.equal(chunk.start_line, 3);
  assert.equal(chunk.end_line, 4);
  assert.match(chunk.content, /^3: c/m);

  const tinyLimitService = makeWorkspace(root, { maxFileBytes: 7 });
  assert.throws(() => tinyLimitService.safeReadText(path.join(proj, 'src', 'main.js')), /File too large/);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('readFileChunk returns warning and content when file exceeds cap', async () => {
  const root = makeTempDir();
  const proj = path.join(root, 'proj');
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  const filePath = path.join(proj, 'src', 'large.js');
  fs.writeFileSync(filePath, 'l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\n', 'utf8');

  const service = makeWorkspace(root, { maxFileBytes: 12 });
  const chunk = await service.readFileChunk(filePath, 4, 7, 10);

  assert.match(chunk.warning || '', /File exceeds cap/);
  assert.equal(chunk.file_size_bytes > chunk.cap_bytes, true);
  assert.equal(chunk.start_line, 4);
  assert.equal(chunk.end_line, 7);
  assert.match(chunk.content, /^4: l4/m);
  assert.match(chunk.content, /^7: l7/m);

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('readFileChunk reports explicit path and scope errors', async () => {
  const root = makeTempDir();
  const proj = path.join(root, 'proj');
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  fs.writeFileSync(path.join(proj, 'src', 'main.js'), 'a\nb\n', 'utf8');

  const service = makeWorkspace(root, { maxFileBytes: 1024 });

  await assert.rejects(
    () => service.readFileChunk(path.join(root, '..', 'outside.js'), 1, 5, 10),
    /invalid read_file path ".*outside\.js": path is outside configured roots/
  );
  await assert.rejects(
    () => service.readFileChunk(path.join(proj, 'missing.js'), 1, 5, 10),
    /path not found: .*missing\.js/
  );
  await assert.rejects(
    () => service.readFileChunk(path.join(proj, 'src'), 1, 5, 10),
    /path is not a file: .*src/
  );

  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
