import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerRetrievalTools } from '../src/interfaces/mcp/tools/retrieval.js';
import {
  toolResult,
  paginateItems,
  getMimeTypeFromPath
} from '../src/interfaces/mcp/common/index.js';

/**
 * Cross-platform helper: produce the `file://` URI that `buildResourceLink`
 * will return for a given POSIX-style test path. On POSIX this is a 1:1
 * passthrough; on Windows `path.resolve` yields an absolute drive-letter
 * path and `pathToFileURL` handles the rest (e.g. `file:///D:/tmp/auth.ts`).
 */
function expectedFileUri(posixPath) {
  return pathToFileURL(path.resolve(posixPath)).href;
}

/**
 * MCP Resource Links Test -- Phase 41 (RLINK-01, RLINK-02, RLINK-03).
 *
 * Drives registerRetrievalTools() directly with fake workspace + fake search
 * services. Captures the handler functions via a fake registerJsonTool, invokes
 * them with mock args, threads the result through the real toolResult(), and
 * asserts on the content[] resource_link blocks.
 *
 * Why direct registration (not registerAppTools) -- Phase 41 affects exactly 3
 * tools out of 72; isolating the test scope keeps the fake-services surface
 * minimal and makes failures point straight at the 3 handlers under test.
 */

// ---------------------------------------------------------------------------
// Fake registerJsonTool -- captures handlers by tool name.
// ---------------------------------------------------------------------------
function makeHandlerCapture() {
  const handlers = new Map();
  const registerJsonTool = (names, def, handler) => {
    const canonical = Array.isArray(names) ? names[0] : names;
    handlers.set(canonical, { def, handler });
  };
  return { handlers, registerJsonTool };
}

// ---------------------------------------------------------------------------
// Fake workspace service -- only the methods the 3 handlers under test call.
// ---------------------------------------------------------------------------
function makeFakeWorkspace(overrides = {}) {
  return {
    listRoots: () => [],
    listProjects: () => [],
    projectTree: () => ({ entries: [] }),
    readFileChunk: async (filePath /* , startLine, endLine, maxWidth */) => {
      // Default: successful read of /tmp/helper.ts lines 10-80 of 320.
      return {
        path: filePath || '/tmp/helper.ts',
        start_line: 10,
        end_line: 80,
        total_lines: 320,
        content: '10: line ten\n11: line eleven\n...'
      };
    },
    summarizeProject: () => ({ summary: '' }),
    resolveSearchBases: () => ['/tmp'],
    ...overrides
  };
}

function makeFakeVectorIndex() {
  return {
    getStatus: () => ({}),
    indexProject: async () => ({})
  };
}

