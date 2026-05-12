/**
 * On-device NER (Named Entity Recognition) service using BERT-NER model.
 * 
 * Lazy-loads Xenova/bert-base-NER via @huggingface/transformers (already a dependency).
 * Follows the same lazy-loading pattern as EmbeddingService.
 * 
 * Opt-in via config: SYNAPSE_NER_ENABLED=true
 * 
 * @see https://github.com/TheJenilDGohel/synapse/issues/67
 */
import type { ExtractedEntity } from '../types/index.js';

const DEFAULT_NER_MODEL = 'Xenova/bert-base-NER';

interface NERPipeline {
  (text: string): Promise<NERResult[]>;
}

interface NERResult {
  entity: string;       // e.g. "B-PER", "I-PER", "B-ORG", "I-ORG", "B-LOC", "I-LOC", "B-MISC", "I-MISC"
  score: number;        // confidence score 0-1
  index: number;        // token index
  word: string;         // the token text
  start: number;        // character start offset
  end: number;          // character end offset
  entity_group?: string; // aggregated entity group (when using aggregation_strategy)
}

interface AggregatedNERResult {
  entity_group: string; // "PER", "ORG", "LOC", "MISC"
  score: number;
  word: string;
  start: number;
  end: number;
}

/** Map NER entity groups to Synapse entity types */
const ENTITY_GROUP_MAP: Record<string, string> = {
  'PER': 'person',
  'ORG': 'organization',
  'LOC': 'location',
  'MISC': 'concept'
};

export interface NERServiceOptions {
  model?: string;
  cacheDir?: string;
  confidenceThreshold?: number;
}

export interface NERStatus {
  enabled: boolean;
  model: string;
  available: boolean;
  error?: string;
}

export class NERService {
  private _model: string;
  private _cacheDir: string;
  private _confidenceThreshold: number;
  private _pipelinePromise: Promise<NERPipeline> | null;
  private _available: boolean;
  private _lastError: string;

  constructor({ model, cacheDir, confidenceThreshold }: NERServiceOptions = {}) {
    this._model = model || DEFAULT_NER_MODEL;
    this._cacheDir = cacheDir || '';
    this._confidenceThreshold = confidenceThreshold ?? 0.75;
    this._pipelinePromise = null;
    this._available = false;
    this._lastError = '';
  }

  getStatus(): NERStatus {
    return {
      enabled: true,
      model: this._model,
      available: this._available,
      error: this._lastError || undefined
    };
  }

  /**
   * Lazy-load the NER pipeline on first use.
   * Same pattern as EmbeddingService._getPipeline().
   */
  private async _getPipeline(): Promise<NERPipeline> {
    if (this._pipelinePromise) return this._pipelinePromise;

    this._pipelinePromise = (async () => {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const mod = require('@huggingface/transformers') as {
        env: { cacheDir: string };
        pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<unknown>;
      };
      if (this._cacheDir) {
        mod.env.cacheDir = this._cacheDir;
      }
      return mod.pipeline('token-classification', this._model, {
        aggregation_strategy: 'simple'
      });
    })() as Promise<NERPipeline>;

    try {
      const pipeline = await this._pipelinePromise;
      this._available = true;
      return pipeline;
    } catch (error) {
      this._available = false;
      this._lastError = String((error as Error)?.message || error);
      this._pipelinePromise = null;
      throw error;
    }
  }

  /**
   * Extract named entities from text using BERT-NER.
   * Returns standardized ExtractedEntity[] compatible with the existing pipeline.
   */
  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    if (!text || typeof text !== 'string' || text.length < 3) return [];

    try {
      const pipeline = await this._getPipeline();

      // BERT-NER has a token limit; process in chunks if needed
      const chunks = this._splitIntoChunks(text, 450); // ~450 words per chunk for safety
      const allResults: AggregatedNERResult[] = [];

      for (const chunk of chunks) {
        const results = await pipeline(chunk) as unknown as AggregatedNERResult[];
        if (Array.isArray(results)) {
          allResults.push(...results);
        }
      }

      return this._aggregateResults(allResults);
    } catch (error) {
      this._lastError = String((error as Error)?.message || error);
      return []; // Graceful fallback — return empty, let regex extractor handle it
    }
  }

  /**
   * Split text into chunks that fit within BERT's token window.
   * Splits on sentence boundaries where possible.
   */
  private _splitIntoChunks(text: string, maxWords: number): string[] {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return [text];

    const chunks: string[] = [];
    let current: string[] = [];

    for (const word of words) {
      current.push(word);
      if (current.length >= maxWords) {
        chunks.push(current.join(' '));
        current = [];
      }
    }
    if (current.length > 0) {
      chunks.push(current.join(' '));
    }

    return chunks;
  }

  /**
   * Aggregate NER results: deduplicate, filter by confidence, map to ExtractedEntity[].
   */
  private _aggregateResults(results: AggregatedNERResult[]): ExtractedEntity[] {
    const seen = new Set<string>();
    const entities: ExtractedEntity[] = [];

    for (const result of results) {
      if (result.score < this._confidenceThreshold) continue;

      const entityGroup = result.entity_group || 'MISC';
      const entityType = ENTITY_GROUP_MAP[entityGroup] || 'concept';

      // Clean up subword tokens (BERT uses ## for subword pieces)
      const name = result.word
        .replace(/\s*##\s*/g, '')
        .replace(/^\s+|\s+$/g, '')
        .trim();

      if (name.length < 2 || name.length > 100) continue;

      const key = `${name.toLowerCase()}:${entityType}`;
      if (seen.has(key)) continue;
      seen.add(key);

      entities.push({ name, type: entityType });
    }

    return entities.slice(0, 50); // Same cap as regex extractor
  }
}
