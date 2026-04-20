import test from 'node:test';
import assert from 'node:assert/strict';

// Dynamic import for ESM compat
const { toMinimalWriteResponse, stripEmptyFields } = await import('../src/mcp/common/terse-utils.js');

// --- toMinimalWriteResponse tests ---

test('toMinimalWriteResponse: minimal strips to {id, ok}', () => {
  const full = { id: 'abc', kind: 'knowledge', title: 'Auth fix', summary: 'long...', content: 'very long...', status: 'active', importance: 75, confidence: 0.9, revisions: [], memory: {} };
  const result = toMinimalWriteResponse(full, 'minimal');
  assert.deepStrictEqual(result, { id: 'abc', ok: true });
});

test('toMinimalWriteResponse: verbose returns full object', () => {
  const full = { id: 'abc', kind: 'knowledge' };
  const result = toMinimalWriteResponse(full, 'verbose');
  assert.deepStrictEqual(result, full);
});

test('toMinimalWriteResponse: undefined terse returns full object (default behavior)', () => {
  const full = { id: 'abc', kind: 'knowledge' };
  const result = toMinimalWriteResponse(full, undefined);
  assert.deepStrictEqual(result, full);
});

test('toMinimalWriteResponse: event_id fallback', () => {
  const result = toMinimalWriteResponse({ event_id: 42, event_type: 'task', signal_score: 80 }, 'minimal');
  assert.deepStrictEqual(result, { id: 42, ok: true });
});

test('toMinimalWriteResponse: source_id fallback, ok from !skipped', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ source_id: 'src-1', skipped: false, turn_count: 10 }, 'minimal'),
    { id: 'src-1', ok: true }
  );
});

test('toMinimalWriteResponse: skipped=true means ok=false', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ source_id: 'src-1', skipped: true, reason: 'already ingested' }, 'minimal'),
    { id: 'src-1', ok: false }
  );
});

test('toMinimalWriteResponse: deleted=true means ok=true', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ id: 'del-1', deleted: true }, 'minimal'),
    { id: 'del-1', ok: true }
  );
});

test('toMinimalWriteResponse: removed=false means ok=false', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ removed: false, source_id: 'x', target_id: 'y' }, 'minimal'),
    { id: 'x', ok: false }
  );
});

test('toMinimalWriteResponse: invalidated=true means ok=true', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ id: 'tri-1', invalidated: true, valid_to: '2026-01-01' }, 'minimal'),
    { id: 'tri-1', ok: true }
  );
});

test('toMinimalWriteResponse: captured=true means ok=true', () => {
  assert.deepStrictEqual(
    toMinimalWriteResponse({ captured: true, event: { event_id: 7 }, id: null }, 'minimal'),
    { id: null, ok: true }
  );
});

// --- Registration smoke test ---
// Verify all 13 write tools have 'terse' in their schema

