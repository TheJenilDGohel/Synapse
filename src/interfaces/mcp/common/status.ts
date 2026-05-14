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
      'For non-trivial debugging, implementation, review, or repeated project work: call synapse_task_context before deeper analysis.',
      'After meaningful fixes, decisions, review findings, or user preference discoveries: call synapse_capture_outcome.',
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
        ? 'Run synapse_update_status to refresh stale version data, then inspect doctor if runtime capabilities still look degraded.'
        : 'Run synapse_usage_guide or doctor if runtime capabilities look degraded.')
      : 'Runtime looks healthy. Start with synapse_server_status or synapse_search_files.'
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
    tools: [t('synapse_memory_store', 'Store a durable memory entry', { title: 'Auth uses JWT', content: 'Decided to use JWT with refresh tokens' }),
      t('synapse_capture_outcome', 'One-call outcome capture after meaningful work'),
      t('synapse_memory_suggest_relations', 'Find related memories to link after storing')],
    workflow: ['1. Call memory_store with title + content (all other fields auto-inferred).', '2. Note the returned memory ID.', '3. Optionally call memory_suggest_relations to discover related prior knowledge.', '4. Link strong matches (>= 0.7) with memory_add_relation.'],
    tip: 'After bug fixes, decisions, or review findings, always capture -- it costs nothing and pays compound interest.' },
  { pattern: /\b(recall|find memory|what did|remember when|prior|previous|history|context)\b/i, type: 'memory_recall',
    tools: [t('synapse_task_context', 'One-call runtime + memory context (preferred start)'),
      t('synapse_memory_recall', 'Search memories by query with semantic ranking'),
      t('synapse_memory_related', 'Traverse memory graph one hop from a known entry')],
    workflow: ['1. Call task_context with a task_hint for bundled status + recall.', '2. If you need deeper recall, use memory_recall with a focused query.', '3. Follow up with memory_related on the most relevant result.'],
    tip: 'Use task_context as your default entry point -- it bundles runtime status and memory recall in one call.' },
  { pattern: /\b(search code|find function|symbol|import|identifier|definition|usage)\b/i, type: 'code_search',
    tools: [t('synapse_search_code', 'Exact symbol/keyword/regex search in file contents'),
      t('synapse_search_files', 'Find files by name/path pattern'),
      t('synapse_read_file', 'Read exact lines from a known file')],
    workflow: ['1. Use search_code for exact symbol matches.', '2. Use search_files to locate the module/file by name.', '3. Read targeted line ranges with read_file.'],
    tip: 'Pass project_path when known -- scoped searches are 10x faster than root-wide.' },
  { pattern: /\b(search|find|where is|locate|discover|module|feature|folder)\b/i, type: 'content_search',
    tools: [t('synapse_search_files', 'Find files by name/path pattern'),
      t('synapse_search_hybrid', 'Concept-level content retrieval (lexical + semantic)'),
      t('synapse_project_tree', 'Directory structure overview')],
    workflow: ['1. Start with search_files for module/directory discovery.', '2. Use search_hybrid for concept-level or fuzzy matches.', '3. Use project_tree for structural overview.'],
    tip: 'For acronyms (SSO, IAM), also try synonyms (oauth, saml, passport, auth).' },
  { pattern: /\b(graph|entity|triple|fact|knowledge graph|kg|structured fact)\b/i, type: 'knowledge_graph',
    tools: [t('synapse_kg_add_entity', 'Create named entities (people, projects, concepts)'),
      t('synapse_kg_add_triple', 'Add subject-predicate-object facts'),
      t('synapse_kg_query', 'Query relationships for an entity'),
      t('synapse_kg_stats', 'Entity/triple counts and predicate breakdown')],
    workflow: ['1. Create entities with kg_add_entity.', '2. Link them with kg_add_triple (subject-predicate-object).', '3. Query relationships with kg_query.', '4. Use kg_timeline for chronological fact evolution.'],
    tip: 'When facts change, invalidate the old triple with kg_invalidate and add the new one.' },
  { pattern: /\b(relate|link|connect|suggest|similar|associated)\b/i, type: 'memory_relations',
    tools: [t('synapse_memory_suggest_relations', 'Find semantically similar memories'),
      t('synapse_memory_add_relation', 'Link two memories with a named relation'),
      t('synapse_memory_related', 'Traverse memory links one hop')],
    workflow: ['1. Call memory_suggest_relations on a memory ID.', '2. Review candidates (similarity >= 0.55).', '3. Confirm with memory_add_relation using an appropriate relation_type.', '4. Use memory_related to verify the graph.'],
    tip: 'Relation types: related, depends_on, contradicts, supersedes, extends.' },
  { pattern: /\b(debug|fix|investigate|error|crash|broken|failing|bug|issue|traceback)\b/i, type: 'debug',
    tools: [t('synapse_task_context', 'Check prior fixes/context before diving in'),
      t('synapse_search_code', 'Search for error strings and symbols'),
      t('synapse_search_hybrid', 'Search for architectural context'),
      t('synapse_read_file', 'Read exact code for confirmation'),
      t('synapse_capture_outcome', 'Capture the fix for future reference')],
    workflow: ['1. Call task_context for prior fixes and context.', '2. Search for the error with search_code (exact match).', '3. Search for architecture with search_hybrid (concept match).', '4. Read targeted lines with read_file.', '5. After fixing, capture the outcome.'],
    tip: 'Run both search_code (exact) and search_hybrid (context) for thorough investigation.' },
  { pattern: /\b(setup|install|configure|onboard|getting started)\b/i, type: 'setup',
    tools: [t('synapse_server_status', 'Check runtime health and configuration'),
      t('synapse_health', 'Compact health smoke check'),
      t('synapse_usage_guide', 'Best-practice guidance from the server')],
    workflow: ['1. Run server_status to check runtime health.', '2. If issues, run health for a compact diagnostic.', '3. Call usage_guide for embedded best practices.'],
    tip: 'Most setup issues are resolved by: npm install -g synapse && synapse setup && synapse doctor.' },
  { pattern: /\b(nest|branch|organize|taxonomy|hierarchy|tree)\b/i, type: 'taxonomy',
    tools: [t('synapse_nest_tree', 'Full hierarchy view: nests -> branches -> counts'),
      t('synapse_nest_list', 'List top-level nests with counts'),
      t('synapse_nest_branches', 'List branches within a specific nest')],
    workflow: ['1. Run nest_tree for the full overview.', '2. Use nest_branches to drill into a specific nest.', '3. Pass nest/branch params when storing memories for organized retrieval.'],
    tip: 'Nests are auto-inferred from project_path. Branches from git branch or topic.' },
];

