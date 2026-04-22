const DEFAULT_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2';

function normalizeProvider(provider: string): string {
  if (provider === 'xenova') return 'huggingface';
  return provider || 'huggingface';
}

function sigmoid(value: number): number {
  const n = Number(value) || 0;
  if (n >= 0) {
    const z = Math.exp(-n);
    return 1 / (1 + z);
  }
  const z = Math.exp(n);
  return z / (1 + z);
}

export interface RerankerStatus {
  provider: string;
  model: string;
  enabled: boolean;
  available: boolean;
  error?: string;
}

export interface RerankerCandidate {
  text?: string;
  snippet?: string;
  file?: string;
}

export interface RerankerServiceOptions {
  provider?: string;
  model?: string;
  cacheDir?: string;
}

interface ModelBundle {
  tokenizer: {
    (query: string, opts: { text_pair: string; padding: boolean; truncation: boolean }): Promise<unknown>;
  };
  model: {
    (inputs: unknown): Promise<{ logits?: { data?: number[] } }>;
  };
}

export class RerankerService {
  provider: string;
  model: string;
  cacheDir: string;
  private _modelPromise: Promise<ModelBundle> | null;
  _available: boolean;
  _lastError: string;

  constructor({ provider = 'huggingface', model, cacheDir }: RerankerServiceOptions = {}) {
    this.provider = normalizeProvider(provider);
    this.model = model || DEFAULT_MODEL;
    this.cacheDir = cacheDir || '';
    this._modelPromise = null;
    this._available = false;
    this._lastError = '';
  }

  isEnabled(): boolean {
    return this.provider !== 'none';
  }

  getStatus(): RerankerStatus {
    return {
      provider: this.provider,
      model: this.model,
      enabled: this.isEnabled(),
      available: this._available,
      error: this._lastError || undefined
    };
  }

  async _getModelBundle(): Promise<ModelBundle> {
    if (this._modelPromise) return this._modelPromise;

    this._modelPromise = (async () => {
      const mod = await import('@huggingface/transformers') as {
        env: { cacheDir: string };
        AutoTokenizer: { from_pretrained: (model: string) => Promise<unknown> };
        AutoModelForSequenceClassification: { from_pretrained: (model: string) => Promise<unknown> };
      };
      const { AutoTokenizer, AutoModelForSequenceClassification } = mod;
      if (this.cacheDir) {
        mod.env.cacheDir = this.cacheDir;
      }
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(this.model),
        AutoModelForSequenceClassification.from_pretrained(this.model)
      ]);
      return { tokenizer, model } as unknown as ModelBundle;
    })();

    try {
      const bundle = await this._modelPromise;
      this._available = true;
      return bundle;
    } catch (error) {
      this._available = false;
      this._lastError = String((error as Error)?.message || error);
      this._modelPromise = null;
      throw error;
    }
  }

  async rawScore(query: string, text: string): Promise<number> {
    if (!this.isEnabled()) return 0;
    const { tokenizer, model } = await this._getModelBundle();
    const inputs = await tokenizer(String(query), {
      text_pair: String(text),
      padding: true,
      truncation: true
    });
    const out = await model(inputs);
    return Number(out?.logits?.data?.[0] || 0);
  }

  async score(query: string, text: string): Promise<number> {
    try {
      return sigmoid(await this.rawScore(query, text));
    } catch (error) {
      this._available = false;
      this._lastError = String((error as Error)?.message || error);
      return 0;
    }
  }

  async rerank(query: string, candidates: RerankerCandidate[]): Promise<number[]> {
    if (!this.isEnabled() || !Array.isArray(candidates) || candidates.length === 0) return [];
    const out: number[] = [];
    for (const candidate of candidates) {
      const snippet = candidate.text || candidate.snippet || candidate.file || '';
      try {
        const scoreVal = await this.score(query, String(snippet));
        out.push(scoreVal);
      } catch (error) {
        this._available = false;
        this._lastError = String((error as Error)?.message || error);
        return [];
      }
    }
    this._lastError = '';
    return out;
  }
}
