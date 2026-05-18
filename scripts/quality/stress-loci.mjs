#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { installRuntimeWarningFilter } from '../../src/core/runtime/index.ts';

installRuntimeWarningFilter();

function createWorkspace(project) {
  return {
    resolveSearchBases(projectPath) {
      return [projectPath || project];
    },
    normalizeTarget(targetPath) {
      return path.resolve(targetPath);
    },
    *walkDirectories(base) {
      const stack = [base];
      while (stack.length > 0) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else files.push(full);
        }
        yield { files };
      }
    },
    isLikelyTextFile() {
      return true;
    },
    safeReadText(filePath) {
      return fs.readFileSync(filePath, 'utf8');
    }
  };
}

function buildSearchFixture(project) {
  const files = {
    'auth/gateway.js': `export async function refreshAuthToken(queue, apiClient) {
  // serialize token refresh requests to avoid duplicate refresh operations
  // retry once after refresh completes in the auth gateway
  return queue.run(async () => apiClient.refresh());
}
`,
    'auth/session.js': `export function attachSession(session, token) {
  // session state and jwt token lifecycle tracking
  session.token = token;
}
`,
    'billing/invoice.js': `export function finalizeInvoice(invoice, ledger) {
  // reconcile payment ledger entries before marking invoice paid
  return ledger.commit(invoice.id);
}
`,
    'ui/dashboard.js': `export function refreshDashboardCards(store) {
  // refresh dashboard widgets after settings save
  return store.reload();
}
`,
    'notes/cooking.md': `How to make tomato pasta
- boil pasta
- prepare garlic and olive oil sauce
- add basil and parmesan
`
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const abs = path.join(project, relativePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
}

async function runSearchSuite({
  SearchService,
  label,
  workspace,
  project,
  vectorIndex,
  reranker,
  useReranker,
  repeats
}) {
  const search = new SearchService({
    workspace,
    ignoreDirs: new Set(['node_modules', '.git']),
    hasRipgrep: true,
    rgTimeoutMs: 5000,
    maxFileBytes: 512 * 1024,
    vectorIndex,
    reranker,
    rerankerMinCandidates: 1,
    rerankerTopN: 10
  });

  const queries = [
    'serialize token refresh requests in gateway auth flow',
    'refreshAuthToken',
    'payment ledger invoice reconciliation',
    'how to cook pasta with basil'
  ];

  const durations = [];
  const startedAt = performance.now();
  const results = [];
  for (let r = 0; r < repeats; r += 1) {
    for (const query of queries) {
      const qStart = performance.now();
      const hybrid = await search.searchHybrid({
        query,
        projectPath: project,
        allRoots: false,
        glob: '*',
        maxResults: 5,
        caseSensitive: false,
        minSemanticScore: 0.01,
        autoIndex: false,
        useReranker
      });
      const qMs = performance.now() - qStart;
      durations.push(qMs);
      results.push({
        query,
        run: r + 1,
        duration_ms: Number(qMs.toFixed(2)),
        lexical_hits: hybrid.lexical_hits,
        semantic_hits: hybrid.semantic_hits,
        ranking_mode: hybrid.ranking_mode,
        reranker: hybrid.reranker,
        top_type: hybrid.results[0]?.type || null,
        top_file: hybrid.results[0]?.file || null,
        top_rrf: hybrid.results[0]?.rrf_score || null,
        top_final: hybrid.results[0]?.final_score || null,
        top_reranker: hybrid.results[0]?.reranker_score || null,
        top_semantic_raw: hybrid.results[0]?.semantic_score_raw || null
      });
    }
  }

  const totalMs = performance.now() - startedAt;
  const count = durations.length || 1;
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(0.5 * (count - 1))] || 0;
  const p95 = sorted[Math.floor(0.95 * (count - 1))] || 0;
  const avg = durations.reduce((sum, v) => sum + v, 0) / count;

  return {
    label,
    backend: vectorIndex.getStatus(),
    benchmark: {
      use_reranker: useReranker,
      repeats,
      total_queries: durations.length,
      total_ms: Number(totalMs.toFixed(2)),
      avg_ms: Number(avg.toFixed(2)),
      p50_ms: Number(p50.toFixed(2)),
      p95_ms: Number(p95.toFixed(2))
    },
    results
  };
}

async function runMemorySuite(tempRoot) {
  const { MemoryStore } = await import('../../src/core/engine/index.ts');
  const store = new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(tempRoot, 'memory.db')
  });

  for (let i = 0; i < 40; i += 1) {
    await store.storeEntry({
      kind: i % 5 === 0 ? 'preference' : 'knowledge',
      title: i % 7 === 0 ? 'Worked on auth flow' : `Auth memory ${i}`,
      summary: i % 7 === 0
        ? `Remember to serialize token refresh requests in gateway auth path ${i}`
        : `Auth summary ${i} covering token refresh retries and queue behavior`,
      content: `Detailed memory ${i}: queue refresh requests, retry once after refresh, and persist auth state in gateway middleware.`,
      importance: 40 + (i % 50),
      tags: ['auth', 'jwt', `tag-${i % 4}`],
      scope: {
        project_path: '/repo/app',
        topic: 'auth',
        feature: i % 2 === 0 ? 'refresh' : 'session'
      }
    });
  }

  const duplicate = await store.storeEntry({
    kind: 'knowledge',
    title: 'Auth memory 1',
    summary: 'Auth summary 1 covering token refresh retries and queue behavior',
    content: 'Detailed memory 1: queue refresh requests, retry once after refresh, and persist auth state in gateway middleware.',
    tags: ['auth', 'jwt', 'tag-1'],
    scope: { project_path: '/repo/app', topic: 'auth', feature: 'session' }
  });

  const strongEvents = [];
  for (let i = 0; i < 20; i += 1) {
    strongEvents.push(await store.captureEvent({
      event_type: i % 4 === 0 ? 'decision' : i % 3 === 0 ? 'task' : 'bugfix',
      status: i % 5 === 0 ? 'completed' : 'resolved',
      title: i % 6 === 0 ? 'Worked on auth flow' : `Fix auth issue ${i}`,
      summary: i % 6 === 0
        ? `Remember to serialize refresh queue handling in branch ${i}`
        : `Resolved auth refresh issue ${i} in gateway queue handling`,
      content: `Event ${i}: refresh queue fix, retry once, and avoid duplicate token refresh in gateway.`,
      files_changed: 1 + (i % 4),
      has_tests: i % 2 === 0,
      tags: ['auth', 'gateway', `event-${i % 3}`],
      scope: {
        project_path: '/repo/app',
        topic: 'auth',
        feature: 'refresh'
      }
    }));
  }

  const mixedEvents = [];
  for (let i = 0; i < 12; i += 1) {
    const weak = i % 2 === 0;
    mixedEvents.push(await store.captureEvent({
      event_type: weak ? 'task' : 'bugfix',
      status: weak ? 'in_progress' : 'resolved',
      title: weak ? `Looked at auth folder ${i}` : `Fix auth refresh issue ${i}`,
      summary: weak ? 'Explored files to understand layout' : 'Resolved auth refresh queue handling bug',
      content: weak ? 'Opened files and browsed code to understand layout.' : 'Fix refresh queue duplication and retry once after refresh completes.',
      files_changed: weak ? 0 : 2,
      has_tests: weak ? false : true,
      tags: weak ? ['auth'] : ['auth', 'gateway'],
      scope: {
        project_path: '/repo/app',
        topic: 'auth',
        feature: 'refresh'
      }
    }));
  }

  const recall = await store.recall({
    query: 'jwt refresh queue retry gateway fix remember decision',
    projectPath: '/repo/app',
    topic: 'auth',
    feature: 'refresh',
    limit: 10
  });

  const status = await store.getStatus();
  return {
    status,
    duplicate_created: duplicate.created,
    duplicate_flag: duplicate.duplicate,
    strong_promoted_like: strongEvents.filter((item) => ['promoted', 'merged', 'duplicate'].includes(item.status)).length,
    mixed_promoted_like: mixedEvents.filter((item) => ['promoted', 'merged', 'duplicate'].includes(item.status)).length,
    mixed_ignored: mixedEvents.filter((item) => item.status === 'ignored').length,
    recall_count: recall.count,
    top_recall: recall.items.slice(0, 3).map((item) => ({
      score: item.score,
      raw_score: item.raw_score,
      title: item.memory.title,
      feature: item.memory.feature,
      recall_count: item.memory.recall_count
    }))
  };
}

