import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchService } from '../src/services/retrieval/index.js';

test('searchHybrid merges semantic and lexical overlap into hybrid result', async () => {
  const service = new SearchService({
    workspace: {},
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: () => ([
        {
          file: '/tmp/a.js',
          start_line: 9,
          end_line: 15,
          snippet: 'function alpha() {}',
          semantic_score: 0.5
        }
      ])
    }
  });

  service.searchCode = () => ([
    { file: '/tmp/a.js', line: 11, text: 'alpha();' },
    { file: '/tmp/b.js', line: 5, text: 'beta();' }
  ]);

  const out = await service.searchHybrid({
    query: 'alpha',
    projectPath: '/tmp',
    allRoots: false,
    glob: '*',
    maxResults: 10,
    caseSensitive: false,
    minSemanticScore: 0
  });

  assert.equal(out.results[0].file, '/tmp/a.js');
  assert.equal(out.results[0].type, 'hybrid');
  assert.equal(out.ranking_mode, 'hybrid');
  assert.equal(out.results[0].line, 11);
  assert.equal(out.results[0].start_line, 9);
  assert.equal(out.results[0].end_line, 15);
  assert.ok(out.results[0].lexical_score > 0);
  assert.ok(out.results[0].semantic_score > 0);
});

test('searchHybrid auto-indexes once when semantic results are empty', async () => {
  const calls = { semantic: 0, index: 0 };
  const service = new SearchService({
    workspace: {
      resolveSearchBases: () => ['/tmp/project'],
      normalizeTarget: (p) => p
    },
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: ({ query }) => {
        calls.semantic += 1;
        if (query === 'missing') return [];
        if (calls.index === 0) return [];
        return [{
          file: '/tmp/project/a.js',
          start_line: 1,
          end_line: 3,
          snippet: 'alpha result',
          semantic_score: 0.7
        }];
      },
      indexProject: () => {
        calls.index += 1;
        return { indexed_files: 12, failed_files: [] };
      }
    }
  });

  service.searchCode = () => [];

  const first = await service.searchHybrid({
    query: 'alpha',
    projectPath: '/tmp/project',
    allRoots: false,
    glob: '*',
    maxResults: 5,
    caseSensitive: false,
    minSemanticScore: 0
  });

  assert.equal(calls.index, 1);
  assert.equal(calls.semantic, 2);
  assert.equal(first.semantic_hits, 1);
  assert.equal(first.ranking_mode, 'semantic-only');
  assert.equal(first.auto_index?.attempted, true);
  assert.equal(first.auto_index?.success, true);

  const second = await service.searchHybrid({
    query: 'missing',
    projectPath: '/tmp/project',
    allRoots: false,
    glob: '*',
    maxResults: 5,
    caseSensitive: false,
    minSemanticScore: 0
  });

  assert.equal(calls.index, 1);
  assert.equal(second.auto_index?.attempted, false);
  assert.equal(second.auto_index?.skipped_reason, 'already_attempted_for_scope');
});

test('searchHybrid does not auto-index when autoIndex is false', async () => {
  const service = new SearchService({
    workspace: {
      resolveSearchBases: () => ['/tmp/project'],
      normalizeTarget: (p) => p
    },
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: () => [],
      indexProject: () => {
        throw new Error('should not be called');
      }
    }
  });

  service.searchCode = () => [];

  const out = await service.searchHybrid({
    query: 'alpha',
    projectPath: '/tmp/project',
    allRoots: false,
    glob: '*',
    maxResults: 5,
    caseSensitive: false,
    minSemanticScore: 0,
    autoIndex: false
  });

  assert.equal(out.semantic_hits, 0);
  assert.equal(out.ranking_mode, 'none');
  assert.equal(out.auto_index, null);
});