test('MCP registration: all 13 write tools include terse parameter', async () => {
  const { registerMemoryStoreTools } = await import('../src/mcp/tools/memory-store.js');
  const { registerMemoryWorkflowTools } = await import('../src/mcp/tools/memory-workflow.js');
  const { registerGraphTools } = await import('../src/mcp/tools/graph-tools.js');
  const {
    SEARCH_RESULT_SCHEMA,
    TRIPLE_RESULT_SCHEMA,
    STATUS_RESULT_SCHEMA,
    BATCH_RESULT_SCHEMA,
    MEMORY_RESULT_SCHEMA,
    ACK_RESULT_SCHEMA,
    BUNDLE_RESULT_SCHEMA,
    FREEFORM_RESULT_SCHEMA
  } = await import('../src/mcp/common/index.js');
  const { z } = await import('zod');

  const tools = new Map();
  const fakeRegister = (names, def, /* handler */) => {
    const canonical = Array.isArray(names) ? names[0] : names;
    tools.set(canonical, def);
  };

  const schemas = {
    MEMORY_KIND_SCHEMA: z.enum(['knowledge', 'preference']).default('knowledge'),
    MEMORY_STATUS_SCHEMA: z.enum(['active', 'stale', 'archived']).default('active'),
    MEMORY_SCOPE_SCHEMA: z.object({}).default({}),
    MEMORY_LINK_SCHEMA: z.object({ path: z.string() }),
    MEMORY_EVENT_TYPE_SCHEMA: z.enum(['task', 'bugfix', 'decision', 'review', 'preference']).default('task'),
    MEMORY_EVENT_STATUS_SCHEMA: z.enum(['in_progress', 'completed', 'resolved', 'ignored', 'merged']).default('completed'),
    // Phase 40 Plan 02: output archetypes consumed by Group A tool files
    OUTPUT_SEARCH_RESULT_SCHEMA: SEARCH_RESULT_SCHEMA,
    OUTPUT_TRIPLE_RESULT_SCHEMA: TRIPLE_RESULT_SCHEMA,
    OUTPUT_STATUS_RESULT_SCHEMA: STATUS_RESULT_SCHEMA,
    OUTPUT_BATCH_RESULT_SCHEMA: BATCH_RESULT_SCHEMA,
    OUTPUT_MEMORY_RESULT_SCHEMA: MEMORY_RESULT_SCHEMA,
    OUTPUT_ACK_RESULT_SCHEMA: ACK_RESULT_SCHEMA,
    OUTPUT_BUNDLE_RESULT_SCHEMA: BUNDLE_RESULT_SCHEMA,
    OUTPUT_FREEFORM_RESULT_SCHEMA: FREEFORM_RESULT_SCHEMA
  };
  const noop = async () => ({});
  const fakeMemory = new Proxy({}, { get: () => noop });
  const fakeWorkflow = new Proxy({}, { get: () => noop });

  registerMemoryStoreTools({ registerJsonTool: fakeRegister, schemas, memory: fakeMemory });
  registerMemoryWorkflowTools({ registerJsonTool: fakeRegister, schemas, memory: fakeMemory, memoryWorkflow: fakeWorkflow });
  registerGraphTools({ registerJsonTool: fakeRegister, memory: fakeMemory, schemas });

  const writeToolNames = [
    'synapse_memory_store', 'synapse_memory_update', 'synapse_memory_delete',
    'synapse_memory_capture_event', 'synapse_memory_add_relation', 'synapse_memory_remove_relation',
    'synapse_capture_outcome',
    'synapse_kg_add_entity', 'synapse_kg_add_triple', 'synapse_kg_invalidate',
    'synapse_diary_write', 'synapse_ingest_markdown', 'synapse_ingest_json'
  ];

  for (const name of writeToolNames) {
    const tool = tools.get(name);
    assert.ok(tool, `Tool ${name} must be registered`);
    assert.ok(tool.inputSchema?.terse, `Tool ${name} must have 'terse' in inputSchema`);
  }
});

// --- stripEmptyFields tests ---

test('stripEmptyFields: removes empty nest, branch, topic, feature', () => {
  const entry = { id: 'x', nest: '', branch: '', topic: '', feature: '', kind: 'knowledge', title: 'Test' };
  const result = stripEmptyFields(entry);
  assert.equal(result.id, 'x');
  assert.equal(result.kind, 'knowledge');
  assert.equal('nest' in result, false);
  assert.equal('branch' in result, false);
  assert.equal('topic' in result, false);
  assert.equal('feature' in result, false);
});

test('stripEmptyFields: keeps non-empty taxonomy fields', () => {
  const entry = { id: 'x', nest: 'my-nest', branch: 'main', topic: 'auth', feature: 'login' };
  const result = stripEmptyFields(entry);
  assert.equal(result.nest, 'my-nest');
  assert.equal(result.branch, 'main');
  assert.equal(result.topic, 'auth');
  assert.equal(result.feature, 'login');
});

test('stripEmptyFields: removes scope_* duplicates', () => {
  const entry = { id: 'x', scope_root_path: '/root', scope_project_path: '/proj', scope_branch_name: 'main', title: 'Test' };
  const result = stripEmptyFields(entry);
  assert.equal('scope_root_path' in result, false);
  assert.equal('scope_project_path' in result, false);
  assert.equal('scope_branch_name' in result, false);
  assert.equal(result.title, 'Test');
});

test('stripEmptyFields: removes raw_score when score present', () => {
  const item = { score: 0.85, raw_score: 0.72, memory: { id: 'x' } };
  const result = stripEmptyFields(item);
  assert.equal(result.score, 0.85);
  assert.equal('raw_score' in result, false);
});

test('stripEmptyFields: keeps raw_score when score NOT present', () => {
  const item = { raw_score: 0.72, memory: { id: 'x' } };
  const result = stripEmptyFields(item);
  assert.equal(result.raw_score, 0.72);
});

test('stripEmptyFields: recurses into memory sub-object', () => {
  const item = {
    score: 0.9,
    raw_score: 0.7,
    memory: { id: 'x', nest: '', branch: '', topic: 'auth', feature: '', scope_root_path: '/r', kind: 'knowledge' }
  };
  const result = stripEmptyFields(item);
  assert.equal('raw_score' in result, false);
  assert.equal('nest' in result.memory, false);
  assert.equal('branch' in result.memory, false);
  assert.equal(result.memory.topic, 'auth');
  assert.equal('feature' in result.memory, false);
  assert.equal('scope_root_path' in result.memory, false);
});

