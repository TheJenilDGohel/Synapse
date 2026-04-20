import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createJsonToolRegistrar,
  paginateItems,
  registerCoreTools,
  registerMemoryWorkflowTools,
  registerMemoryStoreTools,
  registerRetrievalTools
} from '../src/mcp/index.js';
import {
  RESPONSE_FORMAT_SCHEMA,
  MEMORY_KIND_SCHEMA,
  MEMORY_STATUS_SCHEMA,
  MEMORY_SCOPE_SCHEMA,
  MEMORY_LINK_SCHEMA,
  MEMORY_EVENT_TYPE_SCHEMA,
  MEMORY_EVENT_STATUS_SCHEMA
} from '../src/mcp/index.js';

function makeFakeServer() {
  const tools = new Map();
  return {
    tools,
    registerTool(name, meta, handler) {
      tools.set(name, { meta, handler });
    }
  };
}

function makeFixture() {
  const calls = [];
  const mark = (name, payload) => {
    calls.push({ name, payload });
  };

  const workspace = {
    roots: [{ label: 'root', path: '/tmp/root' }],
    listRoots: () => [{ label: 'root', path: '/tmp/root' }],
    listProjects: () => [{ path: '/tmp/root/p1' }, { path: '/tmp/root/p2' }],
    projectTree: (projectPath) => [`${projectPath}/`, '  README.md'],
    readFileChunk: (filePath, start, end) => ({ path: filePath, start_line: start, end_line: end, content: `${start}: alpha\n${start + 1}: beta` }),
    summarizeProject: (projectPath) => ({ project_path: projectPath, summary: 'ok' }),
    resolveSearchBases: (projectPath, allRoots) => (allRoots ? ['/tmp/root'] : [projectPath || '/tmp/root']),
    normalizeTarget: (inputPath) => inputPath
  };

  const vectorIndex = {
    getStatus: () => ({
      backend: 'sqlite-vec',
      total_files: 1,
      upgrade_recommended: false,
      upgrade_reason: null,
      embedding: {
        provider: 'huggingface',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        enabled: true,
        available: true,
        dimensions: 384
      },
      sqlite_vec_loaded: true,
      sqlite_vec_extension: { loaded: true, state: 'loaded' },
      sqlite_vec_table_ready: true
    }),
    indexProject: async (args) => {
      mark('indexProject', args);
      return { failed_files: [] };
    }
  };

  const search = {
    searchFiles: (args) => {
      mark('searchFiles', args);
      if (args.query === 'missing') return [];
      return [{ file: '/tmp/root/a.js', relative_path: 'a.js', name: 'a.js' }];
    },
    searchCode: (args) => {
      mark('searchCode', args);
      if (args.query === 'missing') return [];
      return [{ file: '/tmp/root/a.js', line: 1, text: 'const a = 1;' }];
    },
    searchHybrid: async (args) => {
      mark('searchHybrid', args);
      return { query: args.query, lexical_hits: 1, semantic_hits: 1, ranking_mode: 'hybrid', results: [] };
    },
    getSymbol: (args) => {
      mark('getSymbol', args);
      return { symbol: args.symbol, count: 1, definitions: [], exports: [] };
    },
    findUsages: (args) => {
      mark('findUsages', args);
      return { symbol: args.symbol, count: 1, usages: [] };
    }
  };

  const updates = {
    getStatus: async ({ force, channel }) => {
      mark('updateStatus', { force, channel });
      return {
        current_version: '0.0.0',
        latest_version: '0.0.1',
        update_channel: channel || 'stable',
        is_outdated: true,
        recommendation: 'update_available',
        can_attempt_update: true
      };
    },
    selfUpdate: async (args) => {
      mark('selfUpdate', args);
      return {
        ok: true,
        dry_run: Boolean(args.dryRun),
        validation: { ok: true, checks: [{ command: 'npm', available: true }] },
        ...args
      };
    }
  };

  const memory = {
    getStatus: async () => ({
      enabled: true,
      auto_capture: true,
      consent_done: true,
      requested_backend: 'auto',
      backend: { requested: 'auto', selected: 'node-sqlite', available: true, reason: 'supported' },
      db_path: '/tmp/synapse.memory.db',
      db_exists: true,
      db_dir: '/tmp',
      synapse_home: '/tmp/.synapse',
      store: { initialized: true, total_entries: 1, total_events: 1 }
    }),
    recall: async (args) => {
      mark('memoryRecall', args);
      return { count: 1, items: [] };
    },
    listEntries: async (args) => {
      mark('memoryList', args);
      return { count: 1, items: [{ id: 'm1' }] };
    },
    getEntry: async (id) => {
      mark('memoryGet', { id });
      return id === 'missing' ? null : { id, title: 'entry' };
    },
    storeEntry: async (args) => {
      mark('memoryStore', args);
      return { created: true, duplicate: false, memory: { id: 'm2', title: 'entry', summary: '', content: 'c', status: 'active' } };
    },
    updateEntry: async (id, patch) => {
      mark('memoryUpdate', { id, patch });
      return { id, title: 'entry', summary: '', content: 'c', status: 'active', revisions: [] };
    },
    deleteEntry: async (id) => {
      mark('memoryDelete', { id });
      return { id, deleted: true };
    },
    captureEvent: async (args) => {
      mark('memoryCaptureEvent', args);
      return { id: 'e1', status: 'promoted' };
    },
    listEvents: async (args) => {
      mark('memoryEvents', args);
      return { count: 1, items: [{ id: 'e1' }] };
    },
    suggestRelations: async (id, opts) => {
      mark('memorySuggestRelations', { id, opts });
      return { id, source_title: 'test', count: 0, threshold: opts?.threshold || 0.55, using_embeddings: false, suggestions: [] };
    },
    addRelation: async (sourceId, targetId, relationType) => {
      mark('memoryAddRelation', { sourceId, targetId, relationType });
      return { source_id: sourceId, target_id: targetId, relation_type: relationType };
    },
    removeRelation: async (sourceId, targetId) => {
      mark('memoryRemoveRelation', { sourceId, targetId });
      return { removed: true, source_id: sourceId, target_id: targetId };
    },
    getRelated: async (id) => {
      mark('memoryRelated', { id });
      return { id, count: 0, related: [] };
    }
  };

  const memoryWorkflow = {
    getTaskContext: async (args) => {
      mark('taskContext', args);
      return {
        query: args.query || '',
        scope: { project_path: args.project_path || '', topic: args.topic || '' },
        runtime: { name: 'synapse', version: 'test' },
        memory: { enabled: true, backend_available: true, total_entries: 1, total_events: 1 },
        recall: { attempted: true, skipped_reason: '', count: 1, items: [] },
        guidance: ['verify with retrieval']
      };
    },
    captureOutcome: async (args) => {
      mark('captureOutcome', args);
      return {
        captured: true,
        runtime: { name: 'synapse', version: 'test' },
        memory: { enabled: true, backend_available: true, total_entries: 1, total_events: 1 },
        event: { event_type: args.event_type || 'task', title: args.title || 'x' },
        result: { event_id: 'e1', status: 'promoted' }
      };
    }
  };

  return {
    calls,
    workspace,
    vectorIndex,
    search,
    updates,
    memory,
    memoryWorkflow
  };
}

