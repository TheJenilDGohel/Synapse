import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAppTools } from '../src/interfaces/app/register-tools.js';
import {
  SEARCH_RESULT_SCHEMA,
  TRIPLE_RESULT_SCHEMA,
  STATUS_RESULT_SCHEMA,
  BATCH_RESULT_SCHEMA,
  MEMORY_RESULT_SCHEMA,
  ACK_RESULT_SCHEMA,
  BUNDLE_RESULT_SCHEMA,
  FREEFORM_RESULT_SCHEMA,
  toolResult
} from '../src/interfaces/mcp/common/index.js';

/**
 * MCP Tool Annotations Validation Test — Phase 39 (ANNOT-03).
 *
 * Drives the full `registerAppTools()` pipeline against a fake MCP server that
 * captures (name, meta.annotations) for every `registerTool()` call. Compares
 * the captured map against a hardcoded `EXPECTED_ANNOTATIONS` ground-truth map
 * covering all 74 tools (see Plan 02 frontmatter for the full table).
 *
 * This is the authoritative enforcement point for the MCP 2025-06-18 spec
 * annotation semantics across Synapse. Any drift — a new tool added without
 * annotations, an existing tool's annotation flipped — fails this test with a
 * single assertion listing every mismatch.
 *
 * Category legend:
 *   RO = Read-Only          { readOnlyHint: true,  destructiveHint: false, idempotentHint: true }
 *   WR = additive Write     { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
 *   IW = Idempotent Write   { readOnlyHint: false, destructiveHint: false, idempotentHint: true }
 *   DS = Destructive        { readOnlyHint: false, destructiveHint: true,  idempotentHint: true }
 *
 * openWorldHint is NOT asserted here (explicitly out of scope for Phase 39
 * per 39-CONTEXT.md <decisions>).
 */

// ---------------------------------------------------------------------------
// Fake server — duck-typed clone of test/mcp-tools.test.js:21-29.
// ---------------------------------------------------------------------------
function makeFakeServer() {
  const tools = new Map();
  return {
    tools,
    // eslint-disable-next-line no-unused-vars
    registerTool(name, meta, _handler) {
      tools.set(name, { meta });
    }
  };
}