test('stripEmptyFields: handles null/undefined/array gracefully', () => {
  assert.equal(stripEmptyFields(null), null);
  assert.equal(stripEmptyFields(undefined), undefined);
  const arr = [1, 2, 3];
  assert.deepStrictEqual(stripEmptyFields(arr), arr);
});

// --- Benchmark tests (TERSE-05) ---

test('TERSE-05 benchmark: write portion >= 70% reduction', () => {
  // Construct 10 representative verbose write responses
  const makeFullMemoryResponse = (i) => ({
    id: `mem-${i}`, kind: 'knowledge', title: `Memory ${i}`, summary: 'A summary of the memory entry that contains relevant information about the task.',
    content: 'Detailed content about the memory entry including code snippets, decisions, and context that would be stored in a real memory entry. This is typically much longer than the summary.',
    status: 'active', importance: 75, confidence: 0.9,
    revisions: [{ revision: 1, title: `Memory ${i}`, summary: 'Initial', content: 'Initial content', tags: ['test'], links: [], change_note: 'created', created_at: '2026-04-10T00:00:00Z' }],
    memory: {
      id: `mem-${i}`, kind: 'knowledge', title: `Memory ${i}`, summary: 'A summary...',
      content: 'Detailed content...', status: 'active', importance: 75, confidence: 0.9,
      scope_root_path: '/home/user/projects', scope_project_path: '/home/user/projects/app',
      scope_branch_name: 'main', topic: '', feature: '', nest: '', branch: '',
      agent_id: '', tags: ['test', 'auth'], links: [], source_type: 'manual', source_ref: '',
      created_at: '2026-04-10T00:00:00Z', updated_at: '2026-04-10T00:00:00Z',
      last_recalled_at: null, recall_count: 0
    },
    created: true, duplicate: false
  });

  const makeKgTripleResponse = (i) => ({
    id: `triple-${i}`, subject_id: `entity_a_${i}`, predicate: 'depends_on', object_id: `entity_b_${i}`,
    valid_from: '2026-04-10T00:00:00Z', valid_to: null, confidence: 1.0,
    source_memory_id: null, source_type: 'manual', created_at: '2026-04-10T00:00:00Z',
    contradictions: [], has_contradiction: false
  });

  const verboseWriteResponses = [];
  for (let i = 0; i < 5; i++) verboseWriteResponses.push(makeFullMemoryResponse(i));
  for (let i = 0; i < 5; i++) verboseWriteResponses.push(makeKgTripleResponse(i));

  const verboseSize = verboseWriteResponses.reduce((sum, r) => sum + JSON.stringify(r).length, 0);
  const minimalSize = verboseWriteResponses.reduce((sum, r) => sum + JSON.stringify(toMinimalWriteResponse(r, 'minimal')).length, 0);

  const reduction = (1 - minimalSize / verboseSize) * 100;
  assert.ok(reduction >= 70, `Write token reduction was ${reduction.toFixed(1)}% — must be >= 70%`);
});

test('TERSE-05 benchmark: read cleanup also reduces size (informational)', () => {
  const makeRecallItem = (i) => ({
    score: 0.85 + i * 0.01,
    raw_score: 0.72 + i * 0.01,
    memory: {
      id: `mem-${i}`, kind: 'knowledge', title: `Memory ${i}`,
      summary: 'A summary', content: 'Content', status: 'active',
      importance: 75, confidence: 0.9,
      scope_root_path: '/home/user/projects', scope_project_path: '/home/user/projects/app',
      scope_branch_name: 'main', topic: '', feature: '', nest: '', branch: '',
      agent_id: '', tags: ['test'], links: [],
      source_type: 'manual', source_ref: '',
      created_at: '2026-04-10', updated_at: '2026-04-10',
      last_recalled_at: null, recall_count: 0
    }
  });

  const readResponses = [];
  for (let i = 0; i < 5; i++) readResponses.push(makeRecallItem(i));

  const beforeSize = readResponses.reduce((sum, r) => sum + JSON.stringify(r).length, 0);
  const afterSize = readResponses.reduce((sum, r) => sum + JSON.stringify(stripEmptyFields(r)).length, 0);

  const reduction = (1 - afterSize / beforeSize) * 100;
  // Informational — read cleanup is modest (removes ~6-10 fields per item)
  // We just ensure it's positive and doesn't inflate
  assert.ok(reduction > 0, `Read cleanup should reduce size, got ${reduction.toFixed(1)}%`);
});