export function buildHelpGuide(task: string): HelpGuide {
  if (!task || !task.trim()) {
    return {
      task_type: 'general',
      tools: [
        { name: 'synapse_server_status', description: 'Check runtime health' },
        { name: 'synapse_usage_guide', description: 'Best-practice guidance' },
        { name: 'synapse_search_files', description: 'Find files by name' },
      ],
      workflow: [
        '1. Run server_status to confirm the runtime is healthy.',
        '2. Call usage_guide for workflow guidance.',
        '3. Start searching with search_files.',
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
      { name: 'synapse_search_files', description: 'Find files by name' },
      { name: 'synapse_search_hybrid', description: 'Concept-level content retrieval' },
    ],
    workflow: [
      '1. Run server_status to check runtime capabilities.',
      '2. Use search_files for module/file discovery.',
      '3. Use search_hybrid for concept-level search.',
      '4. If specialized tools are needed, call synapse_discovery.',
    ],
    tip: 'Describe your task more specifically for better guidance (e.g. "debug auth crash", "store a decision"). You can also activate tool categories via synapse_discovery.',
  };
}

export function buildUsageGuide(): UsageGuide {
  return {
    quickstart: [
      '1. Call synapse_agent_prime({ task: "your task" }) to get memories, entities, files, and suggested actions in one call.',
      '2. Use synapse_find({ query: "..." }) for fused search across memory, code, and KG.',
      '3. Use synapse_read_file only after narrowing the target.',
      '4. Call synapse_capture_outcome after meaningful work to persist learnings.'
    ],
    release_debug: [
      'If retrieval looks empty, validate project_path first, then retry with a broader query.',
      'If runtime looks degraded, inspect server_status.health and updates before deeper debugging.',
      'Use synapse_update_status to see whether cached version data is stale or actionable.'
    ],
    for_users: [
      'Run synapse_list_roots first to verify active roots.',
      'Use synapse_agent_prime({ task: "..." }) for one-call context: memories, entities, files, and suggestions.',
      'Use synapse_find({ query: "..." }) for fused search across memory, code, and KG.',
      'Run synapse_index_project for your active project/root before semantic search.',
      'Use synapse_teach({ instruction: "..." }) to set persistent behavior rules for your AI.',
      'Use synapse_memory_store with just {title, content} — everything else is auto-inferred.',
      'Use synapse_capture_outcome for one-call outcome capture after meaningful work.',
      'Use synapse_whats_new({ since: "last_session" }) to see what changed since your last session.',
      'Use synapse_audit() to check memory health and get improvement suggestions.',
      'Use synapse_update_status when you need to verify whether a newer stable version is available.'
    ],
    for_ai_agents: [
      'Start every task with synapse_agent_prime({ task: "..." }) — it returns memories, entities, relevant files, recent changes, and suggested actions in one call.',
      'Use synapse_find({ query: "..." }) for cross-domain search spanning memory, code, and KG with fused ranking.',
      'Use synapse_teach({ instruction: "..." }) to store durable behavior modifiers (e.g. "always use snake_case in this repo").',
      'Use synapse_whats_new({ since: "last_session" }) to see what changed across memories, triples, and files since your last session.',
      'Prefer synapse_memory_store with just {title, content} — scope, tags, topic, nest, and branch are auto-inferred.',
      'Use terse: "minimal" on write tools to get {id, ok} instead of full payloads — 70%+ token savings.',
      'For bulk operations, use batch tools: synapse_kg_add_triples_batch (500/call), synapse_memory_store_batch (100/call).',
      'Call synapse_help({ task: "describe what you need" }) for task-scoped tool recommendations.',
      'Treat synapse_capture_outcome as the default post-task memory path after meaningful work.',
      'Use synapse_audit() periodically to check memory health — coverage, density, orphans, stale entries.',
      'To find a module or feature by name, use synapse_search_files. For exact symbols, use synapse_search_code.',
      'For symbol intelligence, use synapse_find_callers, synapse_find_definition, synapse_find_implementations.',
      'After retrieval, call synapse_read_file with narrow line ranges.',
      'If updates.is_outdated=true in server status, ask user for approval and then call synapse_update_self with approved_by_user=true.'
    ],
    quality_playbook: [
      'Never answer from memory when a Synapse tool can verify the claim.',
      'For bug/debug tasks: run both synapse_search_code (exact) and synapse_search_hybrid (context).',
      'If results are empty, retry with synonyms and then use synapse_search_code with use_regex=true.',
      'Always cite concrete file paths and line ranges after synapse_read_file before conclusions.'
    ],
    tool_sequence: [
      'synapse_agent_prime -> one call: memories + entities + files + changes + suggestions',
      'synapse_find -> fused search across memory, code, and KG',
      'synapse_search_files -> for module or feature discovery by name',
      'synapse_search_code -> for exact identifiers and errors',
      'synapse_find_definition -> jump to symbol definition',
      'synapse_find_callers -> find all callers of a symbol',
      'synapse_read_file',
      'synapse_capture_outcome -> persist learnings after meaningful work',
      'synapse_teach -> store durable behavior modifiers',
      'synapse_whats_new -> cross-session delta summary',
      'synapse_audit -> memory health check',
      'synapse_help -> task-scoped tool guidance'
    ],
    recommended_next_action: 'For most sessions: synapse_agent_prime, then synapse_find.'
  };
}
