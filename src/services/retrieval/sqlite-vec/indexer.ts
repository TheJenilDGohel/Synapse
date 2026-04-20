import { tokenize, toSparsePairs } from '../core/tokenizer.js';

interface WorkspaceLike {
  walkDirectories(base: string): Iterable<{ files: string[] }>;
  isLikelyTextFile(filePath: string): boolean;
}

interface AstChunkerLike {
  chunk(opts: { filePath: string; text: string; chunkLines: number; chunkOverlap: number }): Promise<ChunkSliceInput[]>;
}

interface EmbeddingServiceLike {
  isEnabled(): boolean;
  embedBatch(texts: string[]): Promise<number[][]>;
}

interface ChunkSliceInput {
  start_line: number;
  end_line: number;
  raw_text: string;
  semantic_text?: string;
}

export interface IndexedChunk {
  id: string;
  start_line: number;
  end_line: number;
  preview: string;
  terms: [string, number][];
  term_count: number;
  embedding: number[] | null;
  norm: number;
}

export function collectFiles(
  workspace: WorkspaceLike,
  bases: string[],
  maxFiles: number,
  maxIndexedFiles: number
): string[] {
  const files: string[] = [];
  for (const base of bases) {
    for (const { files: batch } of workspace.walkDirectories(base)) {
      for (const filePath of batch) {
        if (!workspace.isLikelyTextFile(filePath)) continue;
        files.push(filePath);
        if (files.length >= Math.min(maxFiles, maxIndexedFiles)) {
          return files;
        }
      }
    }
  }
  return files;
}

export async function chunkFile(
  filePath: string,
  text: string,
  { astChunker, embeddingService, chunkLines, chunkOverlap, maxTermsPerChunk }: {
    astChunker: AstChunkerLike | null;
    embeddingService: EmbeddingServiceLike | null;
    chunkLines: number;
    chunkOverlap: number;
    maxTermsPerChunk: number;
  }
): Promise<IndexedChunk[]> {
  const lines = text.split(/\r?\n/);
  const chunks: IndexedChunk[] = [];
  const chunkTexts: string[] = [];

  const slices = astChunker
    ? await astChunker.chunk({ filePath, text, chunkLines, chunkOverlap })
    : null;

  const effectiveSlices: ChunkSliceInput[] = Array.isArray(slices) && slices.length > 0
    ? slices
    : (() => {
      const step = Math.max(1, chunkLines - chunkOverlap);
      const out: ChunkSliceInput[] = [];
      for (let start = 1; start <= lines.length; start += step) {
        const end = Math.min(lines.length, start + chunkLines - 1);
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
    const terms = toSparsePairs(tokens, maxTermsPerChunk);
    const termCount = terms.reduce((sum, [, tf]) => sum + (Number(tf) || 0), 0);
    chunks.push({
      id: `${filePath}:${slice.start_line}-${slice.end_line}`,
      start_line: slice.start_line,
      end_line: slice.end_line,
      preview: chunkText.slice(0, 500),
      terms,
      term_count: Math.max(1, termCount),
      embedding: null,
      norm: 0
    });
    chunkTexts.push(semanticText);
  }

  if (embeddingService?.isEnabled?.() && chunks.length > 0) {
    try {
      const embeddings = await embeddingService.embedBatch(chunkTexts);
      for (let i = 0; i < chunks.length; i += 1) {
        if (Array.isArray(embeddings[i]) && embeddings[i].length > 0) {
          chunks[i].embedding = embeddings[i];
        }
      }
    } catch {
      // Fallback BM25 remains available.
    }
  }

  return chunks;
}