// ---------------------------------------------------------------------------
// Fake services — COMPLETE enumeration of every services.* field touched by
// registerAppTools() at REGISTRATION time (not handler time).
//
// Source of truth (verified during Plan 02 Task 1 write-up):
//   - src/app/register-tools.ts:34-123 — 10 registrar calls
//   - src/services/memory/workflow.ts:82-86 — MemoryWorkflowService constructor
//     (no method calls; just field assignment)
//   - src/mcp/common/status.ts:149-200 — createServerStatusBuilder
//     (returns a closure; no construction-time calls)
//   - Every src/mcp/tools/*.ts register function — destructures options
//     and closes over services; no construction-time method invocations.
//
// Every method below is a noop that returns `undefined`. Handlers are never
// invoked by this test — we only care that destructuring + closure capture
// succeed, which requires every field to be PRESENT (not necessarily callable).
// ---------------------------------------------------------------------------
function makeFakeServices() {
  const noopAsync = async () => undefined;

  // memory — union of interfaces from: memory-store.ts, graph-tools.ts,
  // kg-delete-tools.ts, backfill-tools.ts, find-tools.ts, audit-tools.ts,
  // memory-workflow.ts, plus core.ts (server-status uses memory.getStatus).
  const memory = {
    // memory-store.ts MemoryService interface
    listEntries: noopAsync,
    getEntry: noopAsync,
    storeEntry: noopAsync,
    storeEntryBatch: noopAsync,
    updateEntry: noopAsync,
    deleteEntry: noopAsync,
    deleteEntryBatch: noopAsync,
    captureEvent: noopAsync,
    listEvents: noopAsync,
    suggestRelations: noopAsync,
    addRelation: noopAsync,
    removeRelation: noopAsync,
    getRelated: noopAsync,
    // graph-tools.ts MemoryService interface (22 methods)
    addEntity: noopAsync,
    addTriple: noopAsync,
    addEntityBatch: noopAsync,
    addTripleBatch: noopAsync,
    listEntities: noopAsync,
    queryEntityRelationships: noopAsync,
    invalidateTriple: noopAsync,
    queryTriplesAsOf: noopAsync,
    getEntityTimeline: noopAsync,
    getKgStats: noopAsync,
    listNests: noopAsync,
    listBranches: noopAsync,
    getTaxonomyTree: noopAsync,
    manageBranches: noopAsync,
    traverseGraph: noopAsync,
    discoverBridges: noopAsync,
    writeDiaryEntry: noopAsync,
    readDiaryEntries: noopAsync,
    ingestMarkdown: noopAsync,
    ingestJson: noopAsync,
    checkDuplicate: noopAsync,
    backfillMemoryKgLinks: noopAsync,
    store: {
      hooks: {
        // MemoryHooks interface from src/services/memory/hooks.ts — every
        // handler is a noop; getStats used by one tool at handler time only.
        getStats: () => ({ events: 0, workers: 0 }),
        listEvents: () => []
      }
    },
    // kg-delete-tools.ts MemoryService (3 methods)
    deleteEntity: noopAsync,
    deleteEntityBatch: noopAsync,
    deleteTripleBatch: noopAsync,
    // backfill-tools.ts MemoryService (1 method)
    scanAndBackfillProjects: noopAsync,
    // find-tools.ts MemoryServiceForFind
    recall: noopAsync,
    searchTriples: noopAsync,
    // audit-tools.ts MemoryService (1 method)
    audit: noopAsync,
    // memory-workflow.ts MemoryService (core shared)
    getStatus: noopAsync,
    whatsNew: noopAsync
  };

  // workspace — retrieval.ts WorkspaceService + server-status listRoots
  const workspace = {
    listRoots: () => [],
    listProjects: () => [],
    projectTree: () => ({}),
    readFileChunk: noopAsync,
    summarizeProject: () => ({}),
    resolveSearchBases: () => [],
    normalizeTarget: (p) => p,
    roots: []
  };

  // vectorIndex — retrieval.ts VectorIndexService + server-status uses getStatus
  const vectorIndex = {
    getStatus: () => ({
      backend: 'none',
      indexed: 0,
      embedding: { model: 'none', dim: 0 },
      sqlite_vec_loaded: false
    }),
    indexProject: noopAsync
  };

  // search — retrieval.ts SearchService + symbol-tools.ts SymbolSearchService
  //        + find-tools.ts SearchServiceForFind. All share the same `search`
  //        object in register-tools.ts; union all methods here.
  const search = {
    // retrieval.ts SearchService
    searchFiles: () => [],
    searchCode: () => [],
    searchHybrid: noopAsync,
    getSymbol: () => ({}),
    findUsages: () => ({}),
    // symbol-tools.ts SymbolSearchService
    findCallersSymbol: () => ({}),
    findDefinitionSymbol: () => ({}),
    findImplementationsSymbol: () => ({}),
    renamePreviewSymbol: () => ({})
  };

  // updates — core.ts UpdateService interface
  const updates = {
    getStatus: noopAsync,
    getCachedStatus: () => null,
    selfUpdate: noopAsync
  };

  // Top-level services object matches AppServices shape from
  // src/app/create-services.ts (duck-typed — only fields read by
  // register-tools.ts are needed).
  return {
    memory,
    workspace,
    vectorIndex,
    search,
    updates,
    getActiveIndexBackend: () => 'node-sqlite',
    getLastHealthReport: () => null
  };
}

