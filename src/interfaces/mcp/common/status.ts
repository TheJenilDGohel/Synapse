import type { RuntimeConfig, RootEntry } from '../../../core/runtime/config.js';
import type { NormalizedMemoryStatus } from './response-normalizers.js';

interface MemoryGuidance {
  enabled: boolean;
  auto_capture: boolean;
  consent_done: boolean;
  backend_available: boolean;
  requested_backend: string | null;
  selected_backend: string | null;
  total_entries: number;
  total_events: number;
  guidance: string[];
}

function buildMemoryGuidance(status: NormalizedMemoryStatus): string[] {
  if (status.enabled && (status.backend?.available || false)) {
    return [
      'For non-trivial debugging, implementation, review, or repeated project work: call synapse_memory_query({ action: "task_context" }) before deeper analysis.',
      'After meaningful fixes, decisions, review findings, or user preference discoveries: call synapse_memory_manage({ action: "capture_outcome" }).',
      'Do not use memory in place of file evidence; verify with search/read tools before concluding.'
    ];
  }

  return [
    'Memory is unavailable or disabled; rely on retrieval tools only unless the user opts in during setup.'
  ];
}

function buildMemorySummary(status: NormalizedMemoryStatus): MemoryGuidance {
  return {
    enabled: status.enabled,
    auto_capture: status.auto_capture,
    consent_done: status.consent_done,
    backend_available: status.backend?.available || false,
    requested_backend: status.backend?.requested || status.requested_backend || null,
    selected_backend: status.backend?.selected || null,
    total_entries: status.store?.total_entries || 0,
    total_events: status.store?.total_events || 0,
    guidance: buildMemoryGuidance(status)
  };
}

interface HealthSummaryInput {
  runtime: RuntimeConfig;
  memoryStatus: NormalizedMemoryStatus;
  indexStatus: IndexStatusLike | null;
  activeIndexBackend: string | null;
  updateStatus?: Record<string, unknown> | null;
}

interface IndexStatusLike {
  sqlite_vec_extension?: {
    configured?: boolean;
    loaded?: boolean;
    path?: string;
  };
  sqlite_vec_loaded?: boolean;
  sqlite_vec_table_ready?: boolean;
  error?: string;
  upgrade_recommended?: boolean;
  upgrade_reason?: string | null;
  [key: string]: unknown;
}

interface HealthSummary {
  overall: string;
  vector_index_ready: boolean;
  sqlite_vec_native_ready: boolean;
  memory_ready: boolean;
  has_ripgrep: boolean;
  issues: string[];
  recommended_next_action: string;
}

function buildHealthSummary({ runtime, memoryStatus, indexStatus, activeIndexBackend, updateStatus }: HealthSummaryInput): HealthSummary {
  const memoryAvailable = Boolean(memoryStatus?.enabled && memoryStatus?.backend?.available);
  const vectorReady = Boolean(activeIndexBackend && indexStatus);
  const sqliteVecNativeReady = activeIndexBackend !== 'sqlite-vec'
    || Boolean(indexStatus?.sqlite_vec_extension?.configured && indexStatus?.sqlite_vec_loaded && indexStatus?.sqlite_vec_table_ready);
  const issues: string[] = [];

  if (!runtime.hasRipgrep) issues.push('ripgrep_unavailable');
  if (!vectorReady) issues.push('vector_index_unavailable');
  if (indexStatus?.error) issues.push('vector_index_status_error');
  if (!sqliteVecNativeReady) issues.push('sqlite_vec_native_missing');
  if (runtime.embeddingCacheStatus?.fallbackUsed) issues.push('embedding_cache_fallback');
  if (runtime.rerankerCacheStatus?.fallbackUsed) issues.push('reranker_cache_fallback');
  if (updateStatus?.stale === true) issues.push('update_status_stale');

  return {
    overall: issues.length === 0 ? 'ok' : 'degraded',
    vector_index_ready: vectorReady,
    sqlite_vec_native_ready: sqliteVecNativeReady,
    memory_ready: memoryAvailable,
    has_ripgrep: runtime.hasRipgrep,
    issues,
    recommended_next_action: issues.length > 0
      ? (updateStatus?.stale === true
        ? 'Run synapse_system_manage({ action: "update_status" }) to refresh stale version data, then inspect doctor if runtime capabilities still look degraded.'
        : 'Run synapse_usage_guide or doctor if runtime capabilities look degraded.')
      : 'Runtime looks healthy. Start with synapse_server_status or synapse_search({ action: "files" }).'
  };
}