test('searchHybrid reports lexical-only ranking mode when semantic results are absent', async () => {
  const service = new SearchService({
    workspace: {},
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: () => []
    }
  });

  service.searchCode = () => ([
    { file: '/tmp/a.js', line: 5, text: 'alpha();' }
  ]);

  const out = await service.searchHybrid({
    query: 'alpha',
    projectPath: '/tmp',
    allRoots: false,
    glob: '*',
    maxResults: 10,
    caseSensitive: false,
    minSemanticScore: 0,
    autoIndex: false
  });

  assert.equal(out.ranking_mode, 'lexical-only');
  assert.equal(out.results[0].type, 'lexical');
});

test('searchHybrid downranks lexical-only noise for generic short queries', async () => {
  const service = new SearchService({
    workspace: {},
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: () => ([
        {
          file: '/tmp/docs/search.md',
          start_line: 1,
          end_line: 5,
          snippet: 'Search overview',
          semantic_score: 0.25
        }
      ])
    }
  });

  service.searchCode = () => ([
    { file: '/tmp/SECURITY.md', line: 8, text: 'Install ripgrep for search' }
  ]);

  const out = await service.searchHybrid({
    query: 'search',
    projectPath: '/tmp',
    allRoots: false,
    glob: '*',
    maxResults: 10,
    caseSensitive: false,
    minSemanticScore: 0,
    autoIndex: false
  });

  assert.equal(out.ranking_mode, 'hybrid');
  assert.equal(out.results[0].file, '/tmp/docs/search.md');
  assert.equal(out.results[0].type, 'semantic');
});

test('searchHybrid adds path affinity bias in allRoots mode', async () => {
  const service = new SearchService({
    workspace: {},
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    vectorIndex: {
      semanticSearch: () => ([
        {
          file: '/tmp/other/android/HybridClassBase.java',
          start_line: 1,
          end_line: 8,
          snippet: 'hybrid base',
          semantic_score: 0.42
        },
        {
          file: '/tmp/synapse/src/search-service.js',
          start_line: 10,
          end_line: 20,
          snippet: 'RRF scoring in Synapse',
          semantic_score: 0.4
        }
      ])
    }
  });

  service.searchCode = () => [];

  const out = await service.searchHybrid({
    query: 'synapse hybrid search RRF scoring',
    projectPath: undefined,
    allRoots: true,
    glob: '*',
    maxResults: 10,
    caseSensitive: false,
    minSemanticScore: 0,
    autoIndex: false
  });

  assert.equal(out.ranking_mode, 'semantic-only');
  assert.equal(out.results[0].file, '/tmp/synapse/src/search-service.js');
  assert.ok(out.results[0].path_affinity > out.results[1].path_affinity);
});

test('searchHybrid applies reranker when requested', async () => {
  const service = new SearchService({
    workspace: {},
    ignoreDirs: new Set(),
    hasRipgrep: false,
    rgTimeoutMs: 1000,
    maxFileBytes: 1024,
    rerankerMinCandidates: 1,
    rerankerTopN: 2,
    reranker: {
      isEnabled: () => true,
      rerank: async () => [0.05, 0.95]
    },
    vectorIndex: {
      semanticSearch: () => ([
        {
          file: '/tmp/a.js',
          start_line: 1,
          end_line: 5,
          snippet: 'alpha',
          semantic_score: 0.8
        },
        {
          file: '/tmp/b.js',
          start_line: 1,
          end_line: 5,
          snippet: 'beta',
          semantic_score: 0.79
        }
      ])
    }
  });

  service.searchCode = () => [];
  const out = await service.searchHybrid({
    query: 'alpha beta',
    projectPath: '/tmp',
    allRoots: false,
    glob: '*',
    maxResults: 5,
    caseSensitive: false,
    minSemanticScore: 0,
    autoIndex: false,
    useReranker: true
  });

  assert.equal(out.reranker?.applied, true);
  assert.equal(out.results[0].file, '/tmp/b.js');
  assert.ok(out.results[0].reranker_score > out.results[1].reranker_score);
});
