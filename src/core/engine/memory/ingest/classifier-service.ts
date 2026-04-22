/**
 * On-device memory type classifier using zero-shot text classification.
 * 
 * Automatically tags memories as: decision, fact, learning, event, opinion, or preference
 * without requiring the caller to specify a type.
 * 
 * Uses Xenova/nli-deberta-v3-small (~140MB) for zero-shot classification.
 * Lazy-loaded on first use; opt-in via config: SYNAPSE_CLASSIFIER_ENABLED=true.
 * 
 * @see https://github.com/wmt-mobile/localnest/issues/68
 */

/** Valid auto-classification categories for memories */
export const MEMORY_CATEGORIES = [
  'decision',
  'fact',
  'learning',
  'event',
  'opinion',
  'preference'
] as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[number];

const DEFAULT_CLASSIFIER_MODEL = 'Xenova/nli-deberta-v3-small';

/** Category labels for the zero-shot classifier. Phrased as hypotheses for NLI. */
const CATEGORY_HYPOTHESES: Record<MemoryCategory, string> = {
  decision: 'This is about a decision that was made.',
  fact: 'This is a factual statement or piece of information.',
  learning: 'This describes something that was learned or discovered.',
  event: 'This describes an event or something that happened.',
  opinion: 'This expresses an opinion or personal view.',
  preference: 'This describes a preference or choice.'
};

interface ClassifierPipeline {
  (text: string, labels: string[], opts?: Record<string, unknown>): Promise<ClassificationResult>;
}

interface ClassificationResult {
  sequence: string;
  labels: string[];
  scores: number[];
}

export interface ClassificationOutput {
  /** The inferred memory category */
  auto_type: MemoryCategory;
  /** Confidence score (0-1) for the top category */
  confidence: number;
  /** All category scores, sorted by confidence */
  all_scores: Array<{ category: MemoryCategory; score: number }>;
}

export interface ClassifierServiceOptions {
  model?: string;
  cacheDir?: string;
  /** Minimum confidence to assign a type. Below this, returns null. Default: 0.35 */
  confidenceThreshold?: number;
}

export interface ClassifierStatus {
  enabled: boolean;
  model: string;
  available: boolean;
  categories: readonly string[];
  error?: string;
}

export class MemoryClassifierService {
  private _model: string;
  private _cacheDir: string;
  private _confidenceThreshold: number;
  private _pipelinePromise: Promise<ClassifierPipeline> | null;
  private _available: boolean;
  private _lastError: string;

  constructor({ model, cacheDir, confidenceThreshold }: ClassifierServiceOptions = {}) {
    this._model = model || DEFAULT_CLASSIFIER_MODEL;
    this._cacheDir = cacheDir || '';
    this._confidenceThreshold = confidenceThreshold ?? 0.35;
    this._pipelinePromise = null;
    this._available = false;
    this._lastError = '';
  }

  getStatus(): ClassifierStatus {
    return {
      enabled: true,
      model: this._model,
      available: this._available,
      categories: MEMORY_CATEGORIES,
      error: this._lastError || undefined
    };
  }

  /**
   * Lazy-load the zero-shot classification pipeline on first use.
   */
  private async _getPipeline(): Promise<ClassifierPipeline> {
    if (this._pipelinePromise) return this._pipelinePromise;

    this._pipelinePromise = (async () => {
      const mod = await import('@huggingface/transformers') as {
        env: { cacheDir: string };
        pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<unknown>;
      };
      if (this._cacheDir) {
        mod.env.cacheDir = this._cacheDir;
      }
      return mod.pipeline('zero-shot-classification', this._model);
    })() as Promise<ClassifierPipeline>;

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
   * Classify a memory's content into one of the predefined categories.
   * 
   * Returns null if confidence is below threshold — the caller should
   * NOT override any explicit user-provided type with an auto-classified one.
   */
  async classify(text: string): Promise<ClassificationOutput | null> {
    if (!text || typeof text !== 'string' || text.length < 10) return null;

    try {
      const pipeline = await this._getPipeline();

      // Truncate very long texts to first ~500 chars for classification efficiency
      const truncated = text.length > 500 ? text.slice(0, 500) : text;

      const candidateLabels = Object.values(CATEGORY_HYPOTHESES);
      const result = await pipeline(truncated, candidateLabels, {
        multi_label: false
      });

      if (!result || !result.labels || !result.scores) return null;

      // Map hypothesis labels back to category names
      const hypothesisToCategory = new Map<string, MemoryCategory>();
      for (const [category, hypothesis] of Object.entries(CATEGORY_HYPOTHESES)) {
        hypothesisToCategory.set(hypothesis, category as MemoryCategory);
      }

      const allScores: Array<{ category: MemoryCategory; score: number }> = [];
      for (let i = 0; i < result.labels.length; i++) {
        const category = hypothesisToCategory.get(result.labels[i]);
        if (category) {
          allScores.push({ category, score: result.scores[i] });
        }
      }

      // Sort by score descending
      allScores.sort((a, b) => b.score - a.score);

      if (allScores.length === 0) return null;

      const top = allScores[0];
      if (top.score < this._confidenceThreshold) return null;

      return {
        auto_type: top.category,
        confidence: top.score,
        all_scores: allScores
      };
    } catch (error) {
      this._lastError = String((error as Error)?.message || error);
      return null; // Graceful degradation — don't break the store pipeline
    }
  }
}