interface MemoryService {
  getStatus(): Promise<NormalizedMemoryStatus>;
}

interface UpdateService {
  getCachedStatus?(): unknown;
  getStatus(opts: { force: boolean }): Promise<unknown>;
}

interface WorkspaceService {
  listRoots(): RootEntry[];
}

interface VectorIndexService {
  getStatus?(): IndexStatusLike | null;
}

export interface ServerStatus {
  name: string;
  version: string;
  mode: string;
  roots: RootEntry[];
  has_ripgrep: boolean;
  health: HealthSummary;
  memory: MemoryGuidance;
  search: {
    auto_project_split: boolean;
    max_auto_projects: number;
    force_split_children: boolean;
    rg_timeout_ms: number;
  };
  vector_index: Record<string, unknown>;
  updates: unknown;
  [key: string]: unknown;
}

export interface ServerStatusBuilderOptions {
  serverName: string;
  serverVersion: string;
  runtime: RuntimeConfig;
  workspace: WorkspaceService;
  memory: MemoryService;
  updates: UpdateService;
  getActiveIndexBackend: () => string | null;
  vectorIndex: VectorIndexService;
}

export function createServerStatusBuilder({
  serverName,
  serverVersion,
  runtime,
  workspace,
  memory,
  updates,
  getActiveIndexBackend,
  vectorIndex
}: ServerStatusBuilderOptions): () => Promise<ServerStatus> {
  return async function buildServerStatus(): Promise<ServerStatus> {
    const indexStatus = vectorIndex?.getStatus?.() || null;
    const activeIndexBackend = getActiveIndexBackend();
    const memoryStatus = await memory.getStatus();
    const updateStatus = updates.getCachedStatus
      ? updates.getCachedStatus()
      : await updates.getStatus({ force: false });

    return {
      name: serverName,
      version: serverVersion,
      mode: runtime.mcpMode,
      roots: workspace.listRoots(),
      has_ripgrep: runtime.hasRipgrep,
      health: buildHealthSummary({
        runtime,
        memoryStatus,
        indexStatus,
        activeIndexBackend,
        updateStatus: updateStatus as Record<string, unknown>
      }),
      memory: buildMemorySummary(memoryStatus),
      search: {
        auto_project_split: runtime.autoProjectSplit,
        max_auto_projects: runtime.maxAutoProjects,
        force_split_children: runtime.forceSplitChildren,
        rg_timeout_ms: runtime.rgTimeoutMs
      },
      vector_index: {
        backend: activeIndexBackend,
        requested_backend: runtime.indexBackend,
        index_path: runtime.vectorIndexPath,
        db_path: runtime.sqliteDbPath,
        chunk_lines: runtime.vectorChunkLines,
        chunk_overlap: runtime.vectorChunkOverlap,
        max_terms_per_chunk: runtime.vectorMaxTermsPerChunk,
        max_indexed_files: runtime.vectorMaxIndexedFiles,
        embedding_provider: runtime.embeddingProvider,
        embedding_model: runtime.embeddingModel,
        embedding_cache_dir: runtime.embeddingCacheDir,
        embedding_cache_status: runtime.embeddingCacheStatus || null,
        embedding_dimensions: runtime.embeddingDimensions,
        reranker_provider: runtime.rerankerProvider,
        reranker_model: runtime.rerankerModel,
        reranker_cache_dir: runtime.rerankerCacheDir,
        reranker_cache_status: runtime.rerankerCacheStatus || null,
        diagnostics: {
          sqlite_vec_loaded: indexStatus?.sqlite_vec_loaded ?? indexStatus?.sqlite_vec_extension?.loaded ?? null,
          sqlite_vec_extension_path: indexStatus?.sqlite_vec_extension?.path || runtime.sqliteVecExtensionPath || '',
          sqlite_vec_extension_configured: Boolean(indexStatus?.sqlite_vec_extension?.configured || runtime.sqliteVecExtensionPath),
          sqlite_vec_table_ready: indexStatus?.sqlite_vec_table_ready ?? null,
          index_sweep_interval_minutes: runtime.indexSweepIntervalMinutes
        },
        upgrade_recommended: indexStatus?.upgrade_recommended || false,
        upgrade_reason: indexStatus?.upgrade_reason || null
      },
      updates: updateStatus
    };
  };
}