function makeFakeSearch(overrides = {}) {
  return {
    searchFiles: () => [],
    searchCode: () => [],
    searchHybrid: async () => ({ results: [] }),
    getSymbol: () => ({}),
    findUsages: () => ({}),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Helper: register the 3 retrieval tools with a fake stack and return the
// captured handler map plus a function to invoke a tool by name.
// ---------------------------------------------------------------------------
function bootRetrieval({ workspace, search } = {}) {
  const capture = makeHandlerCapture();
  registerRetrievalTools({
    registerJsonTool: capture.registerJsonTool,
    paginateItems,
    workspace: workspace || makeFakeWorkspace(),
    vectorIndex: makeFakeVectorIndex(),
    search: search || makeFakeSearch(),
    defaultMaxReadLines: 200,
    defaultMaxResults: 50,
    memory: null
  });
  return capture;
}

async function invokeHandler(capture, toolName, args) {
  const entry = capture.handlers.get(toolName);
  assert.ok(entry, `tool not registered: ${toolName}`);
  const data = await entry.handler(args, /* extra */ {});
  // Thread through the real toolResult -- this is what the registrar wrapper
  // does in production. Pass undefined for the 4th arg so the resource_links
  // channel from createToolResponse on the payload is the only path tested.
  return toolResult(data, 'json', entry.def.markdownTitle || entry.def.title);
}

// ---------------------------------------------------------------------------
// Test 1: read_file happy path emits exactly 1 resource_link
// ---------------------------------------------------------------------------
test('read_file emits one resource_link with file:// uri, basename, description, and mimeType', async () => {
  const workspace = makeFakeWorkspace({
    readFileChunk: async () => ({
      path: '/tmp/helper.ts',
      start_line: 10,
      end_line: 80,
      total_lines: 320,
      content: '10: foo\n80: bar'
    })
  });
  const capture = bootRetrieval({ workspace });
  const result = await invokeHandler(capture, 'synapse_read_file', {
    path: '/tmp/helper.ts',
    start_line: 10,
    end_line: 80
  });

  // content[] must have a text block + exactly 1 resource_link block
  assert.equal(result.content.length, 2, 'expected text + 1 resource_link');
  assert.equal(result.content[0].type, 'text');
  const link = result.content[1];
  assert.equal(link.type, 'resource_link');
  assert.equal(link.uri, expectedFileUri('/tmp/helper.ts'));
  assert.equal(link.name, 'helper.ts');
  assert.match(link.description, /^chunk 10-80 of 320 lines$/);
  assert.equal(link.mimeType, 'text/typescript');
});

// ---------------------------------------------------------------------------
// Test 2: search_files dedupes by absolute path
// ---------------------------------------------------------------------------
test('search_files dedupes 3 matches across 2 unique paths into 2 resource_links', async () => {
  const search = makeFakeSearch({
    searchFiles: () => [
      { file: '/tmp/auth.ts',  relative_path: 'src/auth.ts',  name: 'auth.ts' },
      { file: '/tmp/login.ts', relative_path: 'src/login.ts', name: 'login.ts' },
      { file: '/tmp/auth.ts',  relative_path: 'src/auth.ts',  name: 'auth.ts' }
    ]
  });
  const capture = bootRetrieval({ search });
  const result = await invokeHandler(capture, 'synapse_search_files', {
    query: 'auth',
    max_results: 50,
    case_sensitive: false,
    all_roots: false
  });

  // text block + 2 resource_links (NOT 3 -- dedup by absolute path)
  assert.equal(result.content.length, 3);
  const links = result.content.slice(1);
  const uris = links.map(l => l.uri).sort();
  assert.deepEqual(uris, [expectedFileUri('/tmp/auth.ts'), expectedFileUri('/tmp/login.ts')]);
  for (const link of links) {
    assert.equal(link.type, 'resource_link');
    assert.match(link.description, /^path match: /);
  }
});

// ---------------------------------------------------------------------------
// Test 3: search_code dedupes by absolute path with per-file counts
// ---------------------------------------------------------------------------
test('search_code dedupes 5 matches across 3 unique paths into 3 resource_links with counts', async () => {
  const search = makeFakeSearch({
    searchCode: () => [
      { file: '/tmp/a.ts', line: 1, text: 'foo' },
      { file: '/tmp/a.ts', line: 5, text: 'foo' },
      { file: '/tmp/a.ts', line: 9, text: 'foo' },
      { file: '/tmp/b.ts', line: 2, text: 'foo' },
      { file: '/tmp/c.go', line: 3, text: 'foo' }
    ]
  });
  const capture = bootRetrieval({ search });
  const result = await invokeHandler(capture, 'synapse_search_code', {
    query: 'foo',
    max_results: 50,
    case_sensitive: false,
    all_roots: false,
    glob: '*',
    context_lines: 0,
    use_regex: false
  });

  assert.equal(result.content.length, 4); // text + 3 resource_links
  const links = result.content.slice(1);
  const byUri = new Map(links.map(l => [l.uri, l]));
  assert.equal(byUri.size, 3);
  assert.match(byUri.get(expectedFileUri('/tmp/a.ts')).description, /3 matches for foo/);
  assert.match(byUri.get(expectedFileUri('/tmp/b.ts')).description, /1 match for foo/);
  assert.match(byUri.get(expectedFileUri('/tmp/c.go')).description, /1 match for foo/);
  assert.equal(byUri.get(expectedFileUri('/tmp/c.go')).mimeType, 'text/x-go');
});

// ---------------------------------------------------------------------------
// Test 4: empty search_code result emits zero resource_links
// ---------------------------------------------------------------------------
test('search_code empty result emits zero resource_links -- content[] has only text', async () => {
  const search = makeFakeSearch({
    searchCode: () => []
  });
  const capture = bootRetrieval({ search });
  const result = await invokeHandler(capture, 'synapse_search_code', {
    query: 'nothing',
    max_results: 50,
    case_sensitive: false,
    all_roots: false,
    glob: '*',
    context_lines: 0,
    use_regex: false
  });

  assert.equal(result.content.length, 1, 'empty result must have only text block');
  assert.equal(result.content[0].type, 'text');
});

// ---------------------------------------------------------------------------
// Test 5: read_file error path emits zero resource_links (handler rejects)
// ---------------------------------------------------------------------------
test('read_file rejection produces zero resource_links -- control never reaches toolResult', async () => {
  const workspace = makeFakeWorkspace({
    readFileChunk: async () => {
      throw new Error('path not found: /tmp/missing.ts');
    }
  });
  const capture = bootRetrieval({ workspace });
  await assert.rejects(
    () => invokeHandler(capture, 'synapse_read_file', {
      path: '/tmp/missing.ts',
      start_line: 1,
      end_line: 50
    }),
    /path not found/
  );
});

// ---------------------------------------------------------------------------
// Test 6: getMimeTypeFromPath returns correct mime for known extensions
// ---------------------------------------------------------------------------
test('getMimeTypeFromPath maps known extensions and returns undefined for unknown', () => {
  assert.equal(getMimeTypeFromPath('/x/foo.ts'),   'text/typescript');
  assert.equal(getMimeTypeFromPath('/x/foo.tsx'),  'text/typescript');
  assert.equal(getMimeTypeFromPath('/x/foo.js'),   'text/javascript');
  assert.equal(getMimeTypeFromPath('/x/foo.md'),   'text/markdown');
  assert.equal(getMimeTypeFromPath('/x/foo.json'), 'application/json');
  assert.equal(getMimeTypeFromPath('/x/foo.py'),   'text/x-python');
  assert.equal(getMimeTypeFromPath('/x/foo.go'),   'text/x-go');
  assert.equal(getMimeTypeFromPath('/x/foo.rs'),   'text/x-rust');
  assert.equal(getMimeTypeFromPath('/x/foo.xyz'),  undefined);
  assert.equal(getMimeTypeFromPath(''),            undefined);
});

// ---------------------------------------------------------------------------
// Test 7: structuredContent.data shape unchanged for read_file (backwards compat)
// ---------------------------------------------------------------------------
test('read_file structuredContent.data preserves pre-Phase-41 shape (RLINK-03 backwards compat)', async () => {
  const workspace = makeFakeWorkspace({
    readFileChunk: async () => ({
      path: '/tmp/helper.ts',
      start_line: 1,
      end_line: 5,
      total_lines: 100,
      content: '1: a\n2: b\n3: c\n4: d\n5: e'
    })
  });
  const capture = bootRetrieval({ workspace });
  const result = await invokeHandler(capture, 'synapse_read_file', {
    path: '/tmp/helper.ts',
    start_line: 1,
    end_line: 5
  });

  // structuredContent.data must have all the fields the normalizer produces.
  // Resource_links live ONLY in content[], not in structuredContent.
  const data = result.structuredContent.data;
  assert.equal(data.path, '/tmp/helper.ts');
  assert.equal(data.start_line, 1);
  assert.equal(data.end_line, 5);
  assert.equal(data.total_lines, 100);
  assert.ok(Array.isArray(data.lines));
  assert.equal(typeof data.content, 'string');
  // No resource_links bleed-through into structuredContent
  assert.equal(data.resource_links, undefined);
  assert.equal(data._resource_links, undefined);
});
