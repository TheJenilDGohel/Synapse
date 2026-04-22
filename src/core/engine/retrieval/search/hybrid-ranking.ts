import { scorePathAffinity } from './query-utils.js';
import type { SemanticResult } from './auto-index.js';

export interface LexicalMatch {
  file: string;
  line: number;
  text: string;
}

export interface FusedResult {
  type: string;
  file: string;
  line?: number;
  start_line: number;
  end_line: number;
  text?: string;
  snippet?: string;
  lexical_rank: number | null;
  lexical_score: number;
  semantic_rank: number | null;
  semantic_score: number;
  semantic_score_raw: number | null;
  path_affinity?: number;
  rrf_score: number;
  final_score: number;
  reranker_score: number | null;
}

export interface RerankerMeta {
  requested: boolean;
  applied: boolean;
  reason: string;
  min_candidates?: number;
  candidate_count?: number;
  reranked?: number;
}

interface RerankerLike {
  isEnabled?: () => boolean;
  rerank(query: string, candidates: FusedResult[]): Promise<number[]>;
}

function buildFusedBase({ lexical, semantic }: { lexical: LexicalMatch[]; semantic: SemanticResult[] }): FusedResult[] {
  const k = 60;
  const scored = new Map<string, FusedResult>();
  const lexicalLineKey = new Map<string, string>();

  lexical.forEach((item, idx) => {
    const key = `${item.file}:${item.line}:${item.line}`;
    scored.set(key, {
      type: 'lexical',
      file: item.file,
      line: item.line,
      start_line: item.line,
      end_line: item.line,
      text: item.text,
      lexical_rank: idx + 1,
      lexical_score: 1 / (k + idx + 1),
      semantic_rank: null,
      semantic_score: 0,
      semantic_score_raw: null,
      rrf_score: 0,
      final_score: 0,
      reranker_score: null
    });
    lexicalLineKey.set(`${item.file}:${item.line}`, key);
  });

  semantic.forEach((item, idx) => {
    let mergedKey: string | null = null;
    for (let line = item.start_line; line <= item.end_line; line += 1) {
      const byLine = lexicalLineKey.get(`${item.file}:${line}`);
      if (byLine) {
        mergedKey = byLine;
        break;
      }
    }
    const key = mergedKey || `${item.file}:${item.start_line}:${item.end_line}`;
    const existing = scored.get(key);
    if (existing) {
      existing.type = 'hybrid';
      existing.start_line = Math.min(existing.start_line || item.start_line, item.start_line);
      existing.end_line = Math.max(existing.end_line || item.end_line, item.end_line);
      if (!existing.snippet) existing.snippet = item.snippet;
      existing.semantic_rank = idx + 1;
      existing.semantic_score = 1 / (k + idx + 1);
      existing.semantic_score_raw = item.semantic_score;
      return;
    }

    scored.set(key, {
      type: 'semantic',
      file: item.file,
      start_line: item.start_line,
      end_line: item.end_line,
      snippet: item.snippet,
      lexical_rank: null,
      lexical_score: 0,
      semantic_rank: idx + 1,
      semantic_score: 1 / (k + idx + 1),
      semantic_score_raw: item.semantic_score,
      rrf_score: 0,
      final_score: 0,
      reranker_score: null
    });
  });

  return Array.from(scored.values());
}

function applyRrfAdjustments({ rows, queryTerms, allRoots, genericShortQuery }: {
  rows: FusedResult[];
  queryTerms: string[];
  allRoots?: boolean;
  genericShortQuery: boolean;
}): FusedResult[] {
  return rows
    .map((item) => ({
      ...item,
      path_affinity: scorePathAffinity(item.file, queryTerms)
    }))
    .map((item) => {
      let rrfScore = item.lexical_score + item.semantic_score;

      if (allRoots) {
        rrfScore += item.path_affinity * 0.03;
      }

      if (genericShortQuery && item.type === 'lexical' && item.semantic_score === 0) {
        rrfScore *= 0.35;
      }

      if (genericShortQuery && item.type === 'hybrid') {
        rrfScore += 0.004;
      }

      return {
        ...item,
        rrf_score: rrfScore,
        final_score: rrfScore,
        reranker_score: null
      };
    })
    .sort((a, b) => b.rrf_score - a.rrf_score);
}