export interface UsageGuide {
  quickstart: string[];
  release_debug: string[];
  for_users: string[];
  for_ai_agents: string[];
  quality_playbook: string[];
  tool_sequence: string[];
  recommended_next_action: string;
}

export interface HelpGuideTool {
  name: string;
  description: string;
  example?: Record<string, unknown>;
}

export interface HelpGuide {
  task_type: string;
  tools: HelpGuideTool[];
  workflow: string[];
  tip: string;
}

interface TaskRule {
  pattern: RegExp;
  type: string;
  tools: HelpGuideTool[];
  workflow: string[];
  tip: string;
}

const t = (name: string, description: string, example?: Record<string, unknown>): HelpGuideTool => ({ name, description, ...(example ? { example } : {}) });
const HELP_RULES: TaskRule[] = [
  { pattern: /\b(start|begin|initialize|cold start|first|new task|setup task|rehydrate|resume)\b/i, type: 'task_initialization',
    tools: [t('synapse_agent_prime', 'Get everything an agent needs to start a task in one call: memories, entities, files, changes, and suggestions')],
    workflow: ['1. Call synapse_agent_prime with your task description.', '2. Review the rehydrated memories and KG entities.', '3. Examine recent changes and suggested files.', '4. Follow the tailored "suggested actions" returned by the tool.'],
    tip: 'ALWAYS call agent_prime first. It prevents redundant research and gives you the "State of the Union" for the project.' },
  { pattern: /\b(store|save|remember|capture|log|record|preserve|decision|outcome)\b/i, type: 'memory_capture',
    tools: [t('synapse_memory_manage', 'Store a durable memory entry', { action: 'store', title: 'Auth uses JWT', content: 'Decided to use JWT with refresh tokens' }),
      t('synapse_memory_manage', 'One-call outcome capture after meaningful work', { action: 'capture_outcome', task: 'fixed bug' }),
      t('synapse_memory_query', 'Find related memories to link after storing', { action: 'suggest', id: 'uuid' })],
    workflow: ['1. Call memory_manage({ action: "store" }) with title + content.', '2. Note the returned memory ID.', '3. Optionally call memory_query({ action: "suggest" }) to discover related prior knowledge.', '4. Link strong matches (>= 0.7) with memory_manage({ action: "add_relation" }).'],
    tip: 'After bug fixes, decisions, or review findings, always capture -- it costs nothing and pays compound interest.' },
  { pattern: /\b(recall|find memory|what did|remember when|prior|previous|history|context)\b/i, type: 'memory_recall',
    tools: [t('synapse_memory_query', 'One-call runtime + memory context (action: task_context)'),
      t('synapse_memory_query', 'Search memories by query with semantic ranking (action: recall)'),
      t('synapse_memory_query', 'Traverse memory graph one hop from a known entry (action: related)')],
    workflow: ['1. Call memory_query({ action: "task_context" }) with a task_hint.', '2. If you need deeper recall, use action: "recall" with a focused query.', '3. Follow up with action: "related" on the most relevant result.'],
    tip: 'Use task_context as your default entry point -- it bundles runtime status and memory recall in one call.' },
  { pattern: /\b(search code|find function|symbol|import|identifier|definition|usage)\b/i, type: 'code_search',
    tools: [t('synapse_search', 'Exact symbol/keyword/regex search in file contents (action: code)'),
      t('synapse_search', 'Find files by name/path pattern (action: files)'),
      t('synapse_workspace_manage', 'Read exact lines from a known file (action: read)')],
    workflow: ['1. Use search({ action: "code" }) for exact symbol matches.', '2. Use search({ action: "files" }) to locate the module/file by name.', '3. Read targeted line ranges with workspace_manage({ action: "read" }).'],
    tip: 'Pass project_path when known -- scoped searches are 10x faster than root-wide.' },
  { pattern: /\b(search|find|where is|locate|discover|module|feature|folder)\b/i, type: 'content_search',
    tools: [t('synapse_search', 'Find files by name/path pattern (action: files)'),
      t('synapse_search', 'Concept-level content retrieval (action: hybrid)'),
      t('synapse_workspace_manage', 'Directory structure overview (action: tree)')],
    workflow: ['1. Start with search({ action: "files" }) for module/directory discovery.', '2. Use search({ action: "hybrid" }) for concept-level or fuzzy matches.', '3. Use workspace_manage({ action: "tree" }) for structural overview.'],
    tip: 'For acronyms (SSO, IAM), also try synonyms (oauth, saml, passport, auth).' },
  { pattern: /\b(graph|entity|triple|fact|knowledge graph|kg|structured fact)\b/i, type: 'knowledge_graph',
    tools: [t('synapse_kg_manage', 'Create named entities, triples, or ingest from text'),
      t('synapse_kg_query', 'Query relationships or see temporal evolution')],
    workflow: ['1. Create entities with kg_manage({ action: "add_entity" }).', '2. Link them with kg_manage({ action: "add_triple" }).', '3. Query relationships with kg_query({ action: "relationships" }).', '4. Use action: "timeline" for chronological fact evolution.'],
    tip: 'When facts change, invalidate the old triple with action: "invalidate" and add the new one.' },
  { pattern: /\b(relate|link|connect|suggest|similar|associated)\b/i, type: 'memory_relations',
    tools: [t('synapse_memory_query', 'Find semantically similar memories (action: suggest)'),
      t('synapse_memory_manage', 'Link two memories with a named relation (action: add_relation)'),
      t('synapse_memory_query', 'Traverse memory links one hop (action: related)')],
    workflow: ['1. Call memory_query({ action: "suggest" }) on a memory ID.', '2. Review candidates (similarity >= 0.55).', '3. Confirm with memory_manage({ action: "add_relation" }).', '4. Use memory_query({ action: "related" }) to verify the graph.'],
    tip: 'Relation types: related, depends_on, contradicts, supersedes, extends.' },
  { pattern: /\b(debug|fix|investigate|error|crash|broken|failing|bug|issue|traceback)\b/i, type: 'debug',
    tools: [t('synapse_memory_query', 'Check prior fixes/context (action: task_context)'),
      t('synapse_search', 'Search for error strings and symbols (action: code)'),
      t('synapse_search', 'Search for architectural context (action: hybrid)'),
      t('synapse_workspace_manage', 'Read exact code for confirmation (action: read)'),
      t('synapse_memory_manage', 'Capture the fix for future reference (action: capture_outcome)')],
    workflow: ['1. Call task_context for prior fixes and context.', '2. Search for the error with search({ action: "code" }).', '3. Search for architecture with search({ action: "hybrid" }).', '4. Read targeted lines with read.', '5. After fixing, capture the outcome.'],
    tip: 'Run both search code (exact) and search hybrid (context) for thorough investigation.' },
  { pattern: /\b(setup|install|configure|onboard|getting started)\b/i, type: 'setup',
    tools: [t('synapse_server_status', 'Check runtime health and configuration'),
      t('synapse_health', 'Compact health smoke check'),
      t('synapse_usage_guide', 'Best-practice guidance from the server')],
    workflow: ['1. Run server_status to check runtime health.', '2. If issues, run health for a compact diagnostic.', '3. Call usage_guide for embedded best practices.'],
    tip: 'Most setup issues are resolved by: npm install -g loci && loci setup && loci doctor.' },
  { pattern: /\b(nest|branch|organize|taxonomy|hierarchy|tree)\b/i, type: 'taxonomy',
    tools: [t('synapse_memory_query', 'Full hierarchy view (action: nest_tree)'),
      t('synapse_memory_query', 'List top-level nests (action: nest_list)'),
      t('synapse_memory_query', 'List branches within a nest (action: nest_branches)')],
    workflow: ['1. Run action: "nest_tree" for the full overview.', '2. Use action: "nest_branches" to drill into a specific nest.', '3. Pass nest/branch params when storing memories.'],
    tip: 'Nests are auto-inferred from project_path. Branches from git branch or topic.' },
];