test('MCP tools register and execute across all tool groups', async () => {
  const server = makeFakeServer();
  const fixture = makeFixture();
  const registerJsonTool = createJsonToolRegistrar(server, RESPONSE_FORMAT_SCHEMA);

  const sharedSchemas = {
    MEMORY_KIND_SCHEMA,
    MEMORY_STATUS_SCHEMA,
    MEMORY_SCOPE_SCHEMA,
    MEMORY_LINK_SCHEMA,
    MEMORY_EVENT_TYPE_SCHEMA,
    MEMORY_EVENT_STATUS_SCHEMA
  };

  registerCoreTools({
    registerJsonTool,
    buildServerStatus: async () => ({
      name: 'synapse',
      version: 'test',
      health: { overall: 'ok' },
      updates: { recommendation: 'up_to_date' }
    }),
    buildUsageGuide: () => ({ quickstart: ['a'], for_users: ['a'], for_ai_agents: ['b'], recommended_next_action: 'x' }),
    updates: fixture.updates
  });
  registerMemoryWorkflowTools({
    registerJsonTool,
    schemas: sharedSchemas,
    memory: fixture.memory,
    memoryWorkflow: fixture.memoryWorkflow
  });
  registerMemoryStoreTools({
    registerJsonTool,
    schemas: sharedSchemas,
    memory: fixture.memory
  });
  registerRetrievalTools({
    registerJsonTool,
    paginateItems,
    workspace: fixture.workspace,
    vectorIndex: fixture.vectorIndex,
    search: fixture.search,
    defaultMaxReadLines: 400,
    defaultMaxResults: 100
  });

  const expected = [
    // Core tools
    'synapse_server_status',
    'synapse_health',
    'synapse_usage_guide',
    'synapse_help',
    'synapse_update_status',
    'synapse_update_self',
    // Memory workflow tools
    'synapse_task_context',
    'synapse_memory_status',
    'synapse_memory_recall',
    'synapse_capture_outcome',
    'synapse_agent_prime',
    'synapse_whats_new',
    'synapse_teach',
    // Memory store tools
    'synapse_memory_list',
    'synapse_memory_get',
    'synapse_memory_store',
    'synapse_memory_store_batch',
    'synapse_memory_delete_batch',
    'synapse_memory_update',
    'synapse_memory_delete',
    'synapse_memory_capture_event',
    'synapse_memory_events',
    'synapse_memory_suggest_relations',
    'synapse_memory_add_relation',
    'synapse_memory_remove_relation',
    'synapse_memory_related',
    // Retrieval tools
    'synapse_list_roots',
    'synapse_list_projects',
    'synapse_project_tree',
    'synapse_index_status',
    'synapse_embed_status',
    'synapse_index_project',
    'synapse_search_files',
    'synapse_search_code',
    'synapse_search_hybrid',
    'synapse_get_symbol',
    'synapse_find_usages',
    'synapse_read_file',
    'synapse_file_changed',
    'synapse_summarize_project'
  ];

  const registered = Array.from(server.tools.keys());
  assert.deepEqual(registered.sort(), expected.sort());
  for (const name of expected) {
    assert.ok(server.tools.get(name)?.meta?.outputSchema);
  }

  const notifications = [];
  const makeExtra = (progressToken = undefined) => ({
    _meta: progressToken === undefined ? {} : { progressToken },
    sendNotification: async (notification) => {
      notifications.push(notification);
    }
  });
  const run = async (name, args = {}, extra = makeExtra()) => server.tools.get(name).handler(args, extra);

  const serverStatus = (await run('synapse_server_status')).structuredContent;
  assert.equal(serverStatus.data.name, 'synapse');
  assert.equal(serverStatus.meta.schema_version, '1.0');
  const health = (await run('synapse_health')).structuredContent.data;
  assert.equal(health.name, 'synapse');
  assert.equal(health.health.overall, 'ok');
  assert.ok((await run('synapse_usage_guide', { response_format: 'markdown' })).content[0].text.includes('##'));
  const updateStatus = (await run('synapse_update_status', { force_check: true })).structuredContent.data;
  assert.equal(updateStatus.is_outdated, true);
  assert.equal(updateStatus.current, '0.0.0');
  assert.equal(updateStatus.latest, '0.0.1');
  assert.equal(updateStatus.recommendation, 'update_available');
  assert.equal(updateStatus.can_attempt_update, true);
  const updateStatusBeta = (await run('synapse_update_status', { force_check: true, channel: 'beta' })).structuredContent.data;
  assert.equal(updateStatusBeta.channel, 'beta');
  const updateSelf = (await run('synapse_update_self', { approved_by_user: true, dry_run: true, version: 'latest', reinstall_skill: true })).structuredContent.data;
  assert.equal(updateSelf.ok, true);
  assert.equal(updateSelf.dry_run, true);
  assert.equal(Array.isArray(updateSelf.validation.checks), true);
  assert.equal(updateSelf.validation.ok, true);

  const taskContext = (await run('synapse_task_context', { query: 'q' })).structuredContent.data;
  assert.equal(taskContext.query, 'q');
  assert.equal(taskContext.recall.count, 1);
  assert.equal(Array.isArray(taskContext.guidance), true);
  const memoryStatus = (await run('synapse_memory_status')).structuredContent.data;
  assert.equal(memoryStatus.enabled, true);
  assert.equal(memoryStatus.backend.available, true);
  assert.equal(memoryStatus.store.initialized, true);
  const memoryRecall = (await run('synapse_memory_recall', { query: 'auth' })).structuredContent.data;
  assert.equal(memoryRecall.query, 'auth');
  assert.equal(memoryRecall.count, 1);
  assert.equal(Array.isArray(memoryRecall.items), true);
  const captureOutcome = (await run('synapse_capture_outcome', { event_type: 'task', title: 'x' })).structuredContent.data;
  assert.equal(captureOutcome.captured, true);
  assert.equal(captureOutcome.event.event_type, 'task');
  assert.equal(captureOutcome.memory.enabled, true);
  assert.equal((await run('synapse_memory_list', { limit: 10, offset: 0 })).structuredContent.data.count, 1);
  const memoryGet = (await run('synapse_memory_get', { id: 'm1' })).structuredContent.data;
  assert.equal(memoryGet.id, 'm1');
  assert.equal(memoryGet.title, 'entry');
  await assert.rejects(() => run('synapse_memory_get', { id: 'missing' }), /memory not found/);
  const memoryStore = (await run('synapse_memory_store', { kind: 'knowledge', title: 't', summary: '', content: 'c', status: 'active', importance: 50, confidence: 0.7, tags: [], links: [], scope: {}, source_type: 'manual', source_ref: '', change_note: 'init' })).structuredContent.data;
  assert.equal(memoryStore.created, true);
  assert.equal(memoryStore.id, 'm2');
  const memoryUpdate = (await run('synapse_memory_update', { id: 'm1', change_note: 'u' })).structuredContent.data;
  assert.equal(memoryUpdate.updated, true);
  assert.equal(memoryUpdate.id, 'm1');
  const memoryDelete = (await run('synapse_memory_delete', { id: 'm1' })).structuredContent.data;
  assert.equal(memoryDelete.deleted, true);
  assert.equal(memoryDelete.id, 'm1');
  assert.equal((await run('synapse_memory_capture_event', { event_type: 'task', status: 'completed', title: 'evt', summary: '', content: '', kind: 'knowledge', importance: 50, confidence: 0.7, files_changed: 0, has_tests: false, tags: [], links: [], scope: {}, source_ref: '' })).structuredContent.data.status, 'promoted');
  const memoryEvents = (await run('synapse_memory_events', { limit: 10, offset: 0 })).structuredContent.data;
  assert.equal(memoryEvents.count, 1);
  assert.equal(Array.isArray(memoryEvents.items), true);
  const memorySuggestions = (await run('synapse_memory_suggest_relations', { id: 'm1', threshold: 0.6, max_results: 5 })).structuredContent.data;
  assert.equal(memorySuggestions.count, 0);
  assert.equal(memorySuggestions.threshold, 0.6);
  assert.equal((await run('synapse_memory_add_relation', { source_id: 'm1', target_id: 'm2', relation_type: 'related' })).structuredContent.data.source_id, 'm1');
  assert.equal((await run('synapse_memory_remove_relation', { source_id: 'm1', target_id: 'm2' })).structuredContent.data.removed, true);
  const memoryRelated = (await run('synapse_memory_related', { id: 'm1' })).structuredContent.data;
  assert.equal(memoryRelated.count, 0);
  assert.equal(Array.isArray(memoryRelated.related), true);

  assert.equal((await run('synapse_list_roots', { limit: 10, offset: 0 })).structuredContent.data.count, 1);
  assert.equal((await run('synapse_list_projects', { limit: 10, offset: 0 })).structuredContent.data.count, 2);
  const projectTree = (await run('synapse_project_tree', { project_path: '/tmp/root', max_depth: 2, max_entries: 10 })).structuredContent.data;
  assert.equal(projectTree.project_path, '/tmp/root');
  assert.equal(Array.isArray(projectTree.entries), true);
  assert.equal(projectTree.entries.length, 2);
  const indexStatus = (await run('synapse_index_status')).structuredContent.data;
  assert.equal(indexStatus.backend, 'sqlite-vec');
  assert.equal(indexStatus.total_files, 1);
  const embedStatus = (await run('synapse_embed_status')).structuredContent.data;
  assert.equal(embedStatus.backend, 'sqlite-vec');
  assert.equal(embedStatus.provider, 'huggingface');
  assert.equal(embedStatus.ready, true);
  assert.equal(embedStatus.model, 'sentence-transformers/all-MiniLM-L6-v2');
  const indexProject = (await run('synapse_index_project', { project_path: '/tmp/root', all_roots: false, force: false, max_files: 10 }, makeExtra('token-1'))).structuredContent.data;
  assert.equal(indexProject.indexed_files, 0);
  assert.equal(Array.isArray(indexProject.failed_files), true);
  assert.equal(indexProject.failed_file_count, 0);
  assert.equal(Array.isArray(indexProject.failed_file_samples), true);
  assert.equal((await run('synapse_search_files', { query: 'a', project_path: '/tmp/root', all_roots: false, max_results: 5, case_sensitive: false })).structuredContent.data[0].name, 'a.js');
  assert.equal((await run('synapse_search_code', { query: 'const', project_path: '/tmp/root', all_roots: false, glob: '*', max_results: 5, case_sensitive: false, context_lines: 0, use_regex: false })).structuredContent.data[0].line, 1);
  const hybridSearch = (await run('synapse_search_hybrid', { query: 'auth', project_path: '/tmp/root', all_roots: false, glob: '*', max_results: 5, case_sensitive: false, min_semantic_score: 0, auto_index: false })).structuredContent.data;
  assert.equal(hybridSearch.ranking_mode, 'hybrid');
  assert.equal(Array.isArray(hybridSearch.results), true);
  const symbolResult = (await run('synapse_get_symbol', { symbol: 'AuthService', project_path: '/tmp/root', all_roots: false, glob: '*', max_results: 5, case_sensitive: false })).structuredContent.data;
  assert.equal(symbolResult.symbol, 'AuthService');
  assert.equal(Array.isArray(symbolResult.definitions), true);
  const usageResult = (await run('synapse_find_usages', { symbol: 'AuthService', project_path: '/tmp/root', all_roots: false, glob: '*', max_results: 5, case_sensitive: false, context_lines: 1 })).structuredContent.data;
  assert.equal(usageResult.symbol, 'AuthService');
  assert.equal(Array.isArray(usageResult.usages), true);
  const readFile = (await run('synapse_read_file', { path: '/tmp/root/a.js', start_line: 1, end_line: 5 })).structuredContent.data;
  assert.equal(readFile.path, '/tmp/root/a.js');
  assert.equal(Array.isArray(readFile.lines), true);
  assert.equal(readFile.lines.length, 2);
  const emptyFileSearch = await run('synapse_search_files', { query: 'missing', project_path: '/tmp/root', all_roots: false, max_results: 5, case_sensitive: false });
  assert.equal(Array.isArray(emptyFileSearch.structuredContent.data), true);
  assert.equal(emptyFileSearch.structuredContent.data.length, 0);
  assert.equal(emptyFileSearch.structuredContent.meta.tool, 'synapse_search_files');
  assert.equal(emptyFileSearch.structuredContent.meta.count, 0);
  assert.equal(emptyFileSearch.structuredContent.meta.schema_version, '1.0');
  assert.ok(emptyFileSearch.structuredContent.meta.recommended_next_action);
  assert.match(emptyFileSearch.content[0].text, /No file-path matches found/);
  assert.match(emptyFileSearch.content[0].text, /Next:/);
  const emptyCodeSearch = await run('synapse_search_code', { query: 'missing', project_path: '/tmp/root', all_roots: false, glob: '*', max_results: 5, case_sensitive: false, context_lines: 0, use_regex: false });
  assert.equal(Array.isArray(emptyCodeSearch.structuredContent.data), true);
  assert.equal(emptyCodeSearch.structuredContent.data.length, 0);
  assert.equal(emptyCodeSearch.structuredContent.meta.tool, 'synapse_search_code');
  assert.equal(emptyCodeSearch.structuredContent.meta.count, 0);
  assert.ok(emptyCodeSearch.structuredContent.meta.recommended_next_action);
  assert.match(emptyCodeSearch.content[0].text, /No code matches found/);
  assert.match(emptyCodeSearch.content[0].text, /Next:/);
  const projectSummary = (await run('synapse_summarize_project', { project_path: '/tmp/root', max_files: 100 })).structuredContent.data;
  assert.equal(projectSummary.summary, 'ok');
  assert.equal(projectSummary.project_path, '/tmp/root');

  assert.ok(fixture.calls.some((c) => c.name === 'indexProject'));
  assert.ok(fixture.calls.some((c) => c.name === 'searchHybrid'));
  assert.ok(fixture.calls.some((c) => c.name === 'getSymbol'));
  assert.ok(fixture.calls.some((c) => c.name === 'findUsages'));
  assert.ok(fixture.calls.some((c) => c.name === 'memoryStore'));
  assert.ok(fixture.calls.some((c) => c.name === 'memorySuggestRelations'));
  assert.ok(fixture.calls.some((c) => c.name === 'memoryAddRelation'));
  assert.ok(fixture.calls.some((c) => c.name === 'memoryRelated'));
  assert.ok(notifications.some((n) => n.method === 'notifications/progress'));
});