async function maybeApplyReranker({
  fused,
  query,
  useReranker,
  reranker,
  rerankerMinCandidates,
  rerankerTopN
}: {
  fused: FusedResult[];
  query: string;
  useReranker: boolean;
  reranker: RerankerLike | null;
  rerankerMinCandidates: number;
  rerankerTopN: number;
}): Promise<{ fused: FusedResult[]; rerankerMeta: RerankerMeta }> {
  let rerankerMeta: RerankerMeta = {
    requested: !!useReranker,
    applied: false,
    reason: 'not-requested'
  };

  if (useReranker && reranker?.isEnabled?.()) {
    if (fused.length < rerankerMinCandidates) {
      rerankerMeta = {
        requested: true,
        applied: false,
        reason: 'not-enough-candidates',
        min_candidates: rerankerMinCandidates,
        candidate_count: fused.length
      };
      return { fused, rerankerMeta };
    }

    const rerankWindow = fused.slice(0, Math.min(fused.length, rerankerTopN));
    const rerankScores = await reranker.rerank(query, rerankWindow);
    if (rerankScores.length === rerankWindow.length) {
      for (let i = 0; i < rerankWindow.length; i += 1) {
        const score = rerankScores[i];
        rerankWindow[i].reranker_score = score;
        rerankWindow[i].final_score = rerankWindow[i].rrf_score * 0.7 + score * 0.3;
      }
      const result = [...rerankWindow, ...fused.slice(rerankWindow.length)]
        .sort((a, b) => b.final_score - a.final_score);
      rerankerMeta = {
        requested: true,
        applied: true,
        reason: 'ok',
        reranked: rerankWindow.length
      };
      return { fused: result, rerankerMeta };
    }

    rerankerMeta = {
      requested: true,
      applied: false,
      reason: 'reranker-unavailable'
    };
    return { fused, rerankerMeta };
  }

  if (useReranker) {
    rerankerMeta = {
      requested: true,
      applied: false,
      reason: 'reranker-disabled'
    };
  }
  return { fused, rerankerMeta };
}

function computeRankingMode({ lexicalHits, semanticHits }: { lexicalHits: number; semanticHits: number }): string {
  if (lexicalHits > 0 && semanticHits > 0) return 'hybrid';
  if (lexicalHits > 0) return 'lexical-only';
  if (semanticHits > 0) return 'semantic-only';
  return 'none';
}

export interface FuseRankOptions {
  query: string;
  lexical: LexicalMatch[];
  semantic: SemanticResult[];
  queryTerms: string[];
  allRoots?: boolean;
  genericShortQuery: boolean;
  useReranker: boolean;
  reranker: RerankerLike | null;
  rerankerMinCandidates: number;
  rerankerTopN: number;
  maxResults: number;
}

export interface FuseRankResult {
  results: FusedResult[];
  reranker: RerankerMeta;
  rankingMode: string;
}

export async function fuseRankAndRerank({
  query,
  lexical,
  semantic,
  queryTerms,
  allRoots,
  genericShortQuery,
  useReranker,
  reranker,
  rerankerMinCandidates,
  rerankerTopN,
  maxResults
}: FuseRankOptions): Promise<FuseRankResult> {
  const base = buildFusedBase({ lexical, semantic });
  let fused = applyRrfAdjustments({
    rows: base,
    queryTerms,
    allRoots,
    genericShortQuery
  });

  const reranked = await maybeApplyReranker({
    fused,
    query,
    useReranker,
    reranker,
    rerankerMinCandidates,
    rerankerTopN
  });
  fused = reranked.fused.slice(0, maxResults);

  return {
    results: fused,
    reranker: reranked.rerankerMeta,
    rankingMode: computeRankingMode({
      lexicalHits: lexical.length,
      semanticHits: semantic.length
    })
  };
}