export function buildHelpGuide(task: string): HelpGuide {
  if (!task || !task.trim()) {
    return {
      task_type: 'general',
      tools: [
        { name: 'synapse_server_status', description: 'Check runtime health' },
        { name: 'synapse_usage_guide', description: 'Best-practice guidance' },
        { name: 'synapse_search', description: 'Find files by name (action: files)' },
      ],
      workflow: [
        '1. Run server_status to confirm the runtime is healthy.',
        '2. Call usage_guide for workflow guidance.',
        '3. Start searching with synapse_search({ action: "files" }).',
      ],
      tip: 'Call synapse_help with a specific task description for tailored guidance. Use synapse_discovery to activate specialized tools.' ,
    };
  }

  for (const rule of HELP_RULES) {
    if (rule.pattern.test(task)) {
      return {
        task_type: rule.type,
        tools: rule.tools,
        workflow: rule.workflow,
        tip: rule.tip,
      };
    }
  }

  return {
    task_type: 'general',
    tools: [
      { name: 'synapse_server_status', description: 'Check runtime health' },
      { name: 'synapse_search', description: 'Find files by name (action: files)' },
      { name: 'synapse_search', description: 'Concept-level content retrieval (action: hybrid)' },
    ],
    workflow: [
      '1. Run server_status to check runtime capabilities.',
      '2. Use search({ action: "files" }) for module/file discovery.',
      '3. Use search({ action: "hybrid" }) for concept-level search.',
      '4. If specialized tools are needed, call synapse_discovery.',
    ],
    tip: 'Describe your task more specifically for better guidance (e.g. "debug auth crash", "store a decision"). You can also activate tool categories via synapse_discovery.',
  };
}

