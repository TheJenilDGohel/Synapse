import path from 'node:path';
import { tokenize, toSparsePairs } from '../core/tokenizer.js';
import { bm25Score, cosineSimilarity, cosineToUnitScore, normalizeBm25 } from '../core/relevance.js';

export interface FileStat {
  mtimeMs: number;
  size: number;
}

export function makeFileSignature(st: FileStat): string {
  return `${st.mtimeMs}:${st.size}`;
}

export function isUnderBase(filePath: string, bases: string[]): boolean {
  const abs = path.resolve(filePath);
  return bases.some((base) => {
    const rel = path.relative(base, abs);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

export function toTermCount(tfPairs: [string, number][] | null): number {
  let total = 0;
  for (const [, tf] of tfPairs || []) total += Number(tf) || 0;
  return Math.max(1, total);
}

interface VectorIndexServiceLike {
  workspace: {
    walkDirectories(base: string): Iterable<{ files: string[] }>;
    isLikelyTextFile(filePath: string): boolean;
    resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
    normalizeTarget(path: string): string;
  };
  maxIndexedFiles: number;
  astChunker: {
    chunk(opts: { filePath: string; text: string; chunkLines: number; chunkOverlap: number }): Promise<{ start_line: number; end_line: number; raw_text: string; semantic_text?: string }[]>;
  } | null;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  embeddingService: {
    isEnabled(): boolean;
    embed(text: string): Promise<number[] | null>;
    embedBatch(texts: string[]): Promise<number[][]>;
  } | null;
  bm25K1: number;
  bm25B: number;
  data: VectorIndexData;
  ensureLoaded(): void;
}

export interface VectorIndexChunk {
  start_line: number;
  end_line: number;
  preview: string;
  terms: [string, number][];
  term_count: number;
  embedding: number[] | null;
}

export interface VectorIndexDocument {
  signature: string;
  chunks: VectorIndexChunk[];
}

export interface VectorIndexData {
  version: number;
  updated_at: string | null;
  total_chunks: number;
  total_files: number;
  avg_chunk_terms: number;
  df: Record<string, number>;
  documents: Record<string, VectorIndexDocument>;
}

export interface SemanticResult {
  file: string;
  start_line: number;
  end_line: number;
  snippet: string;
  semantic_score: number;
}

export function collectFiles(service: VectorIndexServiceLike, bases: string[], maxFiles: number): string[] {
  const files: string[] = [];
  for (const base of bases) {
    for (const { files: batch } of service.workspace.walkDirectories(base)) {
      for (const filePath of batch) {
        if (!service.workspace.isLikelyTextFile(filePath)) continue;
        files.push(filePath);
        if (files.length >= Math.min(maxFiles, service.maxIndexedFiles)) {
          return files;
        }
      }
    }
  }
  return files;
}

export async function chunkFile(service: VectorIndexServiceLike, filePath: string, text: string): Promise<VectorIndexChunk[]> {
  const lines = text.split(/\r?\n/);
  const chunks: VectorIndexChunk[] = [];
  const chunkTexts: string[] = [];

  const slices = service.astChunker
    ? await service.astChunker.chunk({
      filePath,
      text,
      chunkLines: service.chunkLines,
      chunkOverlap: service.chunkOverlap
    })
    : null;

  const effectiveSlices = Array.isArray(slices) && slices.length > 0
    ? slices
    : (() => {
      const step = Math.max(1, service.chunkLines - service.chunkOverlap);
      const out: { start_line: number; end_line: number; raw_text: string; semantic_text: string }[] = [];
      for (let start = 1; start <= lines.length; start += step) {
        const end = Math.min(lines.length, start + service.chunkLines - 1);
        const rawText = lines.slice(start - 1, end).join('\n');
        out.push({ start_line: start, end_line: end, raw_text: rawText, semantic_text: rawText });
      }
      return out;
    })();

  for (const slice of effectiveSlices) {
    const chunkText = slice.raw_text;
    const semanticText = slice.semantic_text || slice.raw_text;
    const tokens = tokenize(semanticText);
    if (tokens.length === 0) continue;

    const terms = toSparsePairs(tokens, service.maxTermsPerChunk);
    chunks.push({
      start_line: slice.start_line,
      end_line: slice.end_line,
      preview: chunkText.slice(0, 500),
      terms,
      term_count: toTermCount(terms),
      embedding: null
    });
    chunkTexts.push(semanticText);
  }

  if (service.embeddingService?.isEnabled?.() && chunks.length > 0) {
    try {
      const embeddings = await service.embeddingService.embedBatch(chunkTexts);
      for (let i = 0; i < chunks.length; i += 1) {
        if (Array.isArray(embeddings[i]) && embeddings[i].length > 0) {
          chunks[i].embedding = embeddings[i];
        }
      }
    } catch {
      // If embeddings fail for a file, BM25 fallback remains usable.
    }
  }

  return chunks;
}

export function rebuildStats(service: VectorIndexServiceLike): void {
  const df = new Map<string, number>();
  let totalFiles = 0;
  let totalChunks = 0;
  let totalTerms = 0;

  for (const doc of Object.values(service.data.documents)) {
    totalFiles += 1;
    for (const chunk of doc.chunks || []) {
      totalChunks += 1;
      totalTerms += chunk.term_count || toTermCount(chunk.terms || []);
      const seen = new Set<string>();
      for (const [term] of chunk.terms || []) {
        if (seen.has(term)) continue;
        seen.add(term);
        df.set(term, (df.get(term) || 0) + 1);
      }
    }
  }

  service.data.version = 2;
  service.data.df = Object.fromEntries(df.entries());
  service.data.total_files = totalFiles;
  service.data.total_chunks = totalChunks;
  service.data.avg_chunk_terms = totalChunks > 0 ? (totalTerms / totalChunks) : 0;
  service.data.updated_at = new Date().toISOString();
}

export async function semanticSearch(
  service: VectorIndexServiceLike,
  { query, projectPath, allRoots, maxResults, minScore }: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    maxResults: number;
    minScore: number;
  }
): Promise<SemanticResult[]> {
  service.ensureLoaded();
  if (!query || !query.trim()) return [];

  const bases = service.workspace.resolveSearchBases(projectPath, allRoots).map((p) => service.workspace.normalizeTarget(p));
  const queryTokens = tokenize(query);
  const queryTfPairs = toSparsePairs(queryTokens, service.maxTermsPerChunk);

  let queryEmbedding: number[] | null = null;
  if (service.embeddingService?.isEnabled?.()) {
    try {
      queryEmbedding = await service.embeddingService.embed(query);
    } catch {
      queryEmbedding = null;
    }
  }

  if (queryTfPairs.length === 0 && !queryEmbedding) return [];

  const totalChunks = Math.max(1, service.data.total_chunks || 0);
  const avgChunkTerms = Math.max(1, Number(service.data.avg_chunk_terms) || 0);
  const dfLookup = new Map(queryTfPairs.map(([term]) => [term, service.data.df?.[term] || 0]));

  const out: SemanticResult[] = [];
  for (const [filePath, doc] of Object.entries(service.data.documents)) {
    if (!isUnderBase(filePath, bases)) continue;
    for (const chunk of doc.chunks || []) {
      const termLookup = new Map(chunk.terms || []);
      const bm25Raw = bm25Score(
        queryTfPairs,
        termLookup,
        chunk.term_count || toTermCount(chunk.terms || []),
        avgChunkTerms,
        totalChunks,
        dfLookup,
        { k1: service.bm25K1, b: service.bm25B }
      );
      const bm25Norm = normalizeBm25(bm25Raw);

      let score = bm25Norm;
      if (queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
        score = cosineToUnitScore(cosineSimilarity(queryEmbedding, chunk.embedding));
      }

      if (score < minScore) continue;
      out.push({
        file: filePath,
        start_line: chunk.start_line,
        end_line: chunk.end_line,
        snippet: chunk.preview,
        semantic_score: score
      });
    }
  }

  out.sort((a, b) => b.semantic_score - a.semantic_score);
  return out.slice(0, maxResults);
}
