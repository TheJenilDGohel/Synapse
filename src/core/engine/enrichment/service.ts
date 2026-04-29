import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface EnrichmentServiceOptions {
  device?: 'webgpu' | 'cpu';
  modelId?: string;
  cacheDir?: string;
}

export class EnrichmentService {
  private worker: Worker | null = null;
  private options: EnrichmentServiceOptions;
  private pending = new Map<string, (result: any) => void>();

  constructor(options: EnrichmentServiceOptions = {}) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    if (this.worker) return;

    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'worker.js');
      this.worker = new Worker(workerPath, {
        workerData: {
          device: this.options.device || 'webgpu',
          dtype: 'q4',
          modelId: this.options.modelId,
          cacheDir: this.options.cacheDir
        }
      });

      this.worker.on('message', (message) => {
        if (message.type === 'ready') {
          resolve();
        } else if (message.type === 'enrich_result') {
          const callback = this.pending.get(message.payload.id);
          if (callback) {
            callback(message.payload.metadata);
            this.pending.delete(message.payload.id);
          }
        } else if (message.type === 'enrich_error') {
          const callback = this.pending.get(message.payload.id);
          if (callback) {
            callback(new Error(message.payload.error));
            this.pending.delete(message.payload.id);
          }
        }
      });

      this.worker.on('error', reject);
    });
  }

  async enrich(id: string, code: string): Promise<any> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.pending.set(id, (result) => {
        if (result instanceof Error) reject(result);
        else resolve(result);
      });

      this.worker?.postMessage({
        type: 'enrich',
        payload: { id, code }
      });
    });
  }

  getStatus(): Record<string, any> {
    return {
      active: !!this.worker,
      pending_tasks: this.pending.size,
      device: this.options.device
    };
  }
}