export function buildUsageGuide(): UsageGuide {
  return {
    quickstart: [
      '1. Call synapse_agent_prime({ task: "your task" }) to get memories, entities, files, and suggested actions in one call.',
      '2. Use synapse_search({ action: "find", query: "..." }) for fused search across memory, code, and KG.',
      '3. Use synapse_workspace_manage({ action: "read" }) only after narrowing the target.',
      '4. Call synapse_memory_manage({ action: "capture_outcome" }) after meaningful work to persist learnings.'
    ],
    release_debug: [
      'If retrieval looks empty, validate project_path first, then retry with a broader query.',
      'If runtime looks degraded, inspect server_status.health and updates before deeper debugging.',
      'Use synapse_system_manage({ action: "update_status" }) to see whether cached version data is stale or actionable.'
    ],
    for_users: [
      'Run synapse_workspace_manage({ action: "list_roots" }) first to verify active roots.',
      'Use synapse_agent_prime({ task: "..." }) for one-call context: memories, entities, files, and suggestions.',
      'Use synapse_search({ action: "find", query: "..." }) for fused search across memory, code, and KG.',
      'Run synapse_system_manage({ action: "index_project" }) for your active project/root before semantic search.',
      'Use synapse_memory_manage({ action: "teach", instruction: "..." }) to set persistent behavior rules for your AI.',
      'Use synapse_memory_manage({ action: "store" }) with just {title, content} — everything else is auto-inferred.',
      'Use synapse_memory_manage({ action: "capture_outcome" }) for one-call outcome capture after meaningful work.',
      'Use synapse_memory_query({ action: "whats_new", since: "last_session" }) to see what changed since your last session.',
      'Use synapse_system_manage({ action: "audit" }) to check memory health and get improvement suggestions.',
      'Use synapse_system_manage({ action: "update_status" }) when you need to verify whether a newer stable version is available.'
    ],
    for_ai_agents: [
      'Start every task with synapse_agent_prime({ task: "..." }) — it returns memories, entities, relevant files, recent changes, and suggested actions in one call.',
      'Use synapse_search({ action: "find", query: "..." }) for cross-domain search spanning memory, code, and KG with fused ranking.',
      'Use synapse_memory_manage({ action: "teach", instruction: "..." }) to store durable behavior modifiers.',
      'Use synapse_memory_query({ action: "whats_new", since: "last_session" }) to see what changed across memories, triples, and files.',
      'Prefer synapse_memory_manage({ action: "store" }) with just {title, content} — scope, tags, topic, nest, and branch are auto-inferred.',
      'Use terse: "minimal" on write tools to get {id, ok} instead of full payloads — 70%+ token savings.',
      'For bulk operations, use batch actions: kg_manage({ action: "add_triples_batch" }), memory_manage({ action: "store_batch" }).',
      'Call synapse_help({ task: "describe what you need" }) for task-scoped tool recommendations.',
      'Treat capture_outcome as the default post-task memory path after meaningful work.',
      'Use system_manage({ action: "audit" }) periodically to check memory health.',
      'To find a module or feature by name, use search({ action: "files" }). For exact symbols, use search({ action: "code" }).',
      'For symbol intelligence, use synapse_symbol_query with actions: callers, definition, implementations, usages.',
      'After retrieval, call workspace_manage({ action: "read" }) with narrow line ranges.',
      'If updates.is_outdated=true in server status, ask user for approval and then call update_self with approved_by_user=true.'
    ],
    quality_playbook: [
      'Never answer from memory when a Loci tool can verify the claim.',
      'For bug/debug tasks: run both search({ action: "code" }) and search({ action: "hybrid" }).',
      'If results are empty, retry with synonyms and then use search({ action: "code", use_regex: true }).',
      'Always cite concrete file paths and line ranges after reading files before conclusions.'
    ],
    tool_sequence: [
      'synapse_agent_prime -> one call: memories + entities + files + changes + suggestions',
      'synapse_search({ action: "find" }) -> fused search across memory, code, and KG',
      'synapse_search({ action: "files" }) -> for module or feature discovery by name',
      'synapse_search({ action: "code" }) -> for exact identifiers and errors',
      'synapse_symbol_query({ action: "definition" }) -> jump to symbol definition',
      'synapse_symbol_query({ action: "callers" }) -> find all callers of a symbol',
      'synapse_workspace_manage({ action: "read" })',
      'synapse_memory_manage({ action: "capture_outcome" }) -> persist learnings',
      'synapse_memory_manage({ action: "teach" }) -> store durable behavior modifiers',
      'synapse_memory_query({ action: "whats_new" }) -> cross-session delta summary',
      'synapse_system_manage({ action: "audit" }) -> memory health check',
      'synapse_help -> task-scoped tool guidance'
    ],
    recommended_next_action: 'For most sessions: synapse_agent_prime, then synapse_search({ action: "find" }).'
  };
}
