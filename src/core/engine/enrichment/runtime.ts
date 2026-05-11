import { pipeline, env } from '@huggingface/transformers';

/**
 * Enrichment Runtime - Wraps Transformers.js v4 for code metadata generation.
 * Supports WebGPU for high-performance local inference.
 */

export interface EnrichmentRuntimeOptions {
  device?: 'webgpu' | 'cpu' | 'cuda';
  dtype?: 'q4' | 'q8' | 'fp16' | 'fp32';
  modelId?: string;
  cacheDir?: string;
}

export class EnrichmentRuntime {
  private generator: any = null;
  private options: EnrichmentRuntimeOptions;

  constructor(options: EnrichmentRuntimeOptions = {}) {
    this.options = {
      device: options.device || 'webgpu',
      dtype: options.dtype || 'q4',
      modelId: options.modelId || 'Qwen/Qwen2.5-Coder-1.5B-Instruct',
      cacheDir: options.cacheDir
    };

    // Configure Transformers.js environment
    if (this.options.cacheDir) {
      env.cacheDir = this.options.cacheDir;
    }
    
    // Enable WebGPU if requested
    if (this.options.device === 'webgpu') {
      if (env.backends.onnx.wasm) {
        (env.backends.onnx.wasm as any).proxy = true;
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.generator) return;

    try {
      this.generator = await pipeline('text-generation', this.options.modelId, {
        device: this.options.device,
        dtype: this.options.dtype,
      });
    } catch (error) {
      console.error('[enrichment-runtime] failed to initialize:', error);
      // Fallback to CPU if WebGPU fails
      if (this.options.device === 'webgpu') {
        console.warn('[enrichment-runtime] falling back to CPU...');
        this.options.device = 'cpu';
        this.generator = await pipeline('text-generation', this.options.modelId, {
          device: 'cpu',
          dtype: this.options.dtype,
        });
      } else {
        throw error;
      }
    }
  }

  async generate(prompt: string, maxNewTokens: number = 256): Promise<string> {
    await this.initialize();

    const output = await this.generator(prompt, {
      max_new_tokens: maxNewTokens,
      do_sample: false, // Deterministic for enrichment
      return_full_text: false,
    });

    return output[0].generated_text.trim();
  }

  getStatus(): Record<string, any> {
    return {
      initialized: !!this.generator,
      device: this.options.device,
      dtype: this.options.dtype,
      model: this.options.modelId
    };
  }
}