async function main() {
  const {
    SearchService,
    VectorIndexService,
    EmbeddingService,
    AstChunker,
    RerankerService
  } = await import('../../src/core/engine/index.ts');
  const { SqliteVecIndexService } = await import('../../src/core/engine/retrieval/sqlite-vec/service.ts');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-stress-'));
  const project = path.join(root, 'app');
  fs.mkdirSync(project, { recursive: true });
  const useEmbeddings = String(process.env.LOCI_STRESS_EMBED || '').toLowerCase() === 'true';
  const useReranker = String(process.env.LOCI_STRESS_RERANKER || '').toLowerCase() === 'true';
  const repeats = Math.max(1, Number.parseInt(process.env.LOCI_STRESS_REPEATS || '3', 10) || 3);
  const embeddingService = new EmbeddingService({
    provider: useEmbeddings ? 'huggingface' : 'none',
    model: process.env.LOCI_STRESS_EMBED_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    cacheDir: process.env.LOCI_STRESS_EMBED_CACHE_DIR || path.join(root, '.cache')
  });
  const astChunker = new AstChunker();
  const reranker = new RerankerService({
    provider: useReranker ? 'huggingface' : 'none',
    model: process.env.LOCI_STRESS_RERANKER_MODEL || 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    cacheDir: process.env.LOCI_STRESS_RERANKER_CACHE_DIR || path.join(root, '.cache')
  });

  try {
    buildSearchFixture(project);
    const workspace = createWorkspace(project);

    const sqliteIndex = new SqliteVecIndexService({
      workspace,
      dbPath: path.join(root, 'idx.db'),
      sqliteVecExtensionPath: '',
      chunkLines: 20,
      chunkOverlap: 5,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 1000,
      embeddingService,
      astChunker
    });
    const sqliteIndexStart = performance.now();
    await sqliteIndex.indexProject({ projectPath: project, allRoots: false, force: true, maxFiles: 1000 });
    const sqliteIndexMs = performance.now() - sqliteIndexStart;

    const jsonIndex = new VectorIndexService({
      workspace,
      indexPath: path.join(root, 'idx.json'),
      chunkLines: 20,
      chunkOverlap: 5,
      maxTermsPerChunk: 80,
      maxIndexedFiles: 1000,
      embeddingService,
      astChunker
    });
    const jsonIndexStart = performance.now();
    await jsonIndex.indexProject({ projectPath: project, allRoots: false, force: true, maxFiles: 1000 });
    const jsonIndexMs = performance.now() - jsonIndexStart;

    const [sqliteSearch, jsonSearch, memoryResult] = await Promise.all([
      runSearchSuite({
        SearchService,
        label: 'sqlite',
        workspace,
        project,
        vectorIndex: sqliteIndex,
        reranker,
        useReranker,
        repeats
      }),
      runSearchSuite({
        SearchService,
        label: 'json',
        workspace,
        project,
        vectorIndex: jsonIndex,
        reranker,
        useReranker,
        repeats
      }),
      runMemorySuite(root)
    ]);

    const report = {
      benchmark_meta: {
        use_embeddings: useEmbeddings,
        use_reranker: useReranker,
        repeats
      },
      indexing: {
        sqlite_ms: Number(sqliteIndexMs.toFixed(2)),
        json_ms: Number(jsonIndexMs.toFixed(2))
      },
      search: {
        sqlite: sqliteSearch,
        json: jsonSearch
      },
      memory: memoryResult
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch (error) {
      console.error('[stress-loci] warning: failed to remove temp directory:', error?.message || error);
    }
  }
}

main().catch((error) => {
  console.error('[stress-loci] fatal:', error?.message || error);
  process.exit(1);
});