// ---------------------------------------------------------------------------
// EXPECTED_ANNOTATIONS — hardcoded ground truth for all 74 tools.
// Alphabetically sorted so diffs are reviewable. Populated in Task 2.
// ---------------------------------------------------------------------------
const EXPECTED_ANNOTATIONS = {
  // Category legend: RO = read-only; WR = additive non-idempotent write;
  //                  IW = additive idempotent write; DS = destructive.
  // Alphabetically sorted — any drift here fails the test with a diff.
  'synapse_agent_prime':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO  (fixed Plan 01)
  'synapse_audit':                    { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_backup':                   { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_capture_outcome':          { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_diary_read':               { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_diary_write':              { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_embed_status':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO  (pure read per retrieval.ts:233-235)
  'synapse_file_changed':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_find':                     { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_find_callers':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_find_definition':          { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_find_implementations':     { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_find_usages':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_get_symbol':               { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_graph_bridges':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_graph_traverse':           { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_health':                   { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_help':                     { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_hooks_list_events':        { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_hooks_stats':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_index_project':            { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR (builds index; force=true rebuilds)
  'synapse_index_status':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_ingest_json':              { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW (source_label + fingerprint dedup)
  'synapse_ingest_markdown':          { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_kg_add_entities_batch':    { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW (dedups by name)
  'synapse_kg_add_entity':            { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_kg_add_triple':            { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR (single: UNCONDITIONAL INSERT in kg.ts:220-224 — intentionally non-idempotent)
  'synapse_kg_add_triples_batch':     { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW (batch DOES dedup at kg-batch.ts:198-206 — fixed Plan 01)
  'synapse_kg_as_of':                 { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_kg_backfill_links':        { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_kg_list_entities':         { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_kg_delete_entities_batch': { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_kg_delete_entity':         { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_kg_delete_triples_batch':  { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_kg_invalidate':            { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW (sets valid_to; additive)
  'synapse_kg_query':                 { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_kg_stats':                 { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_kg_timeline':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_list_projects':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_list_roots':               { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_add_relation':      { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_memory_capture_event':     { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_memory_check_duplicate':   { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_delete':            { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_memory_delete_batch':      { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_memory_events':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_get':               { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_list':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_recall':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO  (fixed Plan 01)
  'synapse_memory_related':           { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_remove_relation':   { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS (Open Q3 — kept destructive: junction row is gone, not invalidated)
  'synapse_memory_status':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_store':             { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_memory_store_batch':       { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_memory_suggest_relations': { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_memory_update':            { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR (appends revision)
  'synapse_nest_branches':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_nest_list':                { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_nest_manage':              { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_nest_tree':                { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_project_backfill':         { readOnlyHint: false, destructiveHint: false, idempotentHint: true  }, // IW
  'synapse_project_tree':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_read_file':                { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_rename_preview':           { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO (dry-run)
  'synapse_restore':                  { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS
  'synapse_search_code':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_search_files':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_search_hybrid':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO  (fixed Plan 01)
  'synapse_server_status':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_summarize_project':        { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_task_context':             { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO  (fixed Plan 01)
  'synapse_teach':                    { readOnlyHint: false, destructiveHint: false, idempotentHint: false }, // WR
  'synapse_update_self':              { readOnlyHint: false, destructiveHint: true,  idempotentHint: true  }, // DS  (fixed Plan 01)
  'synapse_update_status':            { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_usage_guide':              { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }, // RO
  'synapse_whats_new':                { readOnlyHint: true,  destructiveHint: false, idempotentHint: true  }  // RO  (fixed Plan 01)
};

// ---------------------------------------------------------------------------
// EXPECTED_OUTPUT_SCHEMAS — Phase 40 STRUCT-02 ground truth for 74 tools.
// Short labels resolve via ARCHETYPE_MAP to archetype objects; identity
// equality is asserted. ENTITY dropped in Plan 01 revision.
// ---------------------------------------------------------------------------
const ARCHETYPE_MAP = {
  SEARCH:   SEARCH_RESULT_SCHEMA,
  TRIPLE:   TRIPLE_RESULT_SCHEMA,
  STATUS:   STATUS_RESULT_SCHEMA,
  BATCH:    BATCH_RESULT_SCHEMA,
  MEMORY:   MEMORY_RESULT_SCHEMA,
  ACK:      ACK_RESULT_SCHEMA,
  BUNDLE:   BUNDLE_RESULT_SCHEMA,
  FREEFORM: FREEFORM_RESULT_SCHEMA
};

const EXPECTED_OUTPUT_SCHEMAS = {
  'synapse_agent_prime':              'BUNDLE',
  'synapse_audit':                    'BUNDLE',
  'synapse_backup':                   'ACK',
  'synapse_capture_outcome':          'MEMORY',
  'synapse_diary_read':               'FREEFORM',
  'synapse_diary_write':              'ACK',
  'synapse_embed_status':             'STATUS',
  'synapse_file_changed':             'BUNDLE',
  'synapse_find':                     'SEARCH',
  'synapse_find_callers':             'SEARCH',
  'synapse_find_definition':          'SEARCH',
  'synapse_find_implementations':     'SEARCH',
  'synapse_find_usages':              'SEARCH',
  'synapse_get_symbol':               'SEARCH',
  'synapse_graph_bridges':            'BUNDLE',
  'synapse_graph_traverse':           'BUNDLE',
  'synapse_health':                   'STATUS',
  'synapse_help':                     'FREEFORM',
  'synapse_hooks_list_events':        'STATUS',
  'synapse_hooks_stats':              'STATUS',
  'synapse_index_project':            'STATUS',
  'synapse_index_status':             'STATUS',
  'synapse_ingest_json':              'BATCH',
  'synapse_ingest_markdown':          'BATCH',
  'synapse_kg_add_entities_batch':    'BATCH',
  'synapse_kg_add_entity':            'ACK',
  'synapse_kg_add_triple':            'TRIPLE',
  'synapse_kg_add_triples_batch':     'BATCH',
  'synapse_kg_as_of':                 'BUNDLE',
  'synapse_kg_backfill_links':        'BATCH',
  'synapse_kg_list_entities':         'SEARCH',
  'synapse_kg_delete_entities_batch': 'BATCH',
  'synapse_kg_delete_entity':         'ACK',
  'synapse_kg_delete_triples_batch':  'BATCH',
  'synapse_kg_invalidate':            'ACK',
  'synapse_kg_query':                 'BUNDLE',
  'synapse_kg_stats':                 'STATUS',
  'synapse_kg_timeline':              'BUNDLE',
  'synapse_list_projects':            'SEARCH',
  'synapse_list_roots':               'SEARCH',
  'synapse_memory_add_relation':      'ACK',
  'synapse_memory_capture_event':     'MEMORY',
  'synapse_memory_check_duplicate':   'BUNDLE',
  'synapse_memory_delete':            'ACK',
  'synapse_memory_delete_batch':      'BATCH',
  'synapse_memory_events':            'SEARCH',
  'synapse_memory_get':               'MEMORY',
  'synapse_memory_list':              'SEARCH',
  'synapse_memory_recall':            'SEARCH',
  'synapse_memory_related':           'SEARCH',
  'synapse_memory_remove_relation':   'ACK',
  'synapse_memory_status':            'STATUS',
  'synapse_memory_store':             'MEMORY',
  'synapse_memory_store_batch':       'BATCH',
  'synapse_memory_suggest_relations': 'SEARCH',
  'synapse_memory_update':            'MEMORY',
  'synapse_nest_branches':            'BUNDLE',
  'synapse_nest_list':                'BUNDLE',
  'synapse_nest_manage':              'BUNDLE',
  'synapse_nest_tree':                'BUNDLE',
  'synapse_project_backfill':         'BATCH',
  'synapse_project_tree':             'BUNDLE',
  'synapse_read_file':                'BUNDLE',
  'synapse_rename_preview':           'SEARCH',
  'synapse_restore':                  'ACK',
  'synapse_search_code':              'SEARCH',
  'synapse_search_files':             'SEARCH',
  'synapse_search_hybrid':            'SEARCH',
  'synapse_server_status':            'STATUS',
  'synapse_summarize_project':        'BUNDLE',
  'synapse_task_context':             'BUNDLE',
  'synapse_teach':                    'MEMORY',
  'synapse_update_self':              'ACK',
  'synapse_update_status':            'STATUS',
  'synapse_usage_guide':              'FREEFORM',
  'synapse_whats_new':                'BUNDLE'
};

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------
test('mcp-annotations: all 74 tools match expected readOnly/destructive/idempotent hints', () => {
  const server = makeFakeServer();
  const fakeRuntime = {
    mcpMode: 'stdio',
    hasRipgrep: false,
    autoProjectSplit: false,
    maxAutoProjects: 0,
    forceSplitChildren: false,
    rgTimeoutMs: 0,
    indexBackend: 'none',
    vectorIndexPath: '/tmp/fake.idx'
  };
  const fakeServices = makeFakeServices();

  registerAppTools(server, fakeRuntime, fakeServices);

  const registered = Array.from(server.tools.keys()).sort();
  const expected = Object.keys(EXPECTED_ANNOTATIONS).sort();

  // 1. Registered tool set matches expected set
  const unregistered = expected.filter((n) => !registered.includes(n));
  const unexpected = registered.filter((n) => !expected.includes(n));
  assert.deepEqual(
    unregistered,
    [],
    `Tools in EXPECTED_ANNOTATIONS but not registered: ${unregistered.join(', ')}`
  );
  assert.deepEqual(
    unexpected,
    [],
    `Tools registered but missing from EXPECTED_ANNOTATIONS: ${unexpected.join(', ')}`
  );

  // 2. Collect-all-mismatches — one failure message lists every drift
  const mismatches = [];
  for (const name of expected) {
    const { meta } = server.tools.get(name);
    const actual = meta.annotations || {};
    const want = EXPECTED_ANNOTATIONS[name];
    for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint']) {
      if (actual[key] !== want[key]) {
        mismatches.push(`${name}.${key}: expected ${want[key]}, got ${actual[key]}`);
      }
    }
  }
  assert.equal(
    mismatches.length,
    0,
    `Annotation mismatches (${mismatches.length} total):\n  ${mismatches.join('\n  ')}`
  );
});

// ---------------------------------------------------------------------------
// Test 2: output schema identity — STRUCT-02
// ---------------------------------------------------------------------------
test('mcp-annotations: all 74 tools declare expected outputSchema archetypes', () => {
  const server = makeFakeServer();
  const fakeRuntime = {
    mcpMode: 'stdio', hasRipgrep: false, autoProjectSplit: false,
    maxAutoProjects: 0, forceSplitChildren: false, rgTimeoutMs: 0,
    indexBackend: 'none', vectorIndexPath: '/tmp/fake.idx'
  };
  const fakeServices = makeFakeServices();

  registerAppTools(server, fakeRuntime, fakeServices);

  const registered = Array.from(server.tools.keys()).sort();
  const expected = Object.keys(EXPECTED_OUTPUT_SCHEMAS).sort();

  // 1. Registered tool set matches expected set (defense-in-depth;
  //    the Test 1 assertion already covers this but the parallel check
  //    locks the EXPECTED_OUTPUT_SCHEMAS map to 74 entries).
  assert.deepEqual(
    expected.filter((n) => !registered.includes(n)), [],
    'Tools in EXPECTED_OUTPUT_SCHEMAS but not registered'
  );
  assert.deepEqual(
    registered.filter((n) => !expected.includes(n)), [],
    'Tools registered but missing from EXPECTED_OUTPUT_SCHEMAS'
  );

  // 2. Collect-all-mismatches (same pattern as Test 1) — identity equality
  const mismatches = [];
  for (const name of expected) {
    const { meta } = server.tools.get(name);
    const expectedLabel = EXPECTED_OUTPUT_SCHEMAS[name];
    const expectedArchetype = ARCHETYPE_MAP[expectedLabel];
    if (meta.outputSchema !== expectedArchetype) {
      // Drift: either missing entirely, wrong archetype, or accidentally
      // reallocated to an equivalent-but-distinct object.
      const got = meta.outputSchema === undefined
        ? 'undefined (no outputSchema set)'
        : 'different object (possibly reallocated)';
      mismatches.push(`${name}: expected ${expectedLabel}_RESULT_SCHEMA, got ${got}`);
    }
  }
  assert.equal(
    mismatches.length, 0,
    `outputSchema mismatches (${mismatches.length} total):\n  ${mismatches.join('\n  ')}`
  );
});

// ---------------------------------------------------------------------------
// Test 3: toolResult envelope produces structuredContent AND text content — STRUCT-01
// ---------------------------------------------------------------------------
test('mcp-annotations: toolResult() populates both structuredContent.data and content[0].text', () => {
  const result = toolResult({ foo: 'bar' }, 'json', 'Test');
  assert.ok(result.structuredContent, 'toolResult must return structuredContent');
  assert.deepEqual(
    result.structuredContent.data,
    { foo: 'bar' },
    'structuredContent.data must equal the input payload'
  );
  assert.ok(
    result.structuredContent.meta && result.structuredContent.meta.schema_version,
    'structuredContent.meta.schema_version must be present'
  );
  assert.ok(Array.isArray(result.content), 'content must be an array');
  assert.equal(result.content.length, 1, 'content must have exactly one text block');
  assert.equal(result.content[0].type, 'text', 'content[0].type must be "text"');
  assert.ok(
    result.content[0].text.includes('"foo"') && result.content[0].text.includes('"bar"'),
    'content[0].text must contain the JSON-serialized payload'
  );
});
