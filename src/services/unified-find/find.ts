/**
 * Unified Find — fuses results from memory entries, code chunks, and KG triples
 * into a single ranked list using Reciprocal Rank Fusion (RRF).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FindInput {
  query: string;
  limit?: number;
  projectPath?: string;
  allRoots?: boolean;
  sources?: Array<'memory' | 'code' | 'triple'>;
}

export interface FindResultItem {
  source: 'memory' | 'code' | 'triple';
  score: number;
  // Memory fields
  memory_id?: string;
  title?: string;
  summary?: string;
  kind?: string;
  // Code fields
  file?: string;
  start_line?: number;
  end_line?: number;
  snippet?: string;
  // Triple fields
  subject?: string;
  predicate?: string;
  object?: string;
  triple_id?: string;
}

export interface FindResult {
  query: string;
  count: number;
  sources: { memory: number; code: number; triple: number };
  items: FindResultItem[];
}

// ---------------------------------------------------------------------------
// Service interfaces (dependency injection — not imported from service files)
// ---------------------------------------------------------------------------

interface MemoryServiceLike {
  recall(args: { query: string; limit?: number; projectPath?: string }): Promise<{
    items: Array<{
      score: number;
      memory: { id: string; title: string; summary: string; kind: string };
    }>;
  }>;
  searchTriples(args: { query: string; limit?: number }): Promise<{
    items: Array<{
      score: number;
      triple_id: string;
      subject: string;
      predicate: string;
      object: string;
    }>;
  }>;
}

interface SearchServiceLike {
  searchHybrid(opts: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    glob: string;
    maxResults: number;
    caseSensitive: boolean;
    minSemanticScore: number;
    autoIndex?: boolean;
  }): Promise<{
    results: Array<{
      file: string;
      start_line: number;
      end_line: number;
      snippet?: string;
      text?: string;
      final_score: number;
    }>;
  }>;
}

interface FindDeps {
  memory?: MemoryServiceLike | null;
  search?: SearchServiceLike | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RRF_K = 60;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ALL_SOURCES: Array<'memory' | 'code' | 'triple'> = ['memory', 'code', 'triple'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(limit: number | undefined): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function fetchMemoryResults(
  memory: MemoryServiceLike,
  query: string,
  fetchLimit: number,
  projectPath?: string
): Promise<FindResultItem[]> {
  const result = await memory.recall({ query, limit: fetchLimit, projectPath });
  return (result.items || []).map(item => ({
    source: 'memory' as const,
    score: item.score,
    memory_id: item.memory.id,
    title: item.memory.title,
    summary: item.memory.summary,
    kind: item.memory.kind
  }));
}

async function fetchCodeResults(
  search: SearchServiceLike,
  query: string,
  fetchLimit: number,
  projectPath?: string,
  allRoots?: boolean
): Promise<FindResultItem[]> {
  const result = await search.searchHybrid({
    query,
    projectPath,
    allRoots,
    glob: '*',
    maxResults: fetchLimit,
    caseSensitive: false,
    minSemanticScore: 0.05,
    autoIndex: true
  });
  const results = result.results || [];
  if (results.length === 0) return [];

  // Normalize code scores to 0-1
  const maxScore = Math.max(...results.map(r => r.final_score), 0.001);
  return results.map(r => ({
    source: 'code' as const,
    score: Number((r.final_score / maxScore).toFixed(3)),
    file: r.file,
    start_line: r.start_line,
    end_line: r.end_line,
    snippet: r.snippet || r.text || undefined
  }));
}

async function fetchTripleResults(
  memory: MemoryServiceLike,
  query: string,
  fetchLimit: number
): Promise<FindResultItem[]> {
  const result = await memory.searchTriples({ query, limit: fetchLimit });
  return (result.items || []).map(item => ({
    source: 'triple' as const,
    score: item.score,
    subject: item.subject,
    predicate: item.predicate,
    object: item.object,
    triple_id: item.triple_id
  }));
}

function itemKey(item: FindResultItem, source: string): string {
  switch (source) {
    case 'memory': return `m:${item.memory_id}`;
    case 'code': return `c:${item.file}:${item.start_line}:${item.end_line}`;
    case 'triple': return `t:${item.triple_id}`;
    default: return `${source}:${JSON.stringify(item)}`;
  }
}

function rrfFuse(
  lists: Array<{ source: 'memory' | 'code' | 'triple'; items: FindResultItem[] }>,
  limit: number
): FindResultItem[] {
  // Each list is already sorted by score descending (from fetch functions).
  // Assign per-source rank and compute RRF score.
  const scored: Array<{ item: FindResultItem; rrfTotal: number }> = [];
  const seenKeys = new Map<string, number>(); // key -> index in scored[]

  for (const { source, items } of lists) {
    for (let rank = 0; rank < items.length; rank++) {
      const item = items[rank];
      const rrfScore = 1 / (RRF_K + rank + 1);
      const key = itemKey(item, source);

      const existingIdx = seenKeys.get(key);
      if (existingIdx !== undefined) {
        // Same item appeared in multiple sources (rare but possible)
        scored[existingIdx].rrfTotal += rrfScore;
      } else {
        seenKeys.set(key, scored.length);
        scored.push({ item: { ...item, score: rrfScore }, rrfTotal: rrfScore });
      }
    }
  }

  // Sort by total RRF score descending
  scored.sort((a, b) => b.rrfTotal - a.rrfTotal);

  return scored.slice(0, limit).map(s => ({
    ...s.item,
    score: Number(s.rrfTotal.toFixed(4))
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function unifiedFind(
  input: FindInput,
  deps: FindDeps
): Promise<FindResult> {
  const query = (input.query || '').trim();
  if (!query) {
    return { query: '', count: 0, sources: { memory: 0, code: 0, triple: 0 }, items: [] };
  }

  const limit = clampLimit(input.limit);
  const wantedSources = new Set(input.sources || ALL_SOURCES);
  const fetchLimit = Math.max(limit * 2, 20);

  // Build promise array for parallel execution
  const promises: Array<Promise<{ source: 'memory' | 'code' | 'triple'; items: FindResultItem[] }>> = [];

  if (wantedSources.has('memory') && deps.memory) {
    promises.push(
      fetchMemoryResults(deps.memory, query, fetchLimit, input.projectPath)
        .then(items => ({ source: 'memory' as const, items }))
        .catch(() => ({ source: 'memory' as const, items: [] as FindResultItem[] }))
    );
  }

  if (wantedSources.has('code') && deps.search) {
    promises.push(
      fetchCodeResults(deps.search, query, Math.max(limit * 3, 30), input.projectPath, input.allRoots)
        .then(items => ({ source: 'code' as const, items }))
        .catch(() => ({ source: 'code' as const, items: [] as FindResultItem[] }))
    );
  }

  if (wantedSources.has('triple') && deps.memory) {
    promises.push(
      fetchTripleResults(deps.memory, query, fetchLimit)
        .then(items => ({ source: 'triple' as const, items }))
        .catch(() => ({ source: 'triple' as const, items: [] as FindResultItem[] }))
    );
  }

  const sourceLists = await Promise.all(promises);

  // RRF fusion across all sources
  const fused = rrfFuse(sourceLists, limit);

  // Count per source
  const sourceCounts = { memory: 0, code: 0, triple: 0 };
  for (const item of fused) {
    sourceCounts[item.source]++;
  }

  return {
    query,
    count: fused.length,
    sources: sourceCounts,
    items: fused
  };
}
